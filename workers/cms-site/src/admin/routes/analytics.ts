// workers/cms-site/src/admin/routes/analytics.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminAnalytics(request: Request, env: Env): Promise<Response> {
  const method = request.method;

  if (method !== 'GET') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 요청만 지원합니다.' }, 405);
  }

  const url = new URL(request.url);
  const tab = url.pathname.split('/').pop();

  if (tab === 'pages') {
    return jsonResponse({ success: true, data: [] }); // TODO: 페이지별 분석 구현
  }

  if (tab === 'top-search') {
    return handleTopSearch(request, env, url);
  }

  const siteDomain = await env.DB.prepare('SELECT domain FROM sites WHERE id = ?').bind('default').first<{ domain: string }>();
  
  if (!siteDomain) {
    return jsonResponse({ success: false, error: { code: 'SITE_ERROR', message: '사이트 정보가 없습니다.' } }, 400);
  }

  const baseUrl = `https://${siteDomain.domain}`;

  // 일별 방문자 수
  const dailyStats = await env.DB.prepare(
    "SELECT date, pageviews, visitors, sessions FROM analytics_daily ORDER BY date DESC LIMIT 30"
  ).all<{ date: string; pageviews: number; visitors: number; sessions: number }>();

  const topSearches = await env.DB.prepare(
    "SELECT keyword, SUM(count) as total FROM search_logs GROUP BY keyword ORDER BY total DESC LIMIT 20"
  ).all<{ keyword: string; total: number }>();

  return jsonResponse({
    success: true,
    data: { daily: dailyStats, topSearches },
  });
}
