// platform/src/pages/api/admin/[...path].ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '../../../lib/session';
import { isAdminSession } from '../../../lib/admin';

const PLATFORM_API = import.meta.env.PLATFORM_API_URL || 'http://localhost:8787';

function forbidden() {
  return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
}
function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, params, url }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return unauthorized();
  if (!isAdminSession(session)) return forbidden();

  const subPath = (params.path as string | undefined) || '';
  try {
    const upstream = new URL(`${PLATFORM_API}/api/admin/${subPath}`);
    for (const [key, value] of url.searchParams.entries()) upstream.searchParams.set(key, value);
    const r = await fetch(upstream.toString(), {
      headers: { 'Content-Type': 'application/json', 'X-User-Id': session.userId, 'X-Admin-Verified': '1' },
    });
    return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
