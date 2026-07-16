// workers/platform-api/src/repositories/user.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';
import type { User, CloudflareAccount, AuthProvider } from '@shared/types/user';

// 공개 User 필드 (비밀번호 해시, CF API 키 암호문 등 민감정보 제외)
const PUBLIC_USER_COLUMNS = 'id,email,username,avatar_url,status,auth_provider,email_verified,referral_code,referred_by_code,cf_account_email,created_at,updated_at';

// 내부 인증 처리용: 비밀번호 해시, CF Global API 키 암호문 포함
export interface UserWithSecrets extends User {
  password_hash: string | null;
  cf_global_api_key_encrypted: string | null;
}

function toUser(row: any): User {
  return { ...row, email_verified: !!row.email_verified };
}

export class UserRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id=?`).bind(id).first();
    return row ? toUser(row) : null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE email=?`).bind(email).first();
    return row ? toUser(row) : null;
  }
  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE username=?`).bind(username).first();
    return row ? toUser(row) : null;
  }
  async findByReferralCode(code: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE referral_code=?`).bind(code).first();
    return row ? toUser(row) : null;
  }
  /** 로그인 시에만 사용: 비밀번호 해시를 포함한 전체 레코드를 조회합니다. */
  async findByEmailWithSecrets(email: string): Promise<UserWithSecrets | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS},password_hash,cf_global_api_key_encrypted FROM users WHERE email=?`).bind(email).first();
    return row ? (toUser(row) as UserWithSecrets) : null;
  }
  async findByIdWithSecrets(id: string): Promise<UserWithSecrets | null> {
    const row = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS},password_hash,cf_global_api_key_encrypted FROM users WHERE id=?`).bind(id).first();
    return row ? (toUser(row) as UserWithSecrets) : null;
  }
  async findAll(limit = 50, offset = 0): Promise<User[]> {
    const r = await this.db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return r.results.map(toUser);
  }
  async count(): Promise<number> {
    const row = await this.db.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
    return row?.c ?? 0;
  }

  /** 이메일/비밀번호 회원가입. 이메일 인증 전까지는 status='pending_verification'. */
  async createWithPassword(data: {
    email: string;
    username: string;
    passwordHash: string;
    authProvider: AuthProvider;
    referralCode: string;
    referredByCode: string | null;
    cfAccountEmail: string;
    cfGlobalApiKeyEncrypted: string;
  }): Promise<User> {
    const id = generateId('usr'); const ts = now();
    await this.db.prepare(
      `INSERT INTO users
        (id,email,username,avatar_url,status,password_hash,auth_provider,email_verified,referral_code,referred_by_code,cf_global_api_key_encrypted,cf_account_email,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, data.email, data.username, null, 'pending_verification', data.passwordHash, data.authProvider, 0,
      data.referralCode, data.referredByCode, data.cfGlobalApiKeyEncrypted, data.cfAccountEmail, ts, ts
    ).run();
    return {
      id, email: data.email, username: data.username, avatar_url: null, status: 'pending_verification',
      auth_provider: data.authProvider, email_verified: false, referral_code: data.referralCode,
      referred_by_code: data.referredByCode, cf_account_email: data.cfAccountEmail, created_at: ts, updated_at: ts,
    };
  }

  /**
   * 소셜(Google/GitHub) 최초 가입. 요구사항상 소셜 가입도 서비스 이메일 인증을
   * 완료해야 하므로 email_verified=0으로 시작합니다.
   */
  async createFromSocial(data: { email: string; username: string; avatarUrl: string | null; authProvider: 'google' | 'github' }): Promise<User> {
    const id = generateId('usr'); const ts = now();
    await this.db.prepare(
      `INSERT INTO users (id,email,username,avatar_url,status,auth_provider,email_verified,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(id, data.email, data.username, data.avatarUrl, 'pending_cf_key', data.authProvider, 0, ts, ts).run();
    return {
      id, email: data.email, username: data.username, avatar_url: data.avatarUrl, status: 'pending_cf_key',
      auth_provider: data.authProvider, email_verified: false, referral_code: null, referred_by_code: null,
      cf_account_email: null, created_at: ts, updated_at: ts,
    };
  }

  /** 소셜 가입 사용자가 CF Global API 키 입력을 완료하면 호출합니다. 이메일 인증 전이면 pending_verification을 유지합니다. */
  async completeCfKeySetup(userId: string, data: { cfAccountEmail: string; cfGlobalApiKeyEncrypted: string; referralCode: string; referredByCode: string | null; emailVerified: boolean }): Promise<void> {
    await this.db.prepare(
      `UPDATE users SET status=?, cf_account_email=?, cf_global_api_key_encrypted=?, referral_code=?, referred_by_code=?, updated_at=? WHERE id=?`
    ).bind(data.emailVerified ? 'active' : 'pending_verification', data.cfAccountEmail, data.cfGlobalApiKeyEncrypted, data.referralCode, data.referredByCode, now(), userId).run();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.prepare(`UPDATE users SET status=CASE WHEN cf_global_api_key_encrypted IS NULL THEN 'pending_cf_key' ELSE 'active' END, email_verified=1, updated_at=? WHERE id=?`).bind(now(), userId).run();
  }
}

export class CloudflareAccountRepository {
  constructor(private db: D1Database) {}
  async findByUserId(userId: string): Promise<CloudflareAccount | null> { return this.db.prepare('SELECT * FROM user_cloudflare_accounts WHERE user_id=?').bind(userId).first<CloudflareAccount>(); }
  async findByCfAccountId(cfAccountId: string): Promise<CloudflareAccount | null> { return this.db.prepare('SELECT * FROM user_cloudflare_accounts WHERE cloudflare_account_id=?').bind(cfAccountId).first<CloudflareAccount>(); }
  async create(data: { user_id:string; cloudflare_account_id:string; email:string; oauth_token:string; refresh_token:string|null; expires_at:number|null }): Promise<CloudflareAccount> {
    const id = generateId('cfa'); const ts = now();
    await this.db.prepare('INSERT INTO user_cloudflare_accounts (id,user_id,cloudflare_account_id,email,oauth_token,refresh_token,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,data.user_id,data.cloudflare_account_id,data.email,data.oauth_token,data.refresh_token,data.expires_at,ts,ts).run();
    return { id, user_id:data.user_id, cloudflare_account_id:data.cloudflare_account_id, email:data.email, oauth_token:data.oauth_token, refresh_token:data.refresh_token, expires_at:data.expires_at, created_at:ts, updated_at:ts };
  }
  async updateToken(id: string, oauthToken: string, refreshToken: string | null, expiresAt: number | null): Promise<void> {
    await this.db.prepare('UPDATE user_cloudflare_accounts SET oauth_token=?,refresh_token=?,expires_at=?,updated_at=? WHERE id=?').bind(oauthToken,refreshToken,expiresAt,now(),id).run();
  }
}
