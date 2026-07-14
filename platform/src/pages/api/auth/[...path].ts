// platform/src/pages/api/auth/[...path].ts
import type { APIRoute } from 'astro';
import {
  getAuthorizationUrl,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  revokeToken,
} from '../../../lib/cloudflare-oauth';
import {
  createLogoutCookie,
  createOAuthStateCookie,
  parseOAuthStateCookie,
  clearOAuthStateCookie,
  parseSessionCookie,
} from '../../../lib/session';

export const GET: APIRoute = async ({ url }) => {
  const action = url.pathname.split('/').pop();

  if (action === 'login') {
    // CSRF 방어용 state와 PKCE code_verifier/code_challenge(S256)를 생성하고,
    // code_verifier는 콜백에서 검증할 수 있도록 HttpOnly 쿠키로 임시 저장합니다.
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    let authorizationUrl: string;
    try {
      authorizationUrl = getAuthorizationUrl({ state, codeChallenge });
    } catch (err) {
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'OAuth 설정 오류' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl,
        'Set-Cookie': createOAuthStateCookie({ state, codeVerifier }),
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ url, request }) => {
  const action = url.pathname.split('/').pop();

  if (action === 'logout') {
    // Cloudflare 측 access token도 함께 폐기해 세션을 완전히 종료합니다.
    const session = parseSessionCookie(request.headers.get('cookie'));
    if (session?.cfToken) {
      await revokeToken(session.cfToken).catch(() => {
        // 폐기 실패는 로그아웃 자체를 막지 않습니다 (토큰이 이미 만료됐을 수 있음).
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createLogoutCookie() },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};
