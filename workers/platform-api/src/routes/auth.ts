import type { Env } from '../types';
import { AuthService } from '../services/auth.service';
import { SocialAuthService } from '../services/social-auth.service';
import { success, error } from '../utils/response';
import { AppError, ValidationError } from '../utils/errors';

function authServiceFrom(env: Env): AuthService {
  return new AuthService({
    db: env.DB,
    appSecret: env.ENCRYPTION_SECRET,
    resendApiKey: env.RESEND_API_KEY,
    resendFromEmail: env.RESEND_FROM_EMAIL,
    publicSiteUrl: env.PUBLIC_SITE_URL,
  });
}

function socialAuthServiceFrom(env: Env): SocialAuthService {
  return new SocialAuthService({
    db: env.DB,
    appSecret: env.ENCRYPTION_SECRET,
    resendApiKey: env.RESEND_API_KEY,
    resendFromEmail: env.RESEND_FROM_EMAIL,
    publicSiteUrl: env.PUBLIC_SITE_URL,
  });
}

function handleAuthError(err: unknown, fallbackCode: string, fallbackMessage: string): Response {
  if (err instanceof ValidationError) return error(err.code, err.message, err.status, err.details);
  if (err instanceof AppError) return error(err.code, err.message, err.status);
  console.error(fallbackCode, err);
  return error(fallbackCode, fallbackMessage, 500);
}

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      password?: string;
      cfAccountEmail?: string;
      cfGlobalApiKey?: string;
      referredByCode?: string | null;
    };
    if (!body.email || !body.username || !body.password || !body.cfAccountEmail || !body.cfGlobalApiKey) {
      return error('VALIDATION_ERROR', '필수 입력값이 누락되었습니다.', 400);
    }
    const { user } = await authServiceFrom(env).register({
      email: body.email,
      username: body.username,
      password: body.password,
      cfAccountEmail: body.cfAccountEmail,
      cfGlobalApiKey: body.cfGlobalApiKey,
      referredByCode: body.referredByCode ?? null,
    });
    return success({ user, message: '인증 메일을 발송했습니다. 받은 편지함을 확인해주세요.' }, 201);
  } catch (err) {
    return handleAuthError(err, 'REGISTER_ERROR', '회원가입 처리 중 오류가 발생했습니다.');
  }
}

export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { token?: string };
    if (!body.token) return error('VALIDATION_ERROR', '인증 토큰이 없습니다.', 400);
    const { user } = await authServiceFrom(env).verifyEmail(body.token);
    return success({ user });
  } catch (err) {
    return handleAuthError(err, 'VERIFY_EMAIL_ERROR', '이메일 인증 처리 중 오류가 발생했습니다.');
  }
}

export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email) return error('VALIDATION_ERROR', '이메일을 입력해주세요.', 400);
    await authServiceFrom(env).resendVerificationEmail(body.email);
    // 계정 존재 여부를 노출하지 않기 위해 항상 동일한 성공 응답을 반환합니다.
    return success({ message: '인증 메일을 발송했습니다. 받은 편지함을 확인해주세요.' });
  } catch (err) {
    return handleAuthError(err, 'RESEND_VERIFICATION_ERROR', '인증 메일 재발송 중 오류가 발생했습니다.');
  }
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) return error('VALIDATION_ERROR', '이메일과 비밀번호를 입력해주세요.', 400);
    const { user } = await authServiceFrom(env).login(body.email, body.password);
    return success({ user });
  } catch (err) {
    return handleAuthError(err, 'LOGIN_ERROR', '로그인 처리 중 오류가 발생했습니다.');
  }
}

export async function handleSocialCallback(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      provider?: 'google' | 'github';
      providerUserId?: string;
      email?: string;
      name?: string;
      avatarUrl?: string | null;
      accessToken?: string;
      refreshToken?: string | null;
      expiresAt?: number | null;
    };
    if (!body.provider || !body.providerUserId || !body.email || !body.accessToken) {
      return error('VALIDATION_ERROR', '소셜 로그인 정보가 누락되었습니다.', 400);
    }
    const { user } = await socialAuthServiceFrom(env).handleSocialCallback({
      provider: body.provider,
      providerUserId: body.providerUserId,
      email: body.email,
      name: body.name || body.email.split('@')[0],
      avatarUrl: body.avatarUrl ?? null,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken ?? null,
      expiresAt: body.expiresAt ?? null,
    });
    return success({ user });
  } catch (err) {
    return handleAuthError(err, 'SOCIAL_CALLBACK_ERROR', '소셜 로그인 처리 중 오류가 발생했습니다.');
  }
}

export async function handleCompleteCfKeySetup(request: Request, env: Env): Promise<Response> {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) return error('UNAUTHORIZED', '로그인이 필요합니다.', 401);
    const body = (await request.json()) as { cfAccountEmail?: string; cfGlobalApiKey?: string; referredByCode?: string | null };
    if (!body.cfAccountEmail || !body.cfGlobalApiKey) {
      return error('VALIDATION_ERROR', 'Cloudflare 계정 이메일과 Global API 키를 입력해주세요.', 400);
    }
    const { user } = await socialAuthServiceFrom(env).completeCfKeySetup(userId, {
      cfAccountEmail: body.cfAccountEmail,
      cfGlobalApiKey: body.cfGlobalApiKey,
      referredByCode: body.referredByCode ?? null,
    });
    return success({ user });
  } catch (err) {
    return handleAuthError(err, 'COMPLETE_CF_KEY_ERROR', 'Cloudflare API 키 등록 중 오류가 발생했습니다.');
  }
}
