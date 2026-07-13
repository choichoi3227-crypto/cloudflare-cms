// workers/platform-api/src/router.ts
import type { Env } from './types';
import { handleAuthCallback } from './routes/auth';
import { handleListSites, handleCreateSite, handleGetSite, handleDeleteSite } from './routes/sites';
import { handleAdminOverview, handleAdminListUsers, handleAdminListSites, handleAdminListActivity } from './routes/admin';
import { corsHeaders, handleCors } from './middleware/cors';
import { rateLimit } from './middleware/rate-limit';

function matchRoute(pathname: string, method: string) {
  const routes: Array<{ method:string; pattern:string; handler:(req:Request,env:Env,params:Record<string,string>)=>Promise<Response> }> = [
    { method:'POST', pattern:'/api/auth/callback', handler:async(req,env) => handleAuthCallback(req,env) },
    { method:'GET', pattern:'/api/sites', handler:async(req,env) => handleListSites(req,env) },
    { method:'POST', pattern:'/api/sites', handler:async(req,env) => handleCreateSite(req,env) },
    { method:'GET', pattern:'/api/sites/:id', handler:async(req,env,p) => handleGetSite(req,env,p.id) },
    { method:'DELETE', pattern:'/api/sites/:id', handler:async(req,env,p) => handleDeleteSite(req,env,p.id) },
    { method:'GET', pattern:'/api/admin/overview', handler:async(req,env) => handleAdminOverview(req,env) },
    { method:'GET', pattern:'/api/admin/users', handler:async(req,env) => handleAdminListUsers(req,env) },
    { method:'GET', pattern:'/api/admin/sites', handler:async(req,env) => handleAdminListSites(req,env) },
    { method:'GET', pattern:'/api/admin/activity', handler:async(req,env) => handleAdminListActivity(req,env) },
  ];
  for (const route of routes) {
    if (route.method !== method) continue;
    const pp = route.pattern.split('/'); const up = pathname.split('/');
    if (pp.length !== up.length) continue;
    const params: Record<string,string> = {}; let match = true;
    for (let i = 0; i < pp.length; i++) { if (pp[i].startsWith(':')) params[pp[i].substring(1)] = up[i]; else if (pp[i] !== up[i]) { match = false; break; } }
    if (match) return { handler:route.handler, params };
  }
  return null;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const corsResp = handleCors(request);
  if (corsResp) return corsResp;

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(`global:${clientIp}`, 120, 60000, env.KV);
  if (!rl.allowed) return new Response(JSON.stringify({success:false,error:{code:'TOO_MANY_REQUESTS',message:'요청이 너무 많습니다.'}}), { status:429, headers:{'Content-Type':'application/json','Retry-After':String(Math.ceil((rl.resetAt-Date.now())/1000)),...corsHeaders(request)} });

  const matched = matchRoute(url.pathname, request.method);
  if (!matched) return new Response(JSON.stringify({success:false,error:{code:'NOT_FOUND',message:'API를 찾을 수 없습니다.'}}), { status:404, headers:{'Content-Type':'application/json',...corsHeaders(request)} });

  try {
    const response = await matched.handler(request, env, matched.params);
    const h = new Headers(response.headers);
    for (const [k,v] of Object.entries(corsHeaders(request))) h.set(k,v);
    return new Response(response.body, { status:response.status, headers:h });
  } catch (err) {
    console.error('Request error:', err);
    return new Response(JSON.stringify({success:false,error:{code:'INTERNAL_ERROR',message:'서버 오류가 발생했습니다.'}}), { status:500, headers:{'Content-Type':'application/json',...corsHeaders(request)} });
  }
}
