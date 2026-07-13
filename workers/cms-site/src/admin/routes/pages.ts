import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { slugify } from '@cloudpress/shared';

export async function handleAdminPages(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  if (method === 'GET' && !id) {
    const rows = await env.DB.prepare('SELECT id, title, slug, status, sort_order, created_at FROM pages ORDER BY sort_order, created_at DESC').all();
    return jsonResponse({ success: true, data: rows.results || [] });
  }
  if (method === 'GET' && id) {
    const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first();
    if (!page) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '페이지를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: page });
  }
  if (method === 'POST' && !id) {
    const body = await request.json() as { title: string; slug?: string; content?: string; content_html?: string; status?: string; sort_order?: number };
    if (!body.title) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '제목은 필수입니다.' } }, 400);
    const pageId = `page_${crypto.randomUUID()}`;
    const slug = body.slug || slugify(body.title);
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare('INSERT INTO pages (id, title, slug, content, content_html, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(pageId, body.title, slug, body.content || '', body.content_html || body.content || '', body.status || 'draft', body.sort_order || 0, now, now).run();
    return jsonResponse({ success: true, data: { id: pageId, slug } }, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = []; const values: unknown[] = [];
    for (const key of ['title','slug','content','content_html','status','sort_order']) if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    if (!fields.length) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);
    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000), id);
    const result = await env.DB.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '페이지를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  if (method === 'DELETE' && id) {
    const result = await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM seo_meta WHERE object_type = ? AND object_id = ?').bind('page', id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '페이지를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
