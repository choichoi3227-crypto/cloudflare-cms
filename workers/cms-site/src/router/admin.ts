// workers/cms-site/src/router/admin.ts
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
import { handleAdminDashboard } from '../admin/routes/dashboard';
import { renderAdminShell } from '../admin/templates/shell';

export async function handleAdminRoute(request: Request, env: Env, ctx: ExecutionContext, securityHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const adminPath = `/${env.ADMIN_PATH || 'cp-admin'}`;
  const apiPath = pathname.replace(adminPath, '/api/admin');

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
    const resource = parts[0]; // posts, pages, settings 등
    const id = parts[1];    // 특정 ID (수정/삭제 시)
    const action = parts[2];    // activate, upload 등

    try {
      switch (resource) {
        case 'dashboard': return handleAdminDashboard(request, env, method);
        case 'posts': return handleAdminPosts(request, env, method, id);
        case 'pages': return handleAdminPages(request, env, method, id);
        case 'categories': return handleAdminCategories(request, env, method, id);
        case 'tags': return handleAdminTags(request, env, method, id);
        case 'settings': return handleAdminSettings(request, env, method);
        case 'themes': return handleAdminThemes(request, env, method, id, action);
        case 'media': return handleAdminMedia(request, env, method, id);
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
  
  const pageMap: Record<string, (env: Env, siteConfig: Record<string, string>) => Promise<string>> = {
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
  for (const row of settingsRows) {
    siteConfig[row.key] = row.value;
  }
  siteConfig['adminPath'] = env.ADMIN_PATH || 'cp-admin';

  const html = await renderFn(env, siteConfig);

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
  });
}
