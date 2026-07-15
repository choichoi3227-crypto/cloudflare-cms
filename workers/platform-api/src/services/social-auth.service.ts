// workers/platform-api/src/services/social-auth.service.ts
import type { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../repositories/user.repository';
import { SocialAccountRepository } from '../repositories/social-account.repository';
import { generateUniqueReferralCode } from './auth.service';
import { verifyCloudflareGlobalApiKey } from './cf-key-verify.service';
import { encryptApiKey } from '../utils/crypto';
import { ValidationError, ConflictError } from '../utils/errors';
import { isEmail } from '@shared/utils/validation';
import type { User } from '@shared/types/user';

export interface SocialAuthServiceDeps {
  db: D1Database;
  appSecret: string;
}

export class SocialAuthService {
  private userRepo: UserRepository;
  private socialRepo: SocialAccountRepository;

  constructor(private deps: SocialAuthServiceDeps) {
    this.userRepo = new UserRepository(deps.db);
    this.socialRepo = new SocialAccountRepository(deps.db);
  }

  /**
   * 소셜 로그인 콜백 처리. 기존에 연동된 계정이면 로그인, 처음이면 신규 가입(CF 키는 아직 미입력 상태)합니다.
   * 동일 이메일로 이미 이메일/비밀번호 계정이 존재하는 경우, 계정 탈취를 방지하기 위해
   * 자동으로 연결하지 않고 명확한 에러를 반환합니다 (사용자가 기존 이메일 계정으로 로그인 후 연동해야 함 — 추후 단계).
   */
  async handleSocialCallback(params: {
    provider: 'google' | 'github';
    providerUserId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number | null;
  }): Promise<{ user: User }> {
    const existingSocial = await this.socialRepo.findByProviderUserId(params.provider, params.providerUserId);
    if (existingSocial) {
      await this.socialRepo.updateToken(existingSocial.id, params.accessToken, params.refreshToken, params.expiresAt);
      const user = await this.userRepo.findById(existingSocial.user_id);
      if (!user) throw new ConflictError('사용자 계정을 찾을 수 없습니다.');
      return { user };
    }

    const existingByEmail = await this.userRepo.findByEmail(params.email);
    if (existingByEmail) {
      throw new ConflictError(
        `이미 ${params.email} 이메일로 가입된 계정이 있습니다. 이메일/비밀번호로 로그인해주세요.`
      );
    }

    let base = params.name.replace(/[^a-zA-Z0-9가-힣_]/g, '').substring(0, 20) || 'user';
    let username = base;
    let counter = 1;
    while (await this.userRepo.findByUsername(username)) username = `${base}${counter++}`;

    const user = await this.userRepo.createFromSocial({
      email: params.email,
      username,
      avatarUrl: params.avatarUrl,
      authProvider: params.provider,
    });
    await this.socialRepo.create({
      userId: user.id,
      provider: params.provider,
      providerUserId: params.providerUserId,
      email: params.email,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
    });
    return { user };
  }

  /**
   * 소셜 가입 사용자가 'CF 키 입력' 중간 페이지에서 Global API 키를 등록해
   * 가입을 완료(status: pending_cf_key -> active)합니다.
   */
  async completeCfKeySetup(
    userId: string,
    input: { cfAccountEmail: string; cfGlobalApiKey: string; referredByCode?: string | null }
  ): Promise<{ user: User }> {
    const details: Record<string, string[]> = {};
    if (!isEmail(input.cfAccountEmail)) details.cfAccountEmail = ['Cloudflare 계정 이메일 형식이 올바르지 않습니다.'];
    if (!input.cfGlobalApiKey || input.cfGlobalApiKey.trim().length < 20) details.cfGlobalApiKey = ['Cloudflare Global API 키를 정확히 입력해주세요.'];
    if (Object.keys(details).length > 0) throw new ValidationError(details);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new ConflictError('사용자를 찾을 수 없습니다.');
    if (user.status !== 'pending_cf_key') {
      // 이미 완료된 사용자가 다시 호출한 경우 등 — 별다른 부작용 없이 현재 상태를 반환합니다.
      return { user };
    }

    const keyCheck = await verifyCloudflareGlobalApiKey(input.cfAccountEmail, input.cfGlobalApiKey);
    if (!keyCheck.valid) {
      throw new ValidationError({ cfGlobalApiKey: [keyCheck.errorMessage ?? 'Cloudflare Global API 키 검증에 실패했습니다.'] });
    }

    let referredByCode: string | null = null;
    if (input.referredByCode && input.referredByCode.trim()) {
      const referrer = await this.userRepo.findByReferralCode(input.referredByCode.trim());
      if (!referrer) throw new ValidationError({ referredByCode: ['유효하지 않은 추천인 코드입니다.'] });
      referredByCode = input.referredByCode.trim();
    }

    const cfGlobalApiKeyEncrypted = await encryptApiKey(input.cfGlobalApiKey, this.deps.appSecret);
    const referralCode = await generateUniqueReferralCode(this.userRepo);

    await this.userRepo.completeCfKeySetup(userId, { cfAccountEmail: input.cfAccountEmail, cfGlobalApiKeyEncrypted, referralCode, referredByCode });
    const updatedUser = await this.userRepo.findById(userId);
    if (!updatedUser) throw new ConflictError('사용자를 찾을 수 없습니다.');
    return { user: updatedUser };
  }
}
