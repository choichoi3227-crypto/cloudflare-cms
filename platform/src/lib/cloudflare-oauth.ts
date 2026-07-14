// platform/src/lib/cloudflare-oauth.ts
//
// Cloudflare 공식 OAuth 엔드포인트 (Cloudflare Fundamentals 문서 기준,
// https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/):
//   - Authorization : https://dash.cloudflare.com/oauth2/auth
//   - Token         : https://dash.cloudflare.com/oauth2/token
//   - Revoke        : https://dash.cloudflare.com/oauth2/revoke
//   - User info     : https://dash.cloudflare.com/oauth2/userinfo
//   - JWKS          : https://dash.cloudflare.com/.well-known/jwks.json
//   - OIDC discovery: https://dash.cloudflare.com/.well-known/openid-configuration
//
// Cloudflare OAuth 클라이언트는 OAuth 2.0 Authorization Code Flow만 지원합니다
// (Client Credentials, Implicit, ROPC, Device Code 등은 미지원).
// 서버 사이드 앱은 client_secret + Authorization Code, SPA/모바일/CLI 앱은
// PKCE(S256) + Authorization Code를 사용해야 합니다. 이 구현은 두 가지를
// 모두 지원하도록 PKCE를 항상 포함시킵니다(서버 사이드 앱에서도 추가 방어
// 계층으로 사용 가능하며, 표준 권장 사항입니다).
//
// 스코프는 Cloudflare API 토큰 권한 이름과 1:1로 대응합니다. 잘못된 스코프
// 문자열(e.g. "account:read")은 401/invalid_scope 오류를 유발하므로,
// 실제 사용하는 권한만 정확히 나열해야 합니다.
// 참고: https://developers.cloudflare.com/fundamentals/api/reference/permissions/

const CF_DASH_BASE = 'https://dash.cloudflare.com';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export const CLOUDFLARE_OAUTH_ENDPOINTS = {
  authorization: `${CF_DASH_BASE}/oauth2/auth`,
  token: `${CF_DASH_BASE}/oauth2/token`,
  revoke: `${CF_DASH_BASE}/oauth2/revoke`,
  userinfo: `${CF_DASH_BASE}/oauth2/userinfo`,
  jwks: `${CF_DASH_BASE}/.well-known/jwks.json`,
  openIdConfiguration: `${CF_DASH_BASE}/.well-known/openid-configuration`,
} as const;

// 이 플랫폼이 실제로 필요로 하는 최소 권한만 요청합니다 (최소 권한 원칙).
// - user.user_details.read: 로그인한 사용자 프로필(이메일/이름) 조회
// - account.account_settings.read: 계정 식별을 위한 계정 목록 조회
// 필요한 리소스 접근 권한이 늘어나면 이 배열에만 추가하면 됩니다.
const DEFAULT_SCOPES = ['user.user_details.read', 'account.account_settings.read'];

export interface CloudflareTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface CloudflareUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const byte of arr) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** RFC 7636 PKCE code_verifier를 생성합니다 (43~128자, unreserved characters). */
export function generateCodeVerifier(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(randomBytes);
}

/** PKCE code_verifier로부터 S256 code_challenge를 생성합니다. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64UrlEncode(digest);
}

export function generateState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)));
}

/**
 * Cloudflare 인가(authorization) URL을 생성합니다.
 * state와 PKCE code_challenge는 호출부에서 생성해 HttpOnly 쿠키 등
 * 서버 측에 임시 저장한 뒤, 콜백에서 반드시 검증해야 CSRF 및 코드 가로채기를
 * 방어할 수 있습니다.
 */
export function getAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
  scopes?: string[];
}): string {
  const clientId = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_ID;
  const redirectUri = import.meta.env.CLOUDFLARE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('CLOUDFLARE_OAUTH_CLIENT_ID / CLOUDFLARE_OAUTH_REDIRECT_URI 환경변수가 설정되어 있지 않습니다.');
  }
  const search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: (params.scopes ?? DEFAULT_SCOPES).join(' '),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${CLOUDFLARE_OAUTH_ENDPOINTS.authorization}?${search.toString()}`;
}

/**
 * authorization code를 access token으로 교환합니다.
 * Cloudflare의 토큰 엔드포인트는 표준 OAuth 2.0 사양에 따라
 * `application/x-www-form-urlencoded` 본문을 요구합니다 (JSON 본문 아님).
 * confidential client(서버 사이드 앱, client_secret_basic)를 기준으로
 * client_secret은 Authorization: Basic 헤더로 전달합니다.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<CloudflareTokenResponse> {
  const clientId = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_ID;
  const clientSecret = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_SECRET;
  const redirectUri = import.meta.env.CLOUDFLARE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('CLOUDFLARE_OAUTH_CLIENT_ID / CLOUDFLARE_OAUTH_REDIRECT_URI 환경변수가 설정되어 있지 않습니다.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };
  // client_secret_basic (서버 사이드 confidential client). client_secret이 없으면
  // PKCE만으로 인증하는 public client로 간주하고 client_secret 없이 요청합니다.
  if (clientSecret) {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const response = await fetch(CLOUDFLARE_OAUTH_ENDPOINTS.token, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Cloudflare OAuth 토큰 교환 실패 (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<CloudflareTokenResponse>;
}

/**
 * 만료된 access token을 refresh_token으로 갱신합니다.
 */
export async function refreshAccessToken(refreshToken: string): Promise<CloudflareTokenResponse> {
  const clientId = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_ID;
  const clientSecret = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_SECRET;
  if (!clientId) throw new Error('CLOUDFLARE_OAUTH_CLIENT_ID 환경변수가 설정되어 있지 않습니다.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };
  if (clientSecret) {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const response = await fetch(CLOUDFLARE_OAUTH_ENDPOINTS.token, { method: 'POST', headers, body: body.toString() });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Cloudflare OAuth 토큰 갱신 실패 (${response.status}): ${errorText}`);
  }
  return response.json() as Promise<CloudflareTokenResponse>;
}

/**
 * 발급받은 access token(또는 refresh token)을 폐기합니다.
 * 로그아웃 시 서버 측에서도 반드시 호출해 세션 재사용을 막아야 합니다.
 */
export async function revokeToken(token: string): Promise<void> {
  const clientId = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_ID;
  const clientSecret = import.meta.env.CLOUDFLARE_OAUTH_CLIENT_SECRET;
  if (!clientId) throw new Error('CLOUDFLARE_OAUTH_CLIENT_ID 환경변수가 설정되어 있지 않습니다.');

  const body = new URLSearchParams({ token, client_id: clientId });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const response = await fetch(CLOUDFLARE_OAUTH_ENDPOINTS.revoke, { method: 'POST', headers, body: body.toString() });
  // Revoke 엔드포인트는 토큰이 이미 무효해도 200을 반환할 수 있으므로,
  // 실패해도 로그아웃 흐름 자체를 막지 않고 경고만 남깁니다.
  if (!response.ok) {
    console.warn(`Cloudflare OAuth 토큰 폐기 실패 (${response.status})`);
  }
}

/**
 * Cloudflare의 공식 OIDC 스타일 userinfo 엔드포인트에서 로그인한 사용자
 * 정보를 조회합니다. `api.cloudflare.com/client/v4/user`(Global API/User API용
 * 엔드포인트)가 아니라 OAuth 액세스 토큰과 짝을 이루는 `/oauth2/userinfo`를
 * 사용해야, 토큰에 부여된 스코프 범위 내에서 안전하게 사용자 식별 정보를
 * 받아올 수 있습니다.
 */
export async function getCloudflareUser(accessToken: string): Promise<CloudflareUserInfo> {
  const response = await fetch(CLOUDFLARE_OAUTH_ENDPOINTS.userinfo, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Cloudflare 사용자 정보 조회 실패 (${response.status}): ${response.statusText}`);
  }
  return response.json() as Promise<CloudflareUserInfo>;
}

/**
 * 사용자가 접근 가능한 Cloudflare 계정 목록을 조회합니다.
 * (account.account_settings.read 스코프 필요). Global API 엔드포인트는
 * OAuth access token을 그대로 Bearer 토큰으로 받아들입니다.
 */
export async function listCloudflareAccounts(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${CF_API_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Cloudflare 계정 목록 조회 실패 (${response.status}): ${response.statusText}`);
  }
  const data = (await response.json()) as { result: Array<{ id: string; name: string }> };
  return data.result;
}
