import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminComments(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  if (method === 'GET' && !id) {
    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get('per_page') || '20')));
    const offset = (page - 1) * perPage;
    const rows = await env.DB.prepare('SELECT id, post_id, author_name, author_email, author_url, content, status, created_at FROM comments ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(perPage, offset).all();
    const total = await env.DB.prepare('SELECT COUNT(*) as count FROM comments').first<{ count: number }>();
    return jsonResponse({ success: true, data: rows.results || [], meta: { page, per_page: perPage, total: total?.count || 0 } });
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    const body = await request.json() as { status: string };
    if (!['approved', 'pending', 'spam', 'deleted'].includes(body.status)) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '유효한 상태값이 아닙니다.' } }, 400);
    const result = await env.DB.prepare('UPDATE comments SET status = ? WHERE id = ?').bind(body.status, id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '댓글을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  if (method === 'DELETE' && id) {
    const result = await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '댓글을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
