// workers/platform-api/src/services/oauth.service.ts
import type { D1Database } from '@cloudflare/workers-types';
import { UserRepository, CloudflareAccountRepository } from '../repositories/user.repository';
import { ConflictError } from '../utils/errors';

export class OAuthService {
  private userRepo: UserRepository;
  private cfAccountRepo: CloudflareAccountRepository;
  constructor(private db: D1Database) { this.userRepo = new UserRepository(db); this.cfAccountRepo = new CloudflareAccountRepository(db); }

  async handleCallback(data: { cfAccountId:string; email:string; username:string; avatarUrl:string|null; oauthToken:string; refreshToken:string|null; expiresAt:number|null }) {
    const existingCf = await this.cfAccountRepo.findByCfAccountId(data.cfAccountId);
    if (existingCf) {
      await this.cfAccountRepo.updateToken(existingCf.id, data.oauthToken, data.refreshToken, data.expiresAt);
      const user = await this.userRepo.findById(existingCf.user_id);
      if (!user) throw new ConflictError('사용자 계정을 찾을 수 없습니다.');
      return user;
    }
    let user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      let base = data.username.replace(/[^a-zA-Z0-9가-힣_]/g,'').substring(0,20) || 'user';
      let username = base; let c = 1;
      while (await this.userRepo.findByUsername(username)) { username = `${base}${c++}`; }
      user = await this.userRepo.create({ email:data.email, username, avatarUrl:data.avatarUrl });
    }
    await this.cfAccountRepo.create({ user_id:user.id, cloudflare_account_id:data.cfAccountId, email:data.email, oauth_token:data.oauthToken, refresh_token:data.refreshToken, expires_at:data.expiresAt });
    return user;
  }
}
