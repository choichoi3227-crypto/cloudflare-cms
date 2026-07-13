// platform/src/lib/session.ts
import { isAdminEmail } from './admin';

export interface SessionData {
  userId: string; email: string; username: string; avatarUrl: string | null; cfAccountId: string; cfToken: string;
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
