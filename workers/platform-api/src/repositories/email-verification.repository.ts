// workers/platform-api/src/repositories/email-verification.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';

export interface EmailVerificationRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  consumed_at: number | null;
  created_at: number;
}

const VERIFICATION_TTL_SECONDS = 24 * 60 * 60; // 24시간

export class EmailVerificationRepository {
  constructor(private db: D1Database) {}

  async create(userId: string, tokenHash: string): Promise<EmailVerificationRecord> {
    const id = generateId('evt');
    const ts = now();
    const expiresAt = ts + VERIFICATION_TTL_SECONDS;
    await this.db
      .prepare('INSERT INTO email_verifications (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)')
      .bind(id, userId, tokenHash, expiresAt, ts)
      .run();
    return { id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt, consumed_at: null, created_at: ts };
  }

  async findValidByTokenHash(tokenHash: string): Promise<EmailVerificationRecord | null> {
    const row = await this.db
      .prepare('SELECT * FROM email_verifications WHERE token_hash=? AND consumed_at IS NULL AND expires_at > ?')
      .bind(tokenHash, now())
      .first<EmailVerificationRecord>();
    return row ?? null;
  }

  async consume(id: string): Promise<void> {
    await this.db.prepare('UPDATE email_verifications SET consumed_at=? WHERE id=?').bind(now(), id).run();
  }

  /** 재발송 시 기존 미사용 토큰들을 무효화합니다. */
  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db.prepare('UPDATE email_verifications SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now(), userId).run();
  }
}
