// platform/src/lib/session.ts
import { isAdminEmail } from './admin';

export interface SessionData {
  userId: string; email: string; username: string; avatarUrl: string | null;
  // Cloudflare OAuth로 가입한 사용자에게만 존재합니다 (기존 로그인 방식).
  // 이메일/비밀번호 또는 소셜(Google/GitHub) 가입 사용자는 이 값이 없습니다.
  cfAccountId?: string; cfToken?: string;
  authProvider?: 'email' | 'google' | 'github' | 'cloudflare_oauth';
  // 'pending_cf_key'인 사용자는 Cloudflare Global API 키 등록을 아직 완료하지 않은
  // 소셜 로그인 신규 가입자입니다 (/auth/complete-signup으로 안내해야 합니다).
  status?: 'pending_verification' | 'pending_cf_key' | 'active' | 'suspended' | 'deleted';
  role?: 'admin' | 'user';
}

const SESSION_COOKIE_NAME = 'cp_session';

export function createSessionCookie(session: SessionData): string {
  const payload = btoa(JSON.stringify(session));
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  return `${SESSION_COOKIE_NAME}=${payload}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function parseSessionCookie(cookieHeader: string | null): SessionData | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
    const [k, ...v] = c.trim().split('=');
    if (k && v.length) acc[k] = v.join('=');
    return acc;
  }, {});
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return null;
  try { return JSON.parse(atob(raw)) as SessionData; } catch { return null; }
}

/**
 * Astro API 라우트에서 사용하는 헬퍼입니다.
 * context.request의 쿠키를 파싱해 세션을 반환하고, ADMIN_EMAILS 기준으로
 * role을 파생시켜 붙여줍니다 (users 테이블에 role 컬럼이 없기 때문).
 */
export async function getSession(context: { request: Request }): Promise<SessionData | null> {
  const cookieHeader = context.request.headers.get('cookie');
  const session = parseSessionCookie(cookieHeader);
  if (!session) return null;
  return { ...session, role: isAdminEmail(session.email) ? 'admin' : 'user' };
}

export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// --- Cloudflare OAuth PKCE / state 임시 쿠키 -----------------------------
// authorization 요청 시 생성한 state와 PKCE code_verifier를 콜백 시점까지
// 짧게 보관하기 위한 HttpOnly 쿠키입니다. CSRF 방어(state 일치 확인)와
// 코드 가로채기 방어(PKCE code_verifier)를 위해 반드시 콜백에서 검증해야 합니다.
const OAUTH_STATE_COOKIE_NAME = 'cp_oauth_state';

export interface OAuthPendingState {
  state: string;
  codeVerifier: string;
  // 어떤 provider의 인가 흐름인지 구분합니다 ('cloudflare'가 기본값 — 기존 흐름과의 하위호환 유지)
  provider?: 'cloudflare' | 'google' | 'github';
}

export function createOAuthStateCookie(pending: OAuthPendingState): string {
  const payload = btoa(JSON.stringify(pending));
  // 인가 흐름은 보통 몇 분 안에 끝나므로 10분으로 짧게 제한합니다.
  const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
  return `${OAUTH_STATE_COOKIE_NAME}=${payload}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function parseOAuthStateCookie(cookieHeader: string | null): OAuthPendingState | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
    const [k, ...v] = c.trim().split('=');
    if (k && v.length) acc[k] = v.join('=');
    return acc;
  }, {});
  const raw = cookies[OAUTH_STATE_COOKIE_NAME];
  if (!raw) return null;
  try { return JSON.parse(atob(raw)) as OAuthPendingState; } catch { return null; }
}

export function clearOAuthStateCookie(): string {
  return `${OAUTH_STATE_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
