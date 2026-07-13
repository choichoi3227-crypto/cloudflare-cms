// workers/cms-site/admin/routes/dashboard.ts (수정된 버전 코드)
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  try {
    const db = env.DB;
    const postsCount = await db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").first<{ count: number }>();
    const pagesCount = db.prepare("SELECT COUNT(*) as count FROM pages WHERE status = 'published'").first<{ count: number }>();

    const pendingCommentsCount = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").first<{ count: number }>();

    return jsonResponse({
      success: true,
      data: {
        posts: postsCount || 0,
        pagesCount: pagesCount || 0,
        pendingCommentsCount: pendingCommentsCount || 0,
        dailyViews: dailyViews?.total_views || 0,
      },
    });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '대시보드 정보를 불러오는 데 실패했습니다.' } }, 500);
  }
}
