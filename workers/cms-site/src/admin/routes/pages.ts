// workers/cms-site/src/admin/routes/pages.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminPages(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  const db = env.DB;

  if (method === 'GET' && !id) {
    const result = await db.prepare(
      "SELECT id, title, slug, status, sort_order, created_at FROM pages ORDER BY sort_order, created_at DESC"
    ).all<{ id: string; title: string; slug: string; status: string; sort_order: number; created_at: number }>();

    return jsonResponse({ success: true, data: result });
  }

  if (method === 'POST' && !id) {
    const body = await request.json() as {
      title: string;
      slug?: string;
      content: string;
      content_html?: string;
      status?: string;
      sort_order?: number;
    });

    if (!body.title || !body.content) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '제목과 본문은 필수입니다.' } }, 400);
    }

    const id = body.slug ? slugify(body.title) : generateId('page');
    
    const existingSlug = await db.prepare('SELECT id FROM pages WHERE slug = ?').bind(id).first();
    if (existingSlug) {
      id = `${id}-${generateId()}`;
    }

    const now = Math.floor(Date.now() / 1000);
    const status = body.status || 'draft';
    const sortOrder = body.sort_order || 0;

    await db.prepare(
      'INSERT INTO pages (id, title, slug, content, content_html, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, body.title, id, body.content, body.content_html || body.content, status, sortOrder, now, now).run();

    return jsonResponse({ success: true, data: { id } }, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.slug !== undefined) { fields.push('slug = ?'); values.push(body.slug); }
    if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
    if (body.content_html !== undefined) { fields.push('content_html = ?'); values.push(body.content_html); }
    if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
    if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(body.sort_order); }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);
    }

    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    const result = await db.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '페이지를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // DELETE
  if (method === 'DELETE' && id) {
    await db.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
    await db.prepare('DELETE FROM seo_meta WHERE object_type = ? AND object_id = ?').bind(id, 'page').run();
    
    const deleteResult = await db.prepare('DELETE FROM pages WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '페이지를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
