import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { slugify } from '@cloudpress/shared';

export async function handleAdminTags(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  if (method === 'GET' && !id) {
    const rows = await env.DB.prepare('SELECT id, name, slug, created_at FROM tags ORDER BY name').all();
    return jsonResponse({ success: true, data: rows.results || [] });
  }
  if (method === 'POST' && !id) {
    const body = await request.json() as { name: string; slug?: string };
    if (!body.name) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그 이름은 필수입니다.' } }, 400);
    const tagId = `tag_${crypto.randomUUID()}`;
    const slug = body.slug || slugify(body.name);
    await env.DB.prepare('INSERT INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)').bind(tagId, body.name, slug, Math.floor(Date.now() / 1000)).run();
    return jsonResponse({ success: true, data: { id: tagId, slug } }, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json() as { name?: string; slug?: string };
    const result = await env.DB.prepare('UPDATE tags SET name = COALESCE(?, name), slug = COALESCE(?, slug) WHERE id = ?').bind(body.name ?? null, body.slug ?? null, id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '태그를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM post_tags WHERE tag_id = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '태그를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
