// workers/platform-api/src/repositories/user.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';
import type { User, CloudflareAccount } from '@shared/types/user';

export class UserRepository {
  constructor(private db: D1Database) {}
  async findById(id: string): Promise<User | null> { return this.db.prepare('SELECT id,email,username,avatar_url,status,created_at,updated_at FROM users WHERE id=?').bind(id).first<User>(); }
  async findByEmail(email: string): Promise<User | null> { return this.db.prepare('SELECT id,email,username,avatar_url,status,created_at,updated_at FROM users WHERE email=?').bind(email).first<User>(); }
  async findByUsername(username: string): Promise<User | null> { return this.db.prepare('SELECT id,email,username,avatar_url,status,created_at,updated_at FROM users WHERE username=?').bind(username).first<User>(); }
  async findAll(limit = 50, offset = 0): Promise<User[]> {
    const r = await this.db.prepare('SELECT id,email,username,avatar_url,status,created_at,updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all<User>();
    return r.results;
  }
  async count(): Promise<number> {
    const row = await this.db.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
    return row?.c ?? 0;
  }
  async create(data: { email:string; username:string; avatar_url:string|null }): Promise<User> {
    const id = generateId('usr'); const ts = now();
    await this.db.prepare('INSERT INTO users (id,email,username,avatar_url,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,data.email,data.username,data.avatar_url,'active',ts,ts).run();
    return { id, email:data.email, username:data.username, avatar_url:data.avatar_url, status:'active', created_at:ts, updated_at:ts };
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
