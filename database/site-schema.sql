-- database/site-schema.sql
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL DEFAULT 'ko',
    timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
    homepage_type TEXT NOT NULL DEFAULT 'posts',
    posts_per_page INTEGER NOT NULL DEFAULT 10,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    featured_image TEXT,
    author_id TEXT NOT NULL DEFAULT 'owner',
    published_at INTEGER,
    scheduled_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(status, published_at DESC);

CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cat_slug ON categories(slug);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_tag_slug ON tags(slug);

CREATE TABLE IF NOT EXISTS post_categories (
    post_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_url TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    parent_id TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS menus (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    menu_id TEXT NOT NULL,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    parent_id TEXT,
    target TEXT NOT NULL DEFAULT '_self',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON menu_items(menu_id);

CREATE TABLE IF NOT EXISTS redirects (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 301
);

CREATE TABLE IF NOT EXISTS seo_meta (
    id TEXT PRIMARY KEY,
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    robots TEXT NOT NULL DEFAULT 'index, follow',
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
    focus_keyword TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(object_type, object_id)
);

CREATE TABLE IF NOT EXISTS schemas (
    id TEXT PRIMARY KEY,
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    schema_type TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(object_type, object_id, schema_type)
);

CREATE TABLE IF NOT EXISTS analytics_daily (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    pageviews INTEGER NOT NULL DEFAULT 0,
    visitors INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS search_logs (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    author TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS theme_files (
    id TEXT PRIMARY KEY,
    theme_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(theme_id, file_path)
);
CREATE INDEX IF NOT EXISTS idx_tf_theme ON theme_files(theme_id);

CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    deployed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    backup_id TEXT NOT NULL UNIQUE,
    backup_location TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS ai_generations (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'latest',
    source TEXT NOT NULL DEFAULT 'wordpress.org',
    download_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    requires_php_wasm INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_plugins_active ON plugins(is_active);

CREATE TABLE IF NOT EXISTS marketplace_cache (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL,
    query TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_marketplace_cache_lookup ON marketplace_cache(asset_type, query, created_at DESC);

CREATE TABLE IF NOT EXISTS php_wasm_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    asset_type TEXT,
    asset_id TEXT,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
