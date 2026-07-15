import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
// workers/platform-api/src/types/index.ts
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  // 이메일/비밀번호 인증 관련 시크릿 (wrangler secret put 으로 설정)
  ENCRYPTION_SECRET: string; // CF Global API 키 등 민감정보 암호화용
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string; // 예: "CloudPress <noreply@cloud-press.co.kr>"
  PUBLIC_SITE_URL: string; // 예: https://cloud-press.co.kr (인증 링크 생성용)
}
export interface AuthenticatedRequest extends Request { userId: string; cfToken: string; cfAccountId: string; }
export interface SiteCreateInput { site_name: string; domain: string; }
export interface OAuthCallbackInput { cfAccountId: string; email: string; username: string; avatarUrl: string | null; oauthToken: string; refreshToken: string | null; expiresAt: number | null; }
