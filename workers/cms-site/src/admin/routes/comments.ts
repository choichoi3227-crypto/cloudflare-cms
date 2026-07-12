// workers/cms-site/src/admin/routes/comments.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminComments(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;

  // 목록 조회
  if (method === 'GET' && !id) {
    const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
    const perPage = parseInt(new URL(request.url).searchParams.get('per_page') || '20');
  const offset = (page - 1) * perPage;

  const result = await env.DB.prepare(
    "SELECT c.*, p.* FROM comments c LEFT JOIN posts p ON c.post_id = p.id WHERE c.status = 'pending' ORDER BY c.created_at DESC LIMIT ? OFFSET ?"
  ).bind(perPage, offset).all<{
    id: string;
    author_name: string;
    author_email: string;
    author_url: string | null;
    content: string;
    post_id: string;
    post_title: string;
    status: string;
    created_at: number;
  }>();

  const totalResult = await env.DB.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").first<{ count: number }>();

  return jsonResponse({
    success: true,
    data: result,
    meta: { page, per_page: perPage, total: totalResult?.count || 0 },
  });

  // 상태 변경 (승인/거부분/거부분)
  if (method === 'PATCH' && id) {
    const body = await request.json() as { status: string };
    if (!['approved', 'pending', 'spam', 'deleted'].includes(body.status)) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '유효한 상태값이 아닙니다. (approved, pending, spam, deleted 중 하나여야 합니다.)' } }, 400);
    }

    const result = await env.DB.prepare(
      "UPDATE comments SET status = ? WHERE id = ?"
    ).bind(body.status, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '댓글을 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // 삭제
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id, 'owner').run();
    
    const deleteResult = await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '댓글을 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
