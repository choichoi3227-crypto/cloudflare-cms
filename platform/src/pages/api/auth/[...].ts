// platform/src/pages/api/auth/[...].ts
import type { APIRoute } from 'astro';
import { getAuthorizationUrl } from '../../../lib/cloudflare-oauth';
import { createLogoutCookie } from '../../../lib/session';
export const GET: APIRoute = ({ url }) => {
  const action = url.pathname.split('/').pop();
  if (action === 'login') return new Response(null, { status:302, headers:{ Location: getAuthorizationUrl(crypto.randomUUID()) } });
  return new Response(JSON.stringify({ error:'Not found' }), { status:404, headers:{'Content-Type':'application/json'} });
};
export const POST: APIRoute = ({ url }) => {
  const action = url.pathname.split('/').pop();
  if (action === 'logout') return new Response(JSON.stringify({ success:true }), { status:200, headers:{'Content-Type':'application/json','Set-Cookie':createLogoutCookie()} });
  return new Response(JSON.stringify({ error:'Not found' }), { status:404, headers:{'Content-Type':'application/json'} });
};
