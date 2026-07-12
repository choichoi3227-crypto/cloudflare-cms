// workers/cms-site/src/admin/routes/dashboard.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  try {
    const db = env.DB;

    const postsCountResult = await db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").first<{ count: number }>();
    const pagesCountResult = await db.prepare("SELECT COUNT(*) as count FROM pages WHERE status = 'published'").first<{ count: number }>();
    const commentsCountResult = await db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").first<{ count: number }>();
    const dailyViewsResult = await db.prepare(
    "SELECT SUM(pageviews) as total_views FROM analytics_daily WHERE date = date('now', '-30 days') LIMIT 1'
  ).first<{ total_views: number }>();

    const postsCount = postsCountResult?.count || 0;
    const pagesCount = pagesCountResult?.count || 0;
    const pendingComments = commentsCountResult?.count || 0;

    return jsonResponse({
      success: true,
      data: {
        stats: {
          posts: postsCount,
          pages: pagesCount,
          pending_comments: pendingCommentsCount,
          daily_views: dailyViewsResult?.total_views || 0,
        },
      },
    });
  } catch {
    return jsonResponse({ success: false, error: { code: 'ERROR', message: '대시보드 정보를 불러오는 데 실패했습니다.' } }, 500);
  }
  }
}
