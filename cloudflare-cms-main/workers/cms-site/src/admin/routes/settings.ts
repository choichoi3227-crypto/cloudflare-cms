import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminSettings(request: Request, env: Env, method = request.method): Promise<Response> {
  if (method === 'GET') {
    const rows = await env.DB.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>();
    const settings: Record<string, string> = {};
    for (const row of rows.results || []) settings[row.key] = row.value;
    return jsonResponse({ success: true, data: settings });
  }
  if (method === 'PUT') {
    const body = await request.json() as Record<string, string>;
    const allowed = new Set(['site_title','site_description','timezone','posts_per_page','show_author','show_date','show_categories','show_tags','comment_enabled','comment_moderation','rss_enabled','rss_limit','analytics_enabled','robots_index','robots_follow','og_image','theme_active']);
    const statements: D1PreparedStatement[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (allowed.has(key)) statements.push(env.DB.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').bind(key, String(value)));
    }
    if (!statements.length) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 설정값이 없습니다.' } }, 400);
    await env.DB.batch(statements);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 또는 PUT 요청만 지원합니다.' } }, 405);
}
