// workers/cms-site/src/admin/routes/tags.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { generateId, slugify } from '@shared/utils/id';

export async function handleAdminTags(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  const db = env.DB;

  if (method === 'GET' && !id) {
    const result = await db.prepare('SELECT id, name, slug FROM tags ORDER BY name').all<{ id: string; name: string; slug: string }>();
    return jsonResponse({ success: true, data });
  }

  if (method === 'POST' && !id) {
    const body = await request.json() as { name: string; slug?: string };
    if (!body.name) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그 이름을 입력해주세요.' } }, 400);
    }

    const id = body.slug ? slugify(body.name) : `tag-${generateId()}`;
    
    const existing = await db.prepare('SELECT id FROM tags WHERE slug = ?').bind(id).first();
    if (existing) {
      id = `${id}-${generateId()}`;
    }

    const now = Math.floor(Date.now() /  1000);

    await db.prepare(
      'INSERT INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, body.name, id, now).run();

    return jsonResponse({ success: true, data: { id } }, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json() as { name?: string; slug?: string };
    if (!body.name) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그 이름을 입력해주세요.' } }, 400);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.slug !== undefined) { fields.push('slug = ?'); values.push(body.slug); }

    if (fields.length === 0) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);

    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    const result = await db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '태그를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // DELETE
  if (method === 'DELETE' && id) {
    await db.prepare('DELETE FROM post_tags WHERE tag_id = ?').bind(id).run();
    await db.prepare('DELETE FROM tags WHERE id = ?').bind(id, 'owner').run();
    
    const deleteResult = await db.prepare('DELETE FROM tags WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '태그를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
