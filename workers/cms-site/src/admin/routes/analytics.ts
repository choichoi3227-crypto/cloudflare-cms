import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminAnalytics(request: Request, env: Env, method = request.method, action?: string): Promise<Response> {
  if (method !== 'GET') return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 요청만 지원합니다.' } }, 405);
  if (action === 'top-search' || new URL(request.url).pathname.endsWith('/top-search')) {
    const rows = await env.DB.prepare('SELECT keyword, SUM(count) as total FROM search_logs GROUP BY keyword ORDER BY total DESC LIMIT 20').all();
    return jsonResponse({ success: true, data: rows.results || [] });
  }
  const rows = await env.DB.prepare('SELECT date, pageviews, visitors FROM analytics_daily ORDER BY date DESC LIMIT 30').all();
  return jsonResponse({ success: true, data: rows.results || [] });
}
