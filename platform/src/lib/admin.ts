// platform/src/lib/admin.ts
import type { SessionData } from './session';

/**
 * 플랫폼 관리자 여부를 판단합니다.
 * users 테이블에 role 컬럼이 없으므로, 환경변수 ADMIN_EMAILS(쉼표로 구분된 이메일 목록)를
 * 기준으로 판단하는 가벼운 방식을 사용합니다.
 *
 * 예: ADMIN_EMAILS="owner@cloud-press.co.kr,admin@cloud-press.co.kr"
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = import.meta.env.ADMIN_EMAILS as string | undefined;
  if (!raw) return false;
  const allowlist = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

export function isAdminSession(session: SessionData | null): boolean {
  if (!session) return false;
  return isAdminEmail(session.email);
}
