-- database/migrations/0001_email_auth_and_cf_key.sql
-- 기존에 이미 배포된 D1 DB에 적용하는 마이그레이션입니다.
-- 신규 설치라면 database/platform-schema.sql 하나만 실행하면 되고, 이 파일은 필요 없습니다.
--
-- 실행 예:
--   wrangler d1 execute cloudpress_platform --file=./database/migrations/0001_email_auth_and_cf_key.sql --remote

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email';
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by_code TEXT;
ALTER TABLE users ADD COLUMN cf_global_api_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN cf_account_email TEXT;

-- 기존에 Cloudflare OAuth로 이미 가입한 사용자는 이메일 인증을 다시 요구하지 않습니다.
UPDATE users SET email_verified = 1, auth_provider = 'cloudflare_oauth' WHERE id IN (
  SELECT user_id FROM user_cloudflare_accounts
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_token_hash ON email_verifications(token_hash);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);

-- Google / GitHub 소셜 로그인 연동
CREATE TABLE IF NOT EXISTS user_social_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_provider_uid ON user_social_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON user_social_accounts(user_id);
