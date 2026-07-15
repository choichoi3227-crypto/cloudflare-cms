// workers/platform-api/src/repositories/social-account.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';
import type { SocialAccount } from '@shared/types/user';

export class SocialAccountRepository {
  constructor(private db: D1Database) {}

  async findByProviderUserId(provider: string, providerUserId: string): Promise<SocialAccount | null> {
    const row = await this.db
      .prepare('SELECT id,user_id,provider,provider_user_id,email,created_at,updated_at FROM user_social_accounts WHERE provider=? AND provider_user_id=?')
      .bind(provider, providerUserId)
      .first<SocialAccount>();
    return row ?? null;
  }

  async create(data: {
    userId: string;
    provider: 'google' | 'github';
    providerUserId: string;
    email: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number | null;
  }): Promise<SocialAccount> {
    const id = generateId('soc');
    const ts = now();
    await this.db
      .prepare(
        `INSERT INTO user_social_accounts
          (id,user_id,provider,provider_user_id,email,access_token,refresh_token,expires_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(id, data.userId, data.provider, data.providerUserId, data.email, data.accessToken, data.refreshToken, data.expiresAt, ts, ts)
      .run();
    return { id, user_id: data.userId, provider: data.provider, provider_user_id: data.providerUserId, email: data.email, created_at: ts, updated_at: ts };
  }

  async updateToken(id: string, accessToken: string, refreshToken: string | null, expiresAt: number | null): Promise<void> {
    await this.db
      .prepare('UPDATE user_social_accounts SET access_token=?, refresh_token=?, expires_at=?, updated_at=? WHERE id=?')
      .bind(accessToken, refreshToken, expiresAt, now(), id)
      .run();
  }
}
