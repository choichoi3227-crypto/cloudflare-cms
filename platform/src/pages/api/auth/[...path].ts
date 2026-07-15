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
  getSocialAuthorizationUrl,
  generateState as generateSocialState,
  generateCodeVerifier as generateSocialCodeVerifier,
  generateCodeChallenge as generateSocialCodeChallenge,
  type SocialProvider,
} from '../../../lib/social-oauth';
import {
  createLogoutCookie,
  createOAuthStateCookie,
  parseOAuthStateCookie,
  clearOAuthStateCookie,
  parseSessionCookie,
  createSessionCookie,
} from '../../../lib/session';

const PLATFORM_API = import.meta.env.PLATFORM_API_URL || 'http://localhost:8787';

// platform-api 워커의 인증 응답을 그대로 전달하되, 성공 시(로그인/이메일 인증)에는
// 세션 쿠키를 함께 발급합니다.
async function proxyAndMaybeSetSession(upstreamPath: string, request: Request): Promise<Response> {
  const body = await request.text();
  const upstream = await fetch(`${PLATFORM_API}${upstreamPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const result = (await upstream.json()) as { success: boolean; data?: { user?: any } };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (result.success && result.data?.user) {
    headers['Set-Cookie'] = createSessionCookie({
      userId: result.data.user.id,
      email: result.data.user.email,
      username: result.data.user.username,
      avatarUrl: result.data.user.avatar_url,
      authProvider: result.data.user.auth_provider,
      status: result.data.user.status,
    });
  }
  return new Response(JSON.stringify(result), { status: upstream.status, headers });
}

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
        'Set-Cookie': createOAuthStateCookie({ state, codeVerifier, provider: 'cloudflare' }),
      },
    });
  }

  if (action === 'google' || action === 'github') {
    const provider = action as SocialProvider;
    const state = generateSocialState();
    const codeVerifier = generateSocialCodeVerifier();
    const codeChallenge = await generateSocialCodeChallenge(codeVerifier);

    let authorizationUrl: string;
    try {
      authorizationUrl = getSocialAuthorizationUrl(provider, { state, codeChallenge });
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
        'Set-Cookie': createOAuthStateCookie({ state, codeVerifier, provider }),
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ url, request }) => {
  const action = url.pathname.split('/').pop();

  if (action === 'register') {
    return proxyAndMaybeSetSession('/api/auth/register', request);
  }

  if (action === 'login') {
    return proxyAndMaybeSetSession('/api/auth/login', request);
  }

  if (action === 'verify-email') {
    return proxyAndMaybeSetSession('/api/auth/verify-email', request);
  }

  if (action === 'resend-verification') {
    const body = await request.text();
    const upstream = await fetch(`${PLATFORM_API}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'complete-cf-key') {
    const session = parseSessionCookie(request.headers.get('cookie'));
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await request.text();
    const upstream = await fetch(`${PLATFORM_API}/api/auth/complete-cf-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': session.userId },
      body,
    });
    const result = (await upstream.json()) as { success: boolean; data?: { user?: any } };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // 상태가 active로 바뀌었으니 세션도 최신 정보로 갱신합니다.
    if (result.success && result.data?.user) {
      headers['Set-Cookie'] = createSessionCookie({
        userId: result.data.user.id,
        email: result.data.user.email,
        username: result.data.user.username,
        avatarUrl: result.data.user.avatar_url,
        authProvider: result.data.user.auth_provider,
        status: result.data.user.status,
      });
    }
    return new Response(JSON.stringify(result), { status: upstream.status, headers });
  }

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
