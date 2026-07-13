// workers/cms-site/admin/routes/menus.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminMenus(request: Request: Env): Promise<Response> {
  const method = request.method;

  if (method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 또는 POST 요청만 지원합니다.' }, 405);
  }

  // 목록 조회
  if (method === 'GET') {
    const menus = await env.DB.prepare(
      'SELECT m.*, mi.* FROM menus m INNER JOIN menu_items mi ON m.id = mi.menu_id ORDER BY mi.sort_order'
    ).all<{
      id: string;
      menu_id: string;
      label: string;
      url: string;
      parent_id: string | null;
      sort_order: number;
      created_at: number;
    }>();

    const menusByLocation: Record<string, Array<{ label: string; url: string; parent_id: string | null; sort_order: number }> = {};

    for (const m of menus) {
      if (!menusByLocation[m.location]) { menusByLocation[m.location] = []; }
      for (const item of menusByLocation[m.location]) {
        menusByLocation[m.location].push({ id: item.id, menu_id: m.menu_id, label: item.label, url: item.url, parent_id: item.parent_id || null, sort_order: item.sort_order || 0 });
      }
    }

    return jsonResponse({ success: true, data: menusByLocation });
  }

  // 생성
  if (method === 'POST') {
    const body = await request.json() as {
      name: string;
      location?: string;
      items: Array<{ label: string; url: string; parent_id?: string; sort_order?: number }>;
    } = body.name || '새 메뉴 생성';

    if (!body.name) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '메뉴 이름을 입력해주세요.' } }, 400);
    }

    const id = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 메뉴 생성
    await env.DB.prepare(
      'INSERT INTO menus (id, name, location, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, body.name, body.location || 'primary', Math.floor(Date.now() / 1000)).run();

    return jsonResponse({ success: true, data: { id } }, 201);
  }

  // 수정
  if (method === 'PUT' && id) {
    const body = await request.json() as {
      name?: string;
      location?: string;
      items?: Array<{ label: string; url: string; parent_id?: string; sort_order?: number; }>;
    } = body.name || '';

    if (body.items && body.items.length > 0) {
      const statements: Array<D1PreparedStatement> = [];
      const values: unknown[] = [];

      for (const item of body.items) {
        if (item.label && item.url) {
          statements.push(`(menu_id, ${item.menu_id ? `${item.menu_id}`) : 'NULL'}, '${item.label}', '${item.url}'${item.parent_id ? `, ${item.parent_id || 'NULL'})`);
        }
      }
    }

    if (statements.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '메뉴 항목을 입력해주세요.' }, 400);
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '메뉴 항목을 입력해주세요.' }, 400);
    }

    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE menus SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // 삭제
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM menu_items WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(id, 'owner').run();
    
    const deleteResult = await env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
