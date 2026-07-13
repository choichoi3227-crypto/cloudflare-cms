// platform/src/lib/session.ts
export interface SessionData {
  userId: string; email: string; username: string; avatarUrl: string | null; cfAccountId: string; cfToken: string;
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

export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
