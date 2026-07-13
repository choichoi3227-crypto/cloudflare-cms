import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { slugify } from '@cloudpress/shared';

export async function handleAdminPosts(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  if (method === 'GET' && !id) {
    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get('per_page') || '10')));
    const offset = (page - 1) * perPage;
    const rows = await env.DB.prepare('SELECT id, title, slug, status, featured_image, published_at, created_at FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(perPage, offset).all();
    const total = await env.DB.prepare('SELECT COUNT(*) as count FROM posts').first<{ count: number }>();
    return jsonResponse({ success: true, data: rows.results || [], meta: { page, per_page: perPage, total: total?.count || 0 } });
  }
  if (method === 'GET' && id) {
    const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    if (!post) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: post });
  }
  if (method === 'POST' && !id) {
    const body = await request.json() as { title: string; slug?: string; excerpt?: string; content?: string; content_html?: string; status?: string; featured_image?: string; published_at?: number };
    if (!body.title) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '제목은 필수입니다.' } }, 400);
    const postId = `post_${crypto.randomUUID()}`; const slug = body.slug || slugify(body.title); const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare('INSERT INTO posts (id, title, slug, excerpt, content, content_html, status, featured_image, author_id, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(postId, body.title, slug, body.excerpt || null, body.content || '', body.content_html || body.content || '', body.status || 'draft', body.featured_image || null, 'owner', body.published_at || null, now, now).run();
    return jsonResponse({ success: true, data: { id: postId, slug } }, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = []; const values: unknown[] = [];
    for (const key of ['title','slug','excerpt','content','content_html','status','featured_image','published_at','scheduled_at']) if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    if (!fields.length) return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);
    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000), id);
    const result = await env.DB.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { updated: true } });
  }
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM post_categories WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }
  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
