// workers/platform-api/src/middleware/cors.ts
const ALLOWED_ORIGINS = ['https://cloud-press.co.kr','http://localhost:4321'];
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, PATCH, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, X-User-Id, X-CF-Token, X-CF-Account-Id', 'Access-Control-Max-Age':'86400' };
}
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') return new Response(null, { status:204, headers:corsHeaders(request) });
  return null;
}
