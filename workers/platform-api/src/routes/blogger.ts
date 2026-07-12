// workers/platform-api/src/routes/blogger.ts
import type { Env } from '../types';
import { success, error, notFound, internalError } from '../utils/response';

interface BloggerConnectionInput {
  provider: string;
  blog_id: string;
  blog_name?: string;
  blog_url: string;
  api_key_encrypted: string;
}

export async function handleBloggerConnection(request: Request, env: Env): Promise<Response> {
  const method = request.method;
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED', '로그인이 필요합니다.', 401);

  if (method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id, provider, blog_id, blog_name, blog_url, is_active, created_at FROM user_blogger_connections WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();
    return success(result.results);
  }

  if (method === 'POST') {
    const body = await request.json() as BloggerConnectionInput;
    if (!body.blog_id || !body.blog_url || !body.api_key_encrypted) {
      return error('VALIDATION_ERROR', 'Blog ID, Blog URL, API Key을 모두 입력해주세요.');
    }

    const id = `blog_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await env.DB.prepare(
      'INSERT INTO user_blogger_connections (id, user_id, provider, blog_id, blog_name, blog_url, api_key_encrypted, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch())'
    ).bind(id, userId, body.provider, body.blog_id, body.blog_name || body.blog_id, body.blog_url, body.api_key_encrypted).run();

    return success({ id }, 201);
  }

  if (method === 'DELETE') {
    const url = new URL(request.url);
    const connId = url.pathname.split('/').pop();
    if (!connId) return notFound();

    await env.DB.prepare('UPDATE user_blogger_connections SET is_active = 0 WHERE id = ? AND user_id = ?').bind(connId, userId).run();
    return success({ deleted: true });
  }

  return error('METHOD_NOT_ALLOWED', '지원하지 않는 메서드입니다.', 405);
}
