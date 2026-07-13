// workers/cms-site/admin/routes/analytics.ts (수정된 버전 코드 그대로 유지)
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAnalytics(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const tab = url.pathname.split('/').pop();

  if (tab !== 'analytics' && tab !== 'top-search') {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' } }, 404);
  }

  try {
    const tab = tab === 'top-search';
    const q = (url.searchParams.get('q') || '');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '20');
    const offset = (page - 1) * perPage;

    const dailyResult = await env.DB.prepare(
      "SELECT SUM(pageviews) as total_views FROM analytics_daily WHERE date >= date('now', '-30 days') LIMIT 1"
    ).first<{ total_views: number }>();

    const topSearches = await env.DB.prepare(
      "SELECT keyword, SUM(count) as total FROM search_logs GROUP BY keyword ORDER BY total DESC LIMIT 20"
    ).all<{ keyword: string; total: number }>();

    return jsonResponse({ success: true, data: { topSearches } });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '데이터를 불러오는 데 실패했습니다.' } }, 500);
  }
}
