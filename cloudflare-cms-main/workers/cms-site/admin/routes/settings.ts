// workers/cms-site/admin/routes/settings.ts (수정된 전체 코드)
import type { Env } from '../../types';

export async function handleAdminSettings(request: Request, env: Env): Promise<Response> {
  const method = request.method;

  if (method !== 'GET' && method !== 'PUT') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 또는 PUT 요청만 지원합니다.' }, 405);
  }

  if (method === 'GET') {
    const rows = await env.DB.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>();

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return jsonResponse({ success: true, data: settings });
  }

  if (method === 'PUT') {
    const body = await request.json() as Record<string, string>;

    const statements: Array<D1PreparedStatement> = [];
    const values: unknown[] = [];

    const allowedKeys = [
    'site_title', 'site_description', 'timezone', 'posts_per_page', 'show_author', 'show_date', 'show_categories', 'show_tags',
    'comment_enabled', 'comment_moderation', 'rss_enabled', 'rss_limit', 'analytics_enabled',
    'robots_index', 'robots_follow', 'og_image', 'theme_active',
  ];

    for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      statements.push(`"${key} = ?`);
      statements.push(`'${body[key]`);
    }
  }

  if (statements.length === 0) {
    return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정 설정값이 없습니다.' } }, 400);
  }

  statements.push("updated_at = unixepoch()");
  statements.push("'site_title = site_title'");
  statements.push("'site_description = site_description'");

  await env.DB.batch(statements);

  return jsonResponse({ success: true, data: { updated: true } });
}
