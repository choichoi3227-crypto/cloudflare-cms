// platform/src/lib/social-oauth.ts
//
// Google / GitHub 표준 OAuth 2.0 Authorization Code Flow (+ PKCE) 헬퍼입니다.
// Cloudflare OAuth 헬퍼(cloudflare-oauth.ts)와 동일한 PKCE + state 패턴을 사용합니다.
//
// Google:
//   - Authorization : https://accounts.google.com/o/oauth2/v2/auth
//   - Token         : https://oauth2.googleapis.com/token
//   - User info     : https://openidconnect.googleapis.com/v1/userinfo
//   참고: https://developers.google.com/identity/protocols/oauth2/web-server
//
// GitHub:
//   - Authorization : https://github.com/login/oauth/authorize
//   - Token         : https://github.com/login/oauth/access_token
//   - User          : https://api.github.com/user
//   - Emails        : https://api.github.com/user/emails (GitHub는 이메일이 비공개일 수 있어 별도 조회 필요)
//   참고: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

export type SocialProvider = 'google' | 'github';

interface ProviderConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  redirectUriEnvKey: string;
}

const PROVIDER_CONFIG: Record<SocialProvider, ProviderConfig> = {
  google: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'profile'],
    clientIdEnvKey: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnvKey: 'GOOGLE_OAUTH_CLIENT_SECRET',
    redirectUriEnvKey: 'GOOGLE_OAUTH_REDIRECT_URI',
  },
  github: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'user:email'],
    clientIdEnvKey: 'GITHUB_OAUTH_CLIENT_ID',
    clientSecretEnvKey: 'GITHUB_OAUTH_CLIENT_SECRET',
    redirectUriEnvKey: 'GITHUB_OAUTH_REDIRECT_URI',
  },
};

export interface SocialUserInfo {
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const byte of arr) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

export function generateState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)));
}

function getEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (!value) throw new Error(`${key} 환경변수가 설정되어 있지 않습니다.`);
  return value;
}

/**
 * 소셜 로그인 인가(authorization) URL을 생성합니다.
 * GitHub는 공식적으로 PKCE를 요구하지 않지만, 방어 계층으로 함께 사용합니다
 * (GitHub는 code_challenge 파라미터를 무시하므로 문제 없이 동작합니다).
 */
export function getSocialAuthorizationUrl(
  provider: SocialProvider,
  params: { state: string; codeChallenge: string }
): string {
  const config = PROVIDER_CONFIG[provider];
  const clientId = getEnv(config.clientIdEnvKey);
  const redirectUri = getEnv(config.redirectUriEnvKey);

  const search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state: params.state,
    response_type: 'code',
  });

  if (provider === 'google') {
    search.set('code_challenge', params.codeChallenge);
    search.set('code_challenge_method', 'S256');
    search.set('access_type', 'online');
    search.set('prompt', 'select_account');
  }

  return `${config.authorizationEndpoint}?${search.toString()}`;
}

/** authorization code를 access token으로 교환합니다. */
export async function exchangeSocialCodeForToken(
  provider: SocialProvider,
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number | null }> {
  const config = PROVIDER_CONFIG[provider];
  const clientId = getEnv(config.clientIdEnvKey);
  const clientSecret = getEnv(config.clientSecretEnvKey);
  const redirectUri = getEnv(config.redirectUriEnvKey);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (provider === 'google') body.set('code_verifier', codeVerifier);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`${provider} 토큰 교환 실패 (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(`${provider} 토큰 교환 실패: ${data.error_description ?? data.error ?? '알 수 없는 오류'}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

export async function getSocialUserInfo(provider: SocialProvider, accessToken: string): Promise<SocialUserInfo> {
  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Google 사용자 정보 조회 실패 (${response.status})`);
    const data = (await response.json()) as { sub: string; email: string; name?: string; picture?: string };
    return { providerUserId: data.sub, email: data.email, name: data.name || data.email.split('@')[0], avatarUrl: data.picture ?? null };
  }

  // GitHub: /user 응답의 email이 비공개(null)일 수 있으므로, 그 경우 /user/emails에서 primary/verified 이메일을 별도 조회합니다.
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CloudPress' },
  });
  if (!userResponse.ok) throw new Error(`GitHub 사용자 정보 조회 실패 (${userResponse.status})`);
  const user = (await userResponse.json()) as { id: number; login: string; name?: string | null; avatar_url?: string; email?: string | null };

  let email = user.email;
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CloudPress' },
    });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      email = primary?.email ?? null;
    }
  }
  if (!email) throw new Error('GitHub 계정에서 인증된 이메일을 찾을 수 없습니다. GitHub 설정에서 이메일을 공개하거나 인증해주세요.');

  return { providerUserId: String(user.id), email, name: user.name || user.login, avatarUrl: user.avatar_url ?? null };
}
