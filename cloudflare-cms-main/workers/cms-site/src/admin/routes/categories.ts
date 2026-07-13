import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { slugify } from '@cloudpress/shared';

export async function handleAdminCategories(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  if (method === 'GET' && !id) {
    const rows = await env.DB.prepare('SELECT id, name, slug, description, parent_id, sort_order, created_at FROM categories ORDER BY sort_order, name').all();
    return jsonResponse({ success: true, data: rows.results || [] });
  }
  if (method === 'POST' && !id) {
    const body = await request.json() as { name: string; slug?: string; description?: string; parent_id?: string; sort_order?: number };
    if (!body.name) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '카테고리 이름은 필수입니다.' } }, 400);
    const catId = `cat_${crypto.randomUUID()}`; const slug = body.slug || slugify(body.name);
    await env.DB.prepare('INSERT INTO categories (id, name, slug, description, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(catId, body.name, slug, body.description || null, body.parent_id || null, body.sort_order || 0, Math.floor(Date.now() / 1000)).run();
    return jsonResponse({ success: true, data: { id: catId, slug } }, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = []; const values: unknown[] = [];
    for (const key of ['name','slug','description','parent_id','sort_order']) if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    if (!fields.length) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);
    values.push(id);
    const result = await env.DB.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM post_categories WHERE category_id = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
