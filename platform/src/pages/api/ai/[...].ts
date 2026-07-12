// platform/src/pages/api/ai/[...].ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '../../lib/session';
const AI_GATEWAY = import.meta.env.AI_GATEWAY_URL || 'http://localhost:8788';
export const POST: APIRoute = async ({ request, url }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return new Response(JSON.stringify({ success:false, error:{code:'UNAUTHORIZED',message:'로그인이 필요합니다.'} }), { status:401, headers:{'Content-Type':'application/json'} });
  const action = url.pathname.split('/').pop();
  try {
    const body = await request.json();
    const r = await fetch(`${AI_GATEWAY}/api/ai/${action}`, { method:'POST', headers:{'Content-Type':'application/json','X-User-Id':session.userId}, body:JSON.stringify(body) });
    return new Response(await r.text(), { status:r.status, headers:{'Content-Type':'application/json'} });
  } catch { return new Response(JSON.stringify({ success:false, error:{code:'AI_ERROR',message:'AI 요청 중 오류'} }), { status:500, headers:{'Content-Type':'application/json'} }); }
};
