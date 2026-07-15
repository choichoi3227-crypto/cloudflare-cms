// workers/platform-api/src/services/auth.service.ts
import type { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../repositories/user.repository';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { EmailService } from './email.service';
import { verifyCloudflareGlobalApiKey } from './cf-key-verify.service';
import { hashPassword, verifyPassword, encryptApiKey, generateVerificationToken, hashToken } from '../utils/crypto';
import { ConflictError, ValidationError, AppError } from '../utils/errors';
import { isEmail } from '@shared/utils/validation';
import { generateId } from '@shared/utils/id';
import type { User } from '@shared/types/user';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  cfAccountEmail: string;
  cfGlobalApiKey: string;
  referredByCode?: string | null;
}

export interface AuthServiceDeps {
  db: D1Database;
  appSecret: string; // Global API 키 암호화용 시크릿 (ENCRYPTION_SECRET)
  resendApiKey: string;
  resendFromEmail: string;
  publicSiteUrl: string; // 인증 링크 베이스 URL, 예: https://cloud-press.co.kr
}

/** 사람이 읽기 쉬운 8자리 추천인 코드를 생성하고, 충돌 시 재시도합니다. */
export async function generateUniqueReferralCode(userRepo: UserRepository): Promise<string> {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되기 쉬운 0/O, 1/I 제외
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join('');
    const existing = await userRepo.findByReferralCode(code);
    if (!existing) return code;
  }
  return generateId('r').replace('r_', '').slice(0, 10).toUpperCase();
}

export class AuthService {
  private userRepo: UserRepository;
  private verificationRepo: EmailVerificationRepository;
  private emailService: EmailService;

  constructor(private deps: AuthServiceDeps) {
    this.userRepo = new UserRepository(deps.db);
    this.verificationRepo = new EmailVerificationRepository(deps.db);
    this.emailService = new EmailService({ apiKey: deps.resendApiKey, fromEmail: deps.resendFromEmail });
  }

  async register(input: RegisterInput): Promise<{ user: User }> {
    const details: Record<string, string[]> = {};
    if (!isEmail(input.email)) details.email = ['올바른 이메일 형식이 아닙니다.'];
    if (!input.username || input.username.trim().length < 2) details.username = ['닉네임은 2자 이상이어야 합니다.'];
    if (!input.password || input.password.length < 8) details.password = ['비밀번호는 8자 이상이어야 합니다.'];
    if (!isEmail(input.cfAccountEmail)) details.cfAccountEmail = ['Cloudflare 계정 이메일 형식이 올바르지 않습니다.'];
    if (!input.cfGlobalApiKey || input.cfGlobalApiKey.trim().length < 20) details.cfGlobalApiKey = ['Cloudflare Global API 키를 정확히 입력해주세요.'];
    if (Object.keys(details).length > 0) throw new ValidationError(details);

    const existingEmail = await this.userRepo.findByEmail(input.email);
    if (existingEmail) throw new ConflictError('이미 가입된 이메일입니다.');
    const existingUsername = await this.userRepo.findByUsername(input.username);
    if (existingUsername) throw new ConflictError('이미 사용 중인 닉네임입니다.');

    // Cloudflare Global API 키가 실제로 유효한지 검증합니다.
    // (이 키는 이후 워드프레스/호스팅/DNS 등 인프라 리소스 프로비저닝에 사용됩니다.)
    const keyCheck = await verifyCloudflareGlobalApiKey(input.cfAccountEmail, input.cfGlobalApiKey);
    if (!keyCheck.valid) {
      throw new ValidationError({ cfGlobalApiKey: [keyCheck.errorMessage ?? 'Cloudflare Global API 키 검증에 실패했습니다.'] });
    }

    // 추천인 코드 검증 (선택 입력)
    let referredByCode: string | null = null;
    if (input.referredByCode && input.referredByCode.trim()) {
      const referrer = await this.userRepo.findByReferralCode(input.referredByCode.trim());
      if (!referrer) throw new ValidationError({ referredByCode: ['유효하지 않은 추천인 코드입니다.'] });
      referredByCode = input.referredByCode.trim();
    }

    const passwordHash = await hashPassword(input.password);
    const cfGlobalApiKeyEncrypted = await encryptApiKey(input.cfGlobalApiKey, this.deps.appSecret);
    const referralCode = await generateUniqueReferralCode(this.userRepo);

    const user = await this.userRepo.createWithPassword({
      email: input.email,
      username: input.username,
      passwordHash,
      authProvider: 'email',
      referralCode,
      referredByCode,
      cfAccountEmail: input.cfAccountEmail,
      cfGlobalApiKeyEncrypted,
    });

    await this.sendVerificationEmail(user);
    return { user };
  }

  async sendVerificationEmail(user: User): Promise<void> {
    // 재발송 시 기존에 발급된 미사용 토큰은 모두 무효화합니다 (한 번에 하나의 링크만 유효).
    await this.verificationRepo.invalidateAllForUser(user.id);
    const token = generateVerificationToken();
    const tokenHash = await hashToken(token);
    await this.verificationRepo.create(user.id, tokenHash);
    const verifyUrl = `${this.deps.publicSiteUrl}/auth/verify-email?token=${token}`;
    await this.emailService.sendVerificationEmail({ to: user.email, username: user.username, verifyUrl });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    // 계정 존재 여부를 노출하지 않기 위해 없는 경우에도 조용히 성공 처리합니다.
    if (!user || user.email_verified) return;
    await this.sendVerificationEmail(user);
  }

  async verifyEmail(token: string): Promise<{ user: User }> {
    if (!token) throw new ValidationError({ token: ['인증 토큰이 없습니다.'] });
    const tokenHash = await hashToken(token);
    const record = await this.verificationRepo.findValidByTokenHash(tokenHash);
    if (!record) throw new AppError('INVALID_TOKEN', '인증 링크가 유효하지 않거나 만료되었습니다.', 400);

    await this.verificationRepo.consume(record.id);
    await this.userRepo.markEmailVerified(record.user_id);
    const user = await this.userRepo.findById(record.user_id);
    if (!user) throw new AppError('NOT_FOUND', '사용자를 찾을 수 없습니다.', 404);
    return { user };
  }

  async login(email: string, password: string): Promise<{ user: User }> {
    if (!isEmail(email) || !password) {
      throw new ValidationError({ email: ['이메일과 비밀번호를 입력해주세요.'] });
    }
    const user = await this.userRepo.findByEmailWithSecrets(email);
    // 사용자 존재 여부를 알려주지 않기 위해 동일한 에러 메시지를 사용합니다.
    const invalidCredentials = () => new AppError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.', 401);

    if (!user || !user.password_hash) throw invalidCredentials();
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw invalidCredentials();

    if (!user.email_verified) {
      throw new AppError('EMAIL_NOT_VERIFIED', '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.', 403);
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
      throw new AppError('ACCOUNT_DISABLED', '이용이 제한된 계정입니다. 고객센터로 문의해주세요.', 403);
    }

    const { password_hash, cf_global_api_key_encrypted, ...publicUser } = user;
    return { user: publicUser };
  }
}
