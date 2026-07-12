// workers/platform-api/src/routes/auth.ts
import type { Env } from '../types';
import { OAuthService } from '../services/oauth.service';
import { success, error } from '../utils/response';
import { isEmail } from '@shared/utils/validation';

export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { cfAccountId:string; email:string; username:string; avatarUrl:string|null; oauthToken:string; refreshToken:string|null; expiresAt:number|null };
    if (!body.cfAccountId || !body.email || !body.oauthToken) return error('VALIDATION_ERROR', '필수 항목이 누락되었습니다.');
    if (!isEmail(body.email)) return error('VALIDATION_ERROR', '올바른 이메일 형식이 아닙니다.');
    const service = new OAuthService(env.DB);
    const user = await service.handleCallback(body);
    return success({ id:user.id, email:user.email, username:user.username, avatar_url:user.avatar_url });
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) return error('CONFLICT','이미 등록된 계정입니다.',409);
    return error('INTERNAL_ERROR','서버 오류가 발생했습니다.',500);
  }
}
