import type { APIRoute } from 'astro';
import { parseSessionCookie } from '../../lib/session';

const PLATFORM_API = import.meta.env.PLATFORM_API_URL || 'http://localhost:8787';

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, url }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return unauthorized();
  const action = url.searchParams.get('action') || 'create';
  const upstreamPath = action === 'capture' ? '/api/payments/capture' : '/api/payments/create';
  const body = await request.text();
  const upstream = await fetch(`${PLATFORM_API}${upstreamPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': session.userId },
    body,
  });
  return new Response(await upstream.text(), { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
};

export const GET: APIRoute = async ({ request, url }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return unauthorized();
  const upstream = new URL(`${PLATFORM_API}/api/payments/status`);
  for (const [key, value] of url.searchParams.entries()) upstream.searchParams.set(key, value);
  const response = await fetch(upstream.toString(), { headers: { 'Content-Type': 'application/json', 'X-User-Id': session.userId } });
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
};
