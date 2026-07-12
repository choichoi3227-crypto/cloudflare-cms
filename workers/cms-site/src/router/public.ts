// workers/cms-site/src/router/public.ts
import type { Env } from '../types';
import { handlePublicHtml } from '../rendering/html-renderer';
import { jsonResponse } from '../utils/response';
import { escapeHtml } from '../utils/sanitize';

export async function handlePublicRoute(request: Request, env: Env, securityHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // RSS 피드
  if (pathname === '/rss.xml') {
    return handleRss(env, securityHeaders);
  }

  // Sitemap
  if (pathname === '/sitemap.xml') {
    return handleSitemap(env, securityHeaders);
  }

  // robots.txt
  if (pathname === '/robots.txt') {
    const siteDomain = await env.DB.prepare('SELECT domain FROM sites WHERE id = ?').bind('default').first<{ domain: string }>();
    const domain = siteDomain?.domain || 'example.com';
    return new Response(
      `User-agent: *\nAllow: /\nDisallow: /${env.ADMIN_PATH || 'cp-admin'}/\n\nSitemap: https://${domain}/sitemap.xml`,
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders } }
    );
  }

  // 공개 API (/api/...)
  if (pathname.startsWith('/api/')) {
    return handlePublicApi(request, env, securityHeaders);
  }

  // HTML 페이지 렌더링
  return handlePublicHtml(request, env, securityHeaders);
}

// ==========================================
// 공개 API (Blogger 데이터 기반)
// ==========================================
async function handlePublicApi(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET /api/posts
  if (pathname === '/api/posts') {
    return handleApiPosts(request, env);
  }

  // GET /api/posts/:slug
  if (pathname.startsWith('/api/posts/')) {
    const slug = pathname.replace('/api/posts/', '').replace(/\/$/, '');
    return handleApiPost(request, env, slug);
  }

  // GET /api/pages
  if (pathname === '/api/pages') {
    return handleApiPages(env);
  }

  // GET /api/categories
  if (pathname === '/api/categories') {
    return handleApiCategories(env);
  }

  // GET /api/tags
  if (pathname === '/api/tags') {
    return handleApiTags(env);
  }

  // GET /api/menu/:location
  if (pathname.startsWith('/api/menu/')) {
    const location = pathname.replace('/api/menu/', '');
    return handleApiMenu(env, location);
  }

  // GET /api/search
  if (pathname === '/api/search') {
    return handleApiSearch(request, env, url);
  }

  return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' } }, 404, { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleApiPosts(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = parseInt(url.searchParams.get('per_page') || '10');
  const offset = (page - 1) * perPage;

  try {
    const bloggerService = createBloggerService(env);
    const { posts, nextPageToken } = await bloggerService.fetchPosts(url.searchParams.get('pageToken'));

    const meta = {
      page,
      per_page: perPage,
      total: nextPageToken ? -1 : -1, // -1 means no next page
      has_next: !!nextPageToken,
      next_page_token: nextPageToken || '',
    };

    return jsonResponse({ success: true, data: posts, meta }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch (err) {
    console.error('Blogger fetch error:', err);
    return jsonResponse({ success: false, error: { code: 'BLOGGER_ERROR', message: 'Blogger 데이터를 불러오는 데 실패했습니다.' } }, 502, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

async function handleApiPost(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const bloggerService = createBloggerService(env);
    const post = await bloggerService.fetchPostByUrl(`${env.SITE_DOMAIN}/post/${slug}`);
    
    if (!post) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404, { headers: { 'Content-Type': 'application/json', ...headers } });
    }

    return jsonResponse({ success: true, data: post }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'BLOGGER_ERROR', message: '게시글을 불러오는 데 실패했습니다.' } }, 502, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

async function handleApiPages(env: Env): Promise<Response> {
  try {
    const bloggerService = createBloggerService(env);
    // Blogger pages are accessed via URL slug (e.g., /p/example-post-title.html)
    // Since Blogger doesn't have a native 'pages' concept like WordPress,
    // we return empty array.
    return jsonResponse({ success: true, data: [] }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '데이터를 불러오는 데 실패했습니다.' } }, 500, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

async function handleApiCategories(env: Env): Promise<Response> {
  try {
    const bloggerService = createBloggerService(env);
    // Blogger categories are labels.
    // We can extract them from all posts
    const { posts } = await bloggerService.fetchPosts();
    const labelSet = new Set<string>();
    for (const post of posts) {
      if (post.labels) {
        for (const label of post.labels) {
          labelSet.add(label);
        }
      }
    }

    const categories = Array.from(labelSet).map(label => ({ name: label, slug: slugify(label) }));
    return jsonResponse({ success: true, data: categories }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '카테고리를 불러오는 데 실패했습니다.' } }, 500, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

async function handleApiTags(env: Env): Promise<Response> {
  try {
    const bloggerService = createBloggerService(env);
    const { posts } = await bloggerService.fetchPosts();
    const tagSet = new Set<string>();
    for (const post of posts) {
      if (post.labels) {
        for (const label of post.labels) {
          tagSet.add(label);
        }
      }
    }

    const tags = Array.from(tagSet).map(tag => ({ name: tag, slug: slugify(tag) }));
    return jsonResponse({ success: true, data: tags }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '태그를 불러오는 데 실패했습니다.' } }, 500, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

async function handleApiMenu(env: Env, location: string): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT mi.* FROM menu_items mi INNER JOIN menus m ON mi.menu_id = m.id WHERE m.location = ? ORDER BY mi.sort_order'
  ).bind(location).all<{ label: string; url: string; sort_order: number }>();

  const menu = rows.map(item => ({ label: item.label, url: item.url }));
  return jsonResponse({ success: true, data: menu }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
}

async function handleApiSearch(request: Request, env: Env, url: URL): Promise<Response> {
  const q = url.searchParams.get('q') || '';
  if (!q) return jsonResponse({ success: true, data: [] }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });

  try {
    const bloggerService = createBloggerService(env);
    const { posts } = await bloggerService.fetchPosts();
    
    const qLower = q.toLowerCase();
    const results = posts.filter(post => 
      post.title.toLowerCase().includes(qLower) || 
      post.content.toLowerCase().includes(qLower)
    ).map(post => ({
      title: post.title,
      url: post.url,
      excerpt: (post.content || '').substring(0, 150),
      published: post.published,
      author: post.author?.displayName || 'Unknown',
    }));

    return jsonResponse({ success: true, data: results }, 200, { headers: { 'Content-Type': 'application/json', ...headers } });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '검색 중 오류가 발생했습니다.' } }, 500, { headers: { 'Content-Type': 'application/json', ...headers } });
  }
}

// ==========================================
// Blogger Service Factory
// ==========================================
import { BloggerService } from '../services/blogger.service';

function createBloggerService(env: Env): BloggerService {
  return new BloggerService(env.DB);
}

function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3131-\uD79A-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function handleRss(env: Env, headers: Record<string, string>): Promise<Response> {
  try {
    const site = await env.DB.prepare('SELECT name, domain FROM sites WHERE id = ?').bind('default').first<{ name: string; domain: string }>();
    const siteName = site?.name || 'CloudPress Site';
    const baseUrl = site?.domain ? `https://${site.domain}` : 'https://example.com';

    const bloggerService = createBloggerService(env);
    const { posts } = await bloggerService.fetchPosts();

    const items = posts.map(post => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${post.url}</link>
      <guid isPermaLink="true">${post.url}</guid>
      <description><![CDATA[${(post.content || '').substring(0, 200)}]]></description>
      ${post.author?.image ? `<enclosure url="${post.author.image.replace('http:', 'https://')}" length="0" type="image/jpeg" />` : ''}
      <pubDate>${post.published ? new Date(post.published).toUTCString() : ''}</pubDate>
    </item>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(siteName)}</title>
    <link>${baseUrl}</link>
    <description>${escapeHtml(siteName)}</description>
    <language>ko</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
 ${items}
  </channel>
</rss>`;

    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', ...headers } });
  } catch {
    return new Response('<error>RSS 생성 중 오류</error>', { status: 500, headers: { 'Content-Type': 'text/plain', ...headers } });
  }
}

async function handleSitemap(env: Env, headers: Record<string, string>): Promise<Response> {
  try {
    const site = await env.DB.prepare('SELECT domain FROM sites WHERE id = ?').bind('default').first<{ domain: string }>();
    const baseUrl = site?.domain ? `https://${site.domain}` : 'https://example.com';

    const bloggerService = createBloggerService(env);
    const { posts } = await bloggerService.fetchPosts();

    const urls = [
      `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...posts.map(post => `  <url><loc>${post.url}</loc><lastmod>${post.updated ? new Date(post.updated).toISOString().split('T')[0] : ''}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 ${urls}
</urlset>`;

    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', ...headers } });
  } catch {
    return new Response('<error>Sitemap 생성 중 오류</error>', { status: 500, headers: { 'Content-Type': 'text/plain', ...headers } });
  }
}
