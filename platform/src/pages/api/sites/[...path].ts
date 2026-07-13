// platform/src/pages/api/sites/[...].ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '../../../lib/session';
import { validateSiteCreation } from '../../../lib/validators';
const PLATFORM_API = import.meta.env.PLATFORM_API_URL || 'http://localhost:8787';
export const GET: APIRoute = async ({ request, params }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return new Response(JSON.stringify({ success:false, error:{code:'UNAUTHORIZED',message:'로그인이 필요합니다.'} }), { status:401, headers:{'Content-Type':'application/json'} });
  const siteId = (params.path as string | undefined)?.split('/').filter(Boolean).pop();
  try {
    const upstreamPath = siteId ? `/api/sites/${siteId}` : '/api/sites';
    const r = await fetch(`${PLATFORM_API}${upstreamPath}`, { headers:{'Content-Type':'application/json','X-User-Id':session.userId} });
    return new Response(await r.text(), { status:r.status, headers:{'Content-Type':'application/json'} });
  } catch { return new Response(JSON.stringify({ success:false, error:{code:'INTERNAL_ERROR',message:'서버 오류'} }), { status:500, headers:{'Content-Type':'application/json'} }); }
};
export const POST: APIRoute = async ({ request }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return new Response(JSON.stringify({ success:false, error:{code:'UNAUTHORIZED',message:'로그인이 필요합니다.'} }), { status:401, headers:{'Content-Type':'application/json'} });
  try {
    const body = await request.json() as { siteName: string; domain: string };
    const err = validateSiteCreation(body);
    if (err) return new Response(JSON.stringify({ success:false, error:{code:'VALIDATION_ERROR',message:err} }), { status:400, headers:{'Content-Type':'application/json'} });
    const r = await fetch(`${PLATFORM_API}/api/sites`, { method:'POST', headers:{'Content-Type':'application/json','X-User-Id':session.userId,'X-CF-Token':session.cfToken,'X-CF-Account-Id':session.cfAccountId}, body:JSON.stringify({site_name:body.siteName,domain:body.domain}) });
    return new Response(await r.text(), { status:r.status, headers:{'Content-Type':'application/json'} });
  } catch { return new Response(JSON.stringify({ success:false, error:{code:'INTERNAL_ERROR',message:'서버 오류'} }), { status:500, headers:{'Content-Type':'application/json'} }); }
};

// 사이트 상세 조회 및 삭제(호스팅 해제)는 /api/sites/:id 로 프록시됩니다.
// path 파라미터가 없으면(=목록/생성 요청) 위의 핸들러가 처리하므로 여기서는 :id가 있는 경우만 처리합니다.
export const DELETE: APIRoute = async ({ request, params }) => {
  const session = parseSessionCookie(request.headers.get('cookie'));
  if (!session) return new Response(JSON.stringify({ success:false, error:{code:'UNAUTHORIZED',message:'로그인이 필요합니다.'} }), { status:401, headers:{'Content-Type':'application/json'} });
  const siteId = (params.path as string | undefined)?.split('/').filter(Boolean).pop();
  if (!siteId) return new Response(JSON.stringify({ success:false, error:{code:'VALIDATION_ERROR',message:'사이트 ID가 필요합니다.'} }), { status:400, headers:{'Content-Type':'application/json'} });
  try {
    const r = await fetch(`${PLATFORM_API}/api/sites/${siteId}`, { method:'DELETE', headers:{'Content-Type':'application/json','X-User-Id':session.userId} });
    return new Response(await r.text(), { status:r.status, headers:{'Content-Type':'application/json'} });
  } catch { return new Response(JSON.stringify({ success:false, error:{code:'INTERNAL_ERROR',message:'서버 오류'} }), { status:500, headers:{'Content-Type':'application/json'} }); }
};
