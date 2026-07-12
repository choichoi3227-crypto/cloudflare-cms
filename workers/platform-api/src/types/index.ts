// workers/platform-api/src/types/index.ts
export interface Env { DB: D1Database; KV: KVNamespace; ENVIRONMENT: string; }
export interface AuthenticatedRequest extends Request { userId: string; cfToken: string; cfAccountId: string; }
export interface SiteCreateInput { site_name: string; domain: string; }
export interface OAuthCallbackInput { cfAccountId: string; email: string; username: string; avatarUrl: string | null; oauthToken: string; refreshToken: string | null; expiresAt: number | null; }
