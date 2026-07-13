import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminSeo(request: Request, env: Env, method = request.method, objectType?: string, objectId?: string): Promise<Response> {
  if (!objectType || !objectId) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'objectType과 objectId가 필요합니다.' } }, 400);
  if (method === 'GET') {
    const meta = await env.DB.prepare('SELECT * FROM seo_meta WHERE object_type = ? AND object_id = ?').bind(objectType, objectId).first();
    return jsonResponse({ success: true, data: meta || null });
  }
  if (method === 'PUT' || method === 'POST') {
    const body = await request.json() as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`INSERT INTO seo_meta (id, object_type, object_id, meta_title, meta_description, canonical_url, robots, og_title, og_description, og_image, twitter_card, focus_keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(object_type, object_id) DO UPDATE SET meta_title = excluded.meta_title, meta_description = excluded.meta_description, canonical_url = excluded.canonical_url, robots = excluded.robots, og_title = excluded.og_title, og_description = excluded.og_description, og_image = excluded.og_image, twitter_card = excluded.twitter_card, focus_keyword = excluded.focus_keyword, updated_at = excluded.updated_at`)
      .bind(`seo_${crypto.randomUUID()}`, objectType, objectId, body.meta_title || null, body.meta_description || null, body.canonical_url || null, body.robots || 'index, follow', body.og_title || null, body.og_description || null, body.og_image || null, body.twitter_card || 'summary_large_image', body.focus_keyword || null, now, now).run();
    return jsonResponse({ success: true, data: { updated: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
