import type { Env } from '../types';
import { OAuthService } from '../services/oauth.service';
import { success, error } from '../utils/response';

export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      cfAccountId?: string;
      email?: string;
      username?: string;
      avatarUrl?: string | null;
      oauthToken?: string;
      refreshToken?: string | null;
      expiresAt?: number | null;
    };
    if (!body.cfAccountId || !body.email || !body.username || !body.oauthToken) {
      return error('VALIDATION_ERROR', 'Cloudflare 계정 정보가 누락되었습니다.');
    }
    const user = await new OAuthService(env.DB).handleCallback({
      cfAccountId: body.cfAccountId,
      email: body.email,
      username: body.username,
      avatarUrl: body.avatarUrl ?? null,
      oauthToken: body.oauthToken,
      refreshToken: body.refreshToken ?? null,
      expiresAt: body.expiresAt ?? null,
    });
    return success(user);
  } catch (err) {
    return error('AUTH_CALLBACK_ERROR', err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.', 500);
  }
}
