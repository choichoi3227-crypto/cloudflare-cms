// platform/src/pages/auth/logout.ts
import type { APIRoute } from 'astro';
import { createLogoutCookie } from '../../lib/session';
export const GET: APIRoute = () => new Response(null, { status:302, headers:{ 'Location':'/', 'Set-Cookie':createLogoutCookie() } });
