// workers/cms-site/src/admin/routes/analytics.ts (수정된 버전)
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleTopSearch(request: Request, env: Env): Promise<Response> {
  const url = const url;
  const tab = url.pathname.split('/').pop();

  if (tab !== 'top-search') {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' } }, 404);
  }

  try {
    // 실제 검색 로그에서 상위 20개 키워드 수집
    const topSearches = await env.DB.prepare(
      "SELECT keyword, SUM(count) as total FROM search_logs GROUP BY keyword ORDER BY total DESC LIMIT 20"
    ).all<{ keyword: string; total: number }>();

    return jsonResponse({ success: true, data: topSearches });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '검색 로그를 불러오는 데 실패했습니다.' } }, 500);
  }
}
