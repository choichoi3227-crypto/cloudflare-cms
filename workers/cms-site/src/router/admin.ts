// workers/cms-site/src/router/admin.ts
import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from '../types';
import { jsonResponse } from '../utils/response';
import { handleAdminPosts } from '../admin/routes/posts';
import { handleAdminPages } from '../admin/routes/pages';
import { handleAdminCategories } from '../admin/routes/categories';
import { handleAdminTags } from '../admin/routes/tags';
import { handleAdminSettings } from '../admin/routes/settings';
import { handleAdminThemes } from '../admin/routes/themes';
import { handleAdminMedia } from '../admin/routes/media';
import { handleAdminMenus } from '../admin/routes/menus';
import { handleAdminSeo } from '../admin/routes/seo';
import { handleAdminAnalytics } from '../admin/routes/analytics';
import { handleAdminPlugins } from '../admin/routes/plugins';
import { handleAdminMarketplace } from '../admin/routes/marketplace';
import { handleAdminDashboard } from '../admin/routes/dashboard';
import { renderAdminShell } from '../admin/templates/shell';

export async function handleAdminRoute(request: Request, env: Env, ctx: ExecutionContext, securityHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const adminPath = `/${env.ADMIN_PATH || 'cp-admin'}`;
  const apiPath = pathname.startsWith('/api/admin/')
    ? pathname.replace('/api/admin/', '')
    : pathname.replace(`${adminPath}/api/`, '');

  // 인증 검증
  const token = request.headers.get('X-Admin-Token');
  if (env.ENVIRONMENT !== 'development' && token !== env.ADMIN_SECRET) {
    return new Response(renderAdminLogin(env.ADMIN_PATH || 'cp-admin'), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
    });
  }

  // API 라우팅
  if (pathname.startsWith('/api/admin/')) {
    const parts = apiPath.split('/').filter(Boolean);
    const resource = parts[0];
    const id = parts[1];
    const action = parts[2];

    try {
      switch (resource) {
        case 'dashboard': return handleAdminDashboard(request, env);
        case 'posts': return handleAdminPosts(request, env, id);
        case 'pages': return handleAdminPages(request, env, id);
        case 'categories': return handleAdminCategories(request, env, id);
        case 'tags': return handleAdminTags(request, env, id);
        case 'settings': return handleAdminSettings(request, env, method);
        case 'themes': return handleAdminThemes(request, env, method, id, action);
        case 'plugins': return handleAdminPlugins(request, env, method, id, action);
        case 'marketplace': return handleAdminMarketplace(request, env, method);
        case 'media': return handleAdminMedia(request, env, id);
        case 'menus': return handleAdminMenus(request, env, method, id);
        case 'seo': return handleAdminSeo(request, env, method, id, action);
        case 'analytics': return handleAdminAnalytics(request, env, method, action);
        default: return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'API 엔드포인트를 찾을 수 없습니다.' } }, 404);
      }
    } catch (err) {
      console.error('Admin API Error:', err);
      return jsonResponse({ success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } }, 500);
    }
  }

  // HTML 페이지 라우팅
  const pagePath = pathname.replace(adminPath + '/', '');
  
  const pageMap: Record<string, string> = {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'posts': 'posts',
    'posts/new': 'post-edit',
    'pages': 'pages',
    'pages/new': 'page-edit',
    'categories': 'categories',
    'tags': 'tags',
    'settings': 'settings',
    'themes': 'themes',
    'plugins': 'plugins',
    'marketplace': 'marketplace',
    'media': 'media',
    'menus': 'menus',
    'analytics': 'analytics',
    'seo': 'seo',
  };

  // 동적 라우팅 지원 (/posts/edit/123 형태)
  let resolvedPage = pagePath;
  if (pagePath.startsWith('posts/edit/') || pagePath.startsWith('pages/edit/')) {
    resolvedPage = pagePath.split('/')[0]; // posts 또는 pages
  }

  const renderFn = pageMap[resolvedPage] || pageMap[pagePath];
  if (!renderFn) {
    return new Response(renderAdminLogin(env.ADMIN_PATH || 'cp-admin'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
    });
  }

  // 사이트 설정 조회
  const settingsRows = await env.DB.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>();
  const siteConfig: Record<string, string> = {};
  for (const row of settingsRows.results || []) {
    siteConfig[row.key] = row.value;
  }
  siteConfig['adminPath'] = env.ADMIN_PATH || 'cp-admin';

  siteConfig.__pathname = renderFn;
  const html = await renderAdminShell(env, siteConfig);

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
  });
}


function renderAdminLogin(adminPath: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CloudPress Login</title></head><body><main style="font-family:system-ui;max-width:420px;margin:10vh auto"><h1>CloudPress Admin</h1><p>관리자 토큰이 필요합니다.</p><script>function save(){localStorage.setItem('cp_admin_token',document.getElementById('t').value);location.href='/${adminPath}/dashboard'}</script><input id="t" type="password" placeholder="Admin token" style="width:100%;padding:12px"><button onclick="save()" style="margin-top:12px;padding:12px 16px">로그인</button></main></body></html>`;
}
