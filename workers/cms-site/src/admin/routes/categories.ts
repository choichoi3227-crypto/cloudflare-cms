// workers/cms-site/src/admin/routes/categories.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { generateId, now } from '@shared/utils/id';
import { slugify } from '@shared/utils/slug';

export async function handleAdminCategories(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  const db = env.DB;

  // 목록
  if (method === 'GET' && !id) {
    const result = await db.prepare(
      'SELECT c.id, c.name, c.slug, c.description FROM categories c ORDER BY c.sort_order, c.name'
    ).all<{ id: string; name: string; slug: string; description: string | null }>();

    return jsonResponse({ success: true, data });
  }

  // 생성
  if (method === 'POST' && !id) {
    const body = await request.json() as {
      name: string;
      slug?: string;
      description?: string;
      parent_id?: string;
      sort_order?: number;
    });

    if (!body.name) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '카테고리 이름을 입력해주세요.' } }, 400);
    }

    const id = generateId('cat');
    let slug = body.slug || slugify(body.name);
    if (!slug) slug = `cat-${generateId()}`;

    const existing = await db.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
    if (existing) {
      slug = `${slug}-${generateId()}`;
    }

    const now = now();

    await db.prepare(
      'INSERT INTO categories (id, name, slug, description, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, body.name, slug, body.description || null, body.parent_id || null, body.sort_order || 0, now).run();

    return jsonResponse({ success: true, data: { id, slug, name: body.name, description: body.description || null, sort_order: body.sort_order || 0 } }, 201);
  }

  // 수정
  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.slug !== undefined) { fields.push('slug = ?'); values.push(body.slug); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
    if (body.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(body.parent_id); }
    if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(body.sort_order); }

    if (fields.length === 0) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' }, 400);

    fields.push('updated_at = ?'); values.push(now));
    values.push(id);

    const result = await db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // 삭제
  if (method === 'DELETE' && id) {
    await db.prepare('DELETE FROM post_categories WHERE category_id = ?').bind(id).run();
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    
    const deleteResult = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
