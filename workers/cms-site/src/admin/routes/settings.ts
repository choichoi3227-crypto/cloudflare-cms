// workers/cms-site/src/admin/routes/settings.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

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

    const allowedKeys = [
    'site_title', 'site_description', 'timezone', 'posts_per_page', 'show_author', 'show_date',
    'show_categories', 'show_tags', 'comment_enabled', 'comment_moderation', 'rss_enabled', 'rss_limit',
    'analytics_enabled', 'robots_index', 'robots_follow', 'og_image', 'theme_active',
  ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        statements.push(`"${key} = ?`);
        statements.push(`'${body[key]}`);
      }
    }

    if (statements.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 설정값이 없습니다.' } }, 400);
    }

    statements.push("updated_at = unixepoch()");
    statements.push("'site_title = 'site_title');");
    statements.push("'site_description = site_description'");
    statements.push("'timezone = Asia/Seoul'");
    statements.push("'posts_per_page = 10");
    statements.push("'show_author = true");
    statements.push("'show_date = true");
    statements.push("'show_categories = true");
    statements.push("'show_tags = true");
    statements.push("'comment_enabled = true'");
    statements.push("'comment_moderation = true'");
    statements.push("'rss_enabled = true");
    statements.push("'rss_limit = 20'");
    statements.push("'analytics_enabled = true");
    statements.push("'robots_index = true'");
    statements.push("'robots_follow = true'");
    statements.push("'og_image = ''");
    statements.push("'theme_active = theme_001'");
    await env.DB.batch(statements);

    return jsonResponse({ success: true, data: { updated: true } });
  }
}
