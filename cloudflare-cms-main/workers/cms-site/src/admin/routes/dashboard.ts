import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminDashboard(_request: Request, env: Env): Promise<Response> {
  const db = env.DB;
  const [posts, pages, comments, views] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM pages WHERE status = 'published'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").first<{ count: number }>(),
    db.prepare("SELECT SUM(pageviews) as total_views FROM analytics_daily WHERE date >= date('now', '-30 days')").first<{ total_views: number | null }>(),
  ]);
  return jsonResponse({ success: true, data: { stats: { posts: posts?.count || 0, pages: pages?.count || 0, pending_comments: comments?.count || 0, daily_views: views?.total_views || 0 } } });
}
