-- database/platform-schema.sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

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