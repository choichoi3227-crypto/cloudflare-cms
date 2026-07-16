-- 유료 호스팅 단위 결제/플랜/관리자 디자인 설정
ALTER TABLE site_registry ADD COLUMN hosting_order_id TEXT;
ALTER TABLE site_registry ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'lite';
ALTER TABLE site_registry ADD COLUMN worker_load_balancing TEXT NOT NULL DEFAULT 'single';
CREATE INDEX IF NOT EXISTS idx_sites_hosting_order ON site_registry(hosting_order_id);

CREATE TABLE IF NOT EXISTS hosting_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hosting_id TEXT,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('lite','standard','smart','intelligent')),
    product_id TEXT NOT NULL,
    billing_number TEXT NOT NULL UNIQUE,
    amount_krw INTEGER NOT NULL,
    amount_usd REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_provider TEXT NOT NULL DEFAULT 'paypal',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','cancelled')),
    paypal_order_id TEXT UNIQUE,
    paid_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_hosting_orders_user_status ON hosting_orders(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_hosting_orders_billing_number ON hosting_orders(billing_number);

CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    is_secret INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS site_design_settings (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'global',
    settings_json TEXT NOT NULL,
    updated_by TEXT REFERENCES users(id),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
