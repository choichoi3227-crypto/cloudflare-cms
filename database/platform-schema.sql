-- database/platform-schema.sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    -- 이메일/비밀번호 인증 (auth_provider='email'일 때 필수)
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email', -- 'email' | 'google' | 'github'
    email_verified INTEGER NOT NULL DEFAULT 0,
    -- 추천인 코드: 본인이 발급받는 코드, 그리고 가입 시 입력한 추천인의 코드
    referral_code TEXT,
    referred_by_code TEXT,
    -- 회원가입 시 사용자가 직접 입력하는 Cloudflare Global API 키
    -- (워드프레스/호스팅/DNS 등 인프라 리소스 프로비저닝에 사용됨). AES-GCM으로 암호화 저장.
    cf_global_api_key_encrypted TEXT,
    cf_account_email TEXT, -- Global API 키와 짝을 이루는 Cloudflare 계정 이메일 (X-Auth-Email)
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 이메일 인증 토큰
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

-- 비밀번호 재설정 토큰 (이번 단계에서 스키마만 준비, 라우트는 이후 단계)
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

CREATE TABLE IF NOT EXISTS user_cloudflare_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cloudflare_account_id TEXT NOT NULL,
    email TEXT NOT NULL,
    oauth_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_accounts_cf_id ON user_cloudflare_accounts(cloudflare_account_id);
CREATE INDEX IF NOT EXISTS idx_cf_accounts_user ON user_cloudflare_accounts(user_id);

-- Google / GitHub 소셜 로그인 연동 (provider별 1계정 1레코드)
CREATE TABLE IF NOT EXISTS user_social_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google' | 'github'
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

-- 신규: Google Blogger 연동 설정 테이블
CREATE TABLE IF NOT EXISTS user_blogger_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'blogger',
    blog_id TEXT NOT NULL,
    blog_name TEXT,
    blog_url TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_blogger_user ON user_blogger_connections(user_id);

CREATE TABLE IF NOT EXISTS site_registry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    blogger_blog_id TEXT,
    media_provider TEXT NOT NULL DEFAULT 'blogger',
    blogger_media_policy TEXT NOT NULL DEFAULT 'googleusercontent',
    status TEXT NOT NULL DEFAULT 'provisioning',
    worker_id TEXT,
    d1_id TEXT,
    kv_id TEXT,
    wordpress_admin_username TEXT,
    wordpress_admin_password_hash TEXT,
    wordpress_admin_password_hint TEXT,
    php_wasm_worker_name TEXT,
    shard_count INTEGER NOT NULL DEFAULT 10,
    active_shard_key TEXT NOT NULL DEFAULT 'database01.db',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sites_user ON site_registry(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_domain ON site_registry(domain);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    metadata TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read_status INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- WordPress hosting provisioning metadata

CREATE TABLE IF NOT EXISTS workers_registry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_name TEXT NOT NULL,
    worker_domain TEXT NOT NULL,
    worker_type TEXT NOT NULL DEFAULT 'site',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_workers_registry_user ON workers_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_registry_type ON workers_registry(worker_type, status);

CREATE TABLE IF NOT EXISTS wordpress_shards (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES site_registry(id) ON DELETE CASCADE,
    shard_key TEXT NOT NULL,
    database_name TEXT NOT NULL,
    durable_object_id TEXT,
    role TEXT NOT NULL DEFAULT 'content',
    weight INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(site_id, shard_key)
);
CREATE INDEX IF NOT EXISTS idx_wordpress_shards_site_status ON wordpress_shards(site_id, status);