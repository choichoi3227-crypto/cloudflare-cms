import type { Env } from '../types';

export async function handlePublicHtml(_request: Request, _env: Env, securityHeaders: Record<string, string>): Promise<Response> {
  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders },
  });
}
