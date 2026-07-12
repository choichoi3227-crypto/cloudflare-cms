import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminMenus(request: Request, env: Env, method = request.method, id?: string): Promise<Response> {
  if (method === 'GET' && !id) {
    const menus = await env.DB.prepare('SELECT id, name, location, created_at FROM menus ORDER BY name').all();
    return jsonResponse({ success: true, data: menus.results || [] });
  }

  if (method === 'GET' && id) {
    const menu = await env.DB.prepare('SELECT id, name, location, created_at FROM menus WHERE id = ?').bind(id).first();
    if (!menu) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' } }, 404);
    const items = await env.DB.prepare('SELECT id, label, url, parent_id, target, sort_order FROM menu_items WHERE menu_id = ? ORDER BY sort_order, label').bind(id).all();
    return jsonResponse({ success: true, data: { ...menu, items: items.results || [] } });
  }

  if (method === 'POST' && !id) {
    const body = await request.json() as { name: string; location?: string };
    if (!body.name) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '메뉴 이름은 필수입니다.' } }, 400);
    const menuId = `menu_${crypto.randomUUID()}`;
    await env.DB.prepare('INSERT INTO menus (id, name, location, created_at) VALUES (?, ?, ?, ?)')
      .bind(menuId, body.name, body.location || null, Math.floor(Date.now() / 1000)).run();
    return jsonResponse({ success: true, data: { id: menuId } }, 201);
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM menu_items WHERE menu_id = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }

  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
