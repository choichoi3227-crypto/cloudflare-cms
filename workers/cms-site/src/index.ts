// workers/cms-site/src/index.ts
import type { Env } from './types';
import { handlePublicRoute } from './router/public';
import { handleAdminRoute } from './router/admin';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS & Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    try {
      // 관리자 라우팅 (경로 기반 정확한 분기)
      if (pathname.startsWith(`/${env.ADMIN_PATH || 'cp-admin'}`)) {
        return await handleAdminRoute(request, env, ctx, securityHeaders);
      }

      // 공개 API 라우팅 (/api/ 로 시작)
      if (pathname.startsWith('/api/')) {
        return await handlePublicRoute(request, env, securityHeaders);
      }

      // HTML 공개 페이지 라우팅 (SSR)
      return await handlePublicHtml(request, env, ctx, securityHeaders);
    } catch (err) {
      console.error('Worker Fatal Error:', err);
      return new Response(render500Html(), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
      });
    }
  },
};

// ==========================================
// 공개 HTML 페이지 렌더링 파이프라인
// ==========================================
async function handlePublicHtml(request: Request, env: Env, ctx: ExecutionContext, headers: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const db = env.DB;
  const cache = env.KV;

  // 1. 캐시 조회 (KV)
  const cacheKey = `html:${pathname}`;
  const cachedHtml = await cache.get(cacheKey);
  if (cachedHtml) {
    return new Response(cachedHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers },
    });
  }

  // 2. 사이트 설정 로드
  const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind('default').first<{ name: string; domain: string; description: string; language: string }>();
  const siteName = site?.name || 'CloudPress Site';
  const siteDomain = site?.domain || 'example.com';
  const baseUrl = `https://${siteDomain}`;

  let html = '';

  if (pathname === '/' || pathname === '') {
    html = await renderHome(db, cache as any, siteName, baseUrl, url);
  } else if (pathname.startsWith('/post/')) {
    const slug = pathname.replace('/post/', '').replace(/\/$/, '');
    html = await renderPost(db, cache as any, slug, siteName, baseUrl);
  } else if (pathname.startsWith('/page/')) {
    const slug = pathname.replace('/page/', '').replace(/\/$/, '');
    html = await renderPage(db, slug, siteName, baseUrl);
  } else if (pathname.startsWith('/category/')) {
    const slug = pathname.replace('/category/', '').replace(/\/$/, '');
    html = await renderCategory(db, slug, siteName, baseUrl, url);
  } else if (pathname.startsWith('/tag/')) {
    const slug = pathname.replace('/tag/', '').replace(/\/$/, '');
    html = await renderTag(db, slug, siteName, baseUrl, url);
  } else if (pathname === '/search') {
    html = await renderSearch(db, url, siteName, baseUrl);
  } else if (pathname === '/categories') {
    html = await renderCategories(db, siteName, baseUrl);
  } else if (pathname === '/rss.xml') {
    return await renderRss(db, siteName, baseUrl, headers);
  } else if (pathname === '/sitemap.xml') {
    return await renderSitemap(db, siteName, baseUrl, headers);
  } else if (pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /${env.ADMIN_PATH || 'cp-admin'}/\n\nSitemap: ${baseUrl}/sitemap.xml`, {
      headers: { 'Content-Type': 'text/plain', ...headers },
    });
  } else {
    // 리디렉션 확인
    const redirect = await db.prepare('SELECT target, status_code FROM redirects WHERE source = ?').bind(pathname).first<{ target: string; status_code: number }>();
    if (redirect) {
      return new Response(null, { status: redirect.status_code, headers: { Location: redirect.target } });
    }
    html = render404Html(siteName);
  }

  // 3. 캐시 저장 (동적 페이지는 5분, 정적 페이지는 1시간)
  const isStatic = pathname === '/' || pathname === '/categories';
  ctx.waitUntil(cache.put(cacheKey, html, { expirationTtl: isStatic ? 3600 : 300 }));

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers },
  });
}

// ==========================================
// 개별 페이지 렌더러 (D1 -> HTML 파이프라인)
// ==========================================
import { buildHtmlDocument, escapeHtml, getSeoHead, buildSchemaScripts } from './rendering/html-engine';

async function renderHome(db: D1Database, cache: KVNamespace, siteName: string, baseUrl: string, url: URL): Promise<string> {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const perPage = 10;
  const offset = (page - 1) * perPage;

  const countResult = await db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").first<{ count: number }>();
  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / perPage);

  const { results: posts } = await db.prepare(
    "SELECT id, title, slug, excerpt, featured_image, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT ? OFFSET ?"
  ).bind(perPage, offset).all<{ id: string; title: string; slug: string; excerpt: string; featured_image: string | null; published_at: number | null }>();

  const postListHtml = posts.length > 0
    ? posts.map(p => `
      <article class="post-card">
        ${p.featured_image ? `<img class="post-card-image" src="${p.featured_image}" alt="${escapeHtml(p.title)}" loading="lazy" />` : ''}
        <div class="post-card-content">
          <time>${formatDate(p.published_at)}</time>
          <h2><a href="/post/${p.slug}">${escapeHtml(p.title)}</a></h2>
          ${p.excerpt ? `<p>${escapeHtml(p.excerpt.substring(0, 150))}</p>` : ''}
        </div>
      </article>
    `).join('')
    : '<p class="empty-state">아직 게시글이 없습니다.</p>';

  const paginationHtml = totalPages > 1 ? renderPagination(page, totalPages, '') : '';

  const body = `
    <main class="container">
      <section class="post-list">${postListHtml}</section>
      ${paginationHtml}
    </main>`;

  const seoHead = getSeoHead({
    title: siteName,
    description: `${siteName}의 첫 페이지입니다.`,
    url: baseUrl,
    type: 'website',
  });

  return buildHtmlDocument(seoHead, siteName, body, baseUrl);
}

async function renderPost(db: D1Database, cache: KVNamespace, slug: string, siteName: string, baseUrl: string): Promise<string> {
  const post = await db.prepare(
    "SELECT * FROM posts WHERE slug = ? AND status = 'published'"
  ).bind(slug).first<{
    id: string; title: string; slug: string; content: string; content_html: string; featured_image: string | null; published_at: number | null; excerpt: string;
  }>();

  if (!post) return render404Html(siteName);

  // 카테고리/태그 조회
  const { results: cats } = await db.prepare(
    "SELECT c.name, c.slug FROM categories c INNER JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?"
  ).bind(post.id).all<{ name: string; slug: string }>();
  
  const { results: tags } = await db.prepare(
    "SELECT t.name, t.slug FROM tags t INNER JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?"
  ).bind(post.id).all<{ name: string; slug: string }>();

  // SEO & Schema
  const seoMeta = await db.prepare("SELECT * FROM seo_meta WHERE object_type = 'post' AND object_id = ?").bind(post.id).first<any>();
  const { results: schemas } = await db.prepare("SELECT schema_json, schema_type FROM schemas WHERE object_type = 'post' AND object_id = ?").bind(post.id).all<{ schema_json: string; schema_type: string }>();

  const seoHead = getSeoHead({
    title: seoMeta?.meta_title || post.title,
    description: seoMeta?.meta_description || post.excerpt || '',
    url: `${baseUrl}/post/${post.slug}`,
    image: post.featured_image || undefined,
    type: 'article',
    publishedTime: post.published_at ? new Date(post.published_at * 1000).toISOString() : undefined,
  });

  const schemaScripts = buildSchemaScripts(schemas.map(s => ({ type: s.schema_type, json: s.schema_json })));

  const categoriesHtml = cats.length > 0 
    ? `<div class="post-meta-categories">${cats.map(c => `<a href="/category/${c.slug}">${escapeHtml(c.name)}</a>`).join(', ')}</div>` 
    : '';
  
  const tagsHtml = tags.length > 0
    ? `<div class="post-meta-tags">${tags.map(t => `<a href="/tag/${t.slug}">#${escapeHtml(t.name)}</a>`).join(' ')}</div>`
    : '';

  const body = `
    <main class="container">
      <article class="post-full">
        <header class="post-header">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="post-meta">
            <time>${formatDate(post.published_at)}</time>
            ${categoriesHtml}
          </div>
        </header>
        ${post.featured_image ? `<img class="post-featured-image" src="${post.featured_image}" alt="${escapeHtml(post.title)}" />` : ''}
        <div class="post-content">${post.content_html || post.content}</div>
        ${tagsHtml}
      </article>
    </main>`;

  // 조회수 증가 (비동기)
  // await ctx.waitUntil(incrementPageview(db, slug));

  return buildHtmlDocument(seoHead, post.title, body, baseUrl, schemaScripts);
}

async function renderPage(db: D1Database, slug: string, siteName: string, baseUrl: string): Promise<string> {
  const page = await db.prepare("SELECT * FROM pages WHERE slug = ? AND status = 'published'").bind(slug).first<{
    id: string; title: string; content: string; content_html: string; slug: string;
  }>();

  if (!page) return render404Html(siteName);

  const seoMeta = await db.prepare("SELECT * FROM seo_meta WHERE object_type = 'page' AND object_id = ?").bind(page.id).first<any>();
  
  const seoHead = getSeoHead({
    title: seoMeta?.meta_title || page.title,
    description: seoMeta?.meta_description || '',
    url: `${baseUrl}/page/${page.slug}`,
    type: 'website',
  });

  const body = `<main class="container"><article class="post-full"><h1>${escapeHtml(page.title)}</h1><div class="post-content">${page.content_html || page.content}</div></article></main>`;
  return buildHtmlDocument(seoHead, page.title, body, baseUrl);
}

async function renderCategory(db: D1Database, slug: string, siteName: string, baseUrl: string, url: URL): Promise<string> {
  const cat = await db.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first<{ name: string; slug: string; description: string | null }>();
  if (!cat) return render404Html(siteName);

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const offset = (page - 1) * 10;
  const countResult = await db.prepare(
    "SELECT COUNT(*) as count FROM posts p INNER JOIN post_categories pc ON p.id = pc.post_id WHERE pc.category_id = (SELECT id FROM categories WHERE slug = ?) AND p.status = 'published'"
  ).bind(slug).first<{ count: number }>();
  const total = countResult?.count || 0;

  const { results: posts } = await db.prepare(
    "SELECT id, title, slug, excerpt, published_at FROM posts p INNER JOIN post_categories pc ON p.id = pc.post_id WHERE pc.category_id = (SELECT id FROM categories WHERE slug = ?) AND p.status = 'published' ORDER BY p.published_at DESC LIMIT ? OFFSET ?"
  ).bind(slug, 10, offset).all<{ id: string; title: string; slug: string; excerpt: string; published_at: number | null }>();

  const seoHead = getSeoHead({ title: `${cat.name} - ${siteName}`, description: cat.description || '', url: `${baseUrl}/category/${slug}`, type: 'website' });
  const body = `<main class="container"><h1>${escapeHtml(cat.name)}</h1><section class="post-list">${posts.map(p => `<article class="post-card"><div class="post-card-content"><time>${formatDate(p.published_at)}</time><h2><a href="/post/${p.slug}">${escapeHtml(p.title)}</a></h2></div></article>`).join('') || '<p class="empty-state">게시글이 없습니다.</p>'}</section>${renderPagination(page, Math.ceil(total / 10), `/category/${slug}`)}</main>`;
  return buildHtmlDocument(seoHead, `${cat.name} - ${siteName}`, body, baseUrl);
}

async function renderTag(db: D1Database, slug: string, siteName: string, baseUrl: string, url: URL): Promise<string> {
  const tag = await db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).first<{ name: string; slug: string }>();
  if (!tag) return render404Html(siteName);

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const offset = (page - 1) * 10;
  const countResult = await db.prepare(
    "SELECT COUNT(*) as count FROM posts p INNER JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = (SELECT id FROM tags WHERE slug = ?) AND p.status = 'published'"
  ).bind(slug).first<{ count: number }>();
  const total = countResult?.count || 0;

  const { results: posts } = await db.prepare(
    "SELECT id, title, slug, excerpt, published_at FROM posts p INNER JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = (SELECT id FROM tags WHERE slug = ?) AND p.status = 'published' ORDER BY p.published_at DESC LIMIT ? OFFSET ?"
  ).bind(slug, 10, offset).all<{ id: string; title: string; slug: string; excerpt: string; published_at: number | null }>();

  const seoHead = getSeoHead({ title: `#${tag.name} - ${siteName}`, description: '', url: `${baseUrl}/tag/${slug}`, robots: 'noindex, follow', type: 'website' });
  const body = `<main class="container"><h1>#${escapeHtml(tag.name)}</h1><section class="post-list">${posts.map(p => `<article class="post-card"><div class="post-card-content"><time>${formatDate(p.published_at)}</time><h2><a href="/post/${p.slug}">${escapeHtml(p.title)}</a></h2></div></article>`).join('') || '<p class="empty-state">게시글이 없습니다.</p>'}</section>${renderPagination(page, Math.ceil(total / 10), `/tag/${slug}`)}</main>`;
  return buildHtmlDocument(seoHead, `#${tag.name} - ${siteName}`, body, baseUrl);
}

async function renderSearch(db: D1Database, url: URL, siteName: string, baseUrl: string): Promise<string> {
  const q = (url.searchParams.get('q') || '').trim().substring(0, 100);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const offset = (page - 1) * 10;
  const likePattern = `%${q}%`;

  if (!q) {
    const seoHead = getSeoHead({ title: `검색 - ${siteName}`, description: '', url: `${baseUrl}/search`, robots: 'noindex, follow', type: 'website' });
    const body = `<main class="container"><h1>검색</h1><form action="/search" method="GET" class="search-form"><input type="text" name="q" placeholder="검색어를 입력하세요" value="${escapeHtml(q)}" /><button type="submit">검색</button></form></main>`;
    return buildHtmlDocument(seoHead, `검색 - ${siteName}`, body, baseUrl);
  }

  const countResult = await db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)").bind(likePattern, likePattern, likePattern).first<{ count: number }>();
  const total = countResult?.count || 0;

  const { results: posts } = await db.prepare(
    "SELECT id, title, slug, excerpt, published_at FROM posts WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?) ORDER BY published_at DESC LIMIT ? OFFSET ?"
  ).bind(likePattern, likePattern, likePattern, 10, offset).all<{ id: string; title: string; slug: string; excerpt: string; published_at: number | null }>();

  // 검색 로그 기록
  await db.prepare("INSERT INTO search_logs (id, keyword, count, created_at) VALUES (lower(hex(randomblob(8))), ?, 1, unixepoch()) ON CONFLICT(keyword) DO UPDATE SET count = count + 1").bind(q).run();

  const seoHead = getSeoHead({ title: `"${q}" 검색 결과 - ${siteName}`, description: '', url: `${baseUrl}/search?q=${encodeURIComponent(q)}`, robots: 'noindex, follow', type: 'website' });
  const body = `<main class="container"><h1>"${escapeHtml(q)}" 검색 결과 (${total}건)</h1><section class="post-list">${posts.map(p => `<article class="post-card"><div class="post-card-content"><time>${formatDate(p.published_at)}</time><h2><a href="/post/${p.slug}">${escapeHtml(p.title)}</a></h2><p>${escapeHtml((p.excerpt || '').substring(0, 150))}</p></div></article>`).join('') || '<p class="empty-state">검색 결과가 없습니다.</p>'}</section>${renderPagination(page, Math.ceil(total / 10), `/search?q=${encodeURIComponent(q)}`)}</main>`;
  return buildHtmlDocument(seoHead, `검색 - ${siteName}`, body, baseUrl);
}

async function renderCategories(db: D1Database, siteName: string, baseUrl: string): Promise<string> {
  const { results: cats } = await db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all<{ name: string; slug: string; description: string | null }>();
  const seoHead = getSeoHead({ title: `카테고리 - ${siteName}`, description: '', url: `${baseUrl}/categories`, type: 'website' });
  const body = `<main class="container"><h1>카테고리</h1><ul class="category-list">${cats.map(c => `<li><a href="/category/${c.slug}">${escapeHtml(c.name)}</a>${c.description ? `<p>${escapeHtml(c.description)}</p>` : ''}</li>`).join('') || '<p class="empty-state">카테고리가 없습니다.</p>'}</ul></main>`;
  return buildHtmlDocument(seoHead, `카테고리 - ${siteName}`, body, baseUrl);
}

async function renderRss(db: D1Database, siteName: string, baseUrl: string, headers: Record<string, string>): Promise<Response> {
  const { results: posts } = await db.prepare(
    "SELECT title, slug, excerpt, content, featured_image, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 20"
  ).all<{ title: string; slug: string; excerpt: string; content: string; featured_image: string | null; published_at: number | null }>();

  const items = posts.map(p => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${baseUrl}/post/${p.slug}</link>
      <guid isPermaLink="true">${baseUrl}/post/${p.slug}</guid>
      <description><![CDATA[${p.excerpt || p.content.substring(0, 200)}]]></description>
      ${p.featured_image ? `<enclosure url="${p.featured_image}" length="0" type="image/jpeg" />` : ''}
      <pubDate>${p.published_at ? new Date(p.published_at * 1000).toUTCString() : ''}</pubDate>
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
}

async function renderSitemap(db: D1Database, siteName: string, baseUrl: string, headers: Record<string, string>): Promise<Response> {
  const { results: posts } = await db.prepare("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC").all<{ slug: string; updated_at: number }>();
  const { results: pages } = await db.prepare("SELECT slug, updated_at FROM pages WHERE status = 'published' ORDER BY updated_at DESC").all<{ slug: string; updated_at: number }>();

  const urls = [
    `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...posts.map(p => `  <url><loc>${baseUrl}/post/${p.slug}</loc><lastmod>${new Date(p.updated_at * 1000).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
    ...pages.map(p => `  <url><loc>${baseUrl}/page/${p.slug}</loc><lastmod>${new Date(p.updated_at * 1000).toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 ${urls}
</urlset>`;

  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', ...headers } });
}

function renderPagination(page: number, totalPages: number, basePath: string): string {
  if (totalPages <= 1) return '';
  const pages: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === page) {
      pages.push(`<span class="current">${i}</span>`);
    } else {
      const sep = basePath.includes('?') ? '&' : '?';
      pages.push(`<a href="${basePath}${sep}page=${i}">${i}</a>`);
    }
  }
  const prev = page > 1 ? `<a href="${basePath}${basePath.includes('?') ? '&' : '?'}page=${page - 1}" class="prev">이전</a>` : '';
  const next = page < totalPages ? `<a href="${basePath}${basePath.includes('?') ? '&' : '?'}page=${page + 1}" class="next">다음</a>` : '';
  return `<nav class="pagination">${prev}${pages.join('')}${next}</nav>`;
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function render404Html(siteName: string): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>404 - 페이지를 찾을 수 없습니다</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#111827}h1{font-size:4rem;margin:0;color:#f97316}p{color:#6b7280;margin:16px 0 32px}a{display:inline-block;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none}a:hover{background:#374151}</style></head><body><div><h1>404</h1><p>요청하신 페이지를 찾을 수 없습니다.</p><a href="/">홈으로 돌아가기</a></div></body></html>`;
}

function render500Html(): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>500 - 서버 오류</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#111827}h1{font-size:4rem;margin:0;color:#dc2626}p{color:#6b7280;margin:16px 0 32px}a{display:inline-block;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none}</style></head><body><div><h1>500</h1><p>일시적인 서버 오류가 발생했습니다.</p><a href="/">홈으로 돌아가기</a></div></body></html>`;
}
