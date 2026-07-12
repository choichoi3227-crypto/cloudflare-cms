-- WordPress-compatible site schema for Cloudflare SQLite/Durable Objects shards.
-- All WordPress tables use the cp_* prefix as the canonical prefix.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cp_options (
  option_id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_name TEXT NOT NULL UNIQUE,
  option_value TEXT NOT NULL DEFAULT '',
  autoload TEXT NOT NULL DEFAULT 'yes'
);
CREATE INDEX IF NOT EXISTS idx_cp_options_autoload ON cp_options(autoload);

CREATE TABLE IF NOT EXISTS cp_users (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  user_login TEXT NOT NULL UNIQUE,
  user_pass TEXT NOT NULL,
  user_nicename TEXT NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  user_url TEXT NOT NULL DEFAULT '',
  user_registered TEXT NOT NULL DEFAULT (datetime('now')),
  user_activation_key TEXT NOT NULL DEFAULT '',
  user_status INTEGER NOT NULL DEFAULT 0,
  display_name TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cp_users_login ON cp_users(user_login);

CREATE TABLE IF NOT EXISTS cp_usermeta (
  umeta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 0,
  meta_key TEXT,
  meta_value TEXT,
  FOREIGN KEY(user_id) REFERENCES cp_users(ID) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cp_usermeta_user_key ON cp_usermeta(user_id, meta_key);

CREATE TABLE IF NOT EXISTS cp_posts (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  post_author INTEGER NOT NULL DEFAULT 0,
  post_date TEXT NOT NULL DEFAULT (datetime('now')),
  post_date_gmt TEXT NOT NULL DEFAULT (datetime('now')),
  post_content TEXT NOT NULL DEFAULT '',
  post_title TEXT NOT NULL DEFAULT '',
  post_excerpt TEXT NOT NULL DEFAULT '',
  post_status TEXT NOT NULL DEFAULT 'draft',
  comment_status TEXT NOT NULL DEFAULT 'open',
  ping_status TEXT NOT NULL DEFAULT 'open',
  post_password TEXT NOT NULL DEFAULT '',
  post_name TEXT NOT NULL DEFAULT '',
  to_ping TEXT NOT NULL DEFAULT '',
  pinged TEXT NOT NULL DEFAULT '',
  post_modified TEXT NOT NULL DEFAULT (datetime('now')),
  post_modified_gmt TEXT NOT NULL DEFAULT (datetime('now')),
  post_content_filtered TEXT NOT NULL DEFAULT '',
  post_parent INTEGER NOT NULL DEFAULT 0,
  guid TEXT NOT NULL DEFAULT '',
  menu_order INTEGER NOT NULL DEFAULT 0,
  post_type TEXT NOT NULL DEFAULT 'post',
  post_mime_type TEXT NOT NULL DEFAULT '',
  comment_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cp_posts_name ON cp_posts(post_name);
CREATE INDEX IF NOT EXISTS idx_cp_posts_type_status_date ON cp_posts(post_type, post_status, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_cp_posts_author ON cp_posts(post_author);

CREATE TABLE IF NOT EXISTS cp_postmeta (
  meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL DEFAULT 0,
  meta_key TEXT,
  meta_value TEXT,
  FOREIGN KEY(post_id) REFERENCES cp_posts(ID) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cp_postmeta_post_key ON cp_postmeta(post_id, meta_key);

CREATE TABLE IF NOT EXISTS cp_terms (term_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL DEFAULT '', term_group INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_terms_slug ON cp_terms(slug);
CREATE TABLE IF NOT EXISTS cp_term_taxonomy (term_taxonomy_id INTEGER PRIMARY KEY AUTOINCREMENT, term_id INTEGER NOT NULL, taxonomy TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', parent INTEGER NOT NULL DEFAULT 0, count INTEGER NOT NULL DEFAULT 0, UNIQUE(term_id, taxonomy));
CREATE INDEX IF NOT EXISTS idx_cp_term_taxonomy_taxonomy ON cp_term_taxonomy(taxonomy);
CREATE TABLE IF NOT EXISTS cp_term_relationships (object_id INTEGER NOT NULL DEFAULT 0, term_taxonomy_id INTEGER NOT NULL DEFAULT 0, term_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(object_id, term_taxonomy_id));
CREATE TABLE IF NOT EXISTS cp_termmeta (meta_id INTEGER PRIMARY KEY AUTOINCREMENT, term_id INTEGER NOT NULL DEFAULT 0, meta_key TEXT, meta_value TEXT);
CREATE INDEX IF NOT EXISTS idx_cp_termmeta_term_key ON cp_termmeta(term_id, meta_key);

CREATE TABLE IF NOT EXISTS cp_comments (comment_ID INTEGER PRIMARY KEY AUTOINCREMENT, comment_post_ID INTEGER NOT NULL DEFAULT 0, comment_author TEXT NOT NULL DEFAULT '', comment_author_email TEXT NOT NULL DEFAULT '', comment_author_url TEXT NOT NULL DEFAULT '', comment_author_IP TEXT NOT NULL DEFAULT '', comment_date TEXT NOT NULL DEFAULT (datetime('now')), comment_date_gmt TEXT NOT NULL DEFAULT (datetime('now')), comment_content TEXT NOT NULL DEFAULT '', comment_karma INTEGER NOT NULL DEFAULT 0, comment_approved TEXT NOT NULL DEFAULT '1', comment_agent TEXT NOT NULL DEFAULT '', comment_type TEXT NOT NULL DEFAULT 'comment', comment_parent INTEGER NOT NULL DEFAULT 0, user_id INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_cp_comments_post ON cp_comments(comment_post_ID, comment_approved, comment_date_gmt);
CREATE TABLE IF NOT EXISTS cp_commentmeta (meta_id INTEGER PRIMARY KEY AUTOINCREMENT, comment_id INTEGER NOT NULL DEFAULT 0, meta_key TEXT, meta_value TEXT);
CREATE INDEX IF NOT EXISTS idx_cp_commentmeta_comment_key ON cp_commentmeta(comment_id, meta_key);

CREATE TABLE IF NOT EXISTS cp_links (link_id INTEGER PRIMARY KEY AUTOINCREMENT, link_url TEXT NOT NULL DEFAULT '', link_name TEXT NOT NULL DEFAULT '', link_image TEXT NOT NULL DEFAULT '', link_target TEXT NOT NULL DEFAULT '', link_description TEXT NOT NULL DEFAULT '', link_visible TEXT NOT NULL DEFAULT 'Y', link_owner INTEGER NOT NULL DEFAULT 1, link_rating INTEGER NOT NULL DEFAULT 0, link_updated TEXT NOT NULL DEFAULT (datetime('now')), link_rel TEXT NOT NULL DEFAULT '', link_notes TEXT NOT NULL DEFAULT '', link_rss TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS cp_ai_generations (id TEXT PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'aibp-pro', type TEXT NOT NULL, prompt TEXT NOT NULL, response TEXT NOT NULL, source_plugin TEXT NOT NULL DEFAULT 'aibp-pro.zip', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_schema_generations (id TEXT PRIMARY KEY, object_type TEXT NOT NULL, object_id TEXT NOT NULL, schema_json TEXT NOT NULL, source_plugin TEXT NOT NULL DEFAULT 'aibp-pro.zip', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_image_generations (id TEXT PRIMARY KEY, prompt TEXT NOT NULL, image_url TEXT NOT NULL, worker_url TEXT NOT NULL DEFAULT 'https://aibp100.jiji15899.workers.dev/', source_plugin TEXT NOT NULL DEFAULT 'aibp-pro.zip', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_cache_events (id TEXT PRIMARY KEY, cache_key TEXT NOT NULL, action TEXT NOT NULL, source_plugin TEXT NOT NULL DEFAULT 'wp-rocket-main.zip', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_plugins (plugin_file TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL DEFAULT 'bundled', status TEXT NOT NULL DEFAULT 'inactive', required INTEGER NOT NULL DEFAULT 0, source_zip TEXT);
CREATE TABLE IF NOT EXISTS cp_themes (slug TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL DEFAULT 'bundled', status TEXT NOT NULL DEFAULT 'inactive', source TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_shard_registry (shard_key TEXT PRIMARY KEY, database_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'content', status TEXT NOT NULL DEFAULT 'active', weight INTEGER NOT NULL DEFAULT 100, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS cp_php_wasm_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));

-- Compatibility views for the existing Astro rendering/admin code while WordPress remains canonical.
CREATE VIEW IF NOT EXISTS posts AS SELECT 'post_' || ID AS id, post_title AS title, post_name AS slug, post_excerpt AS excerpt, post_content AS content, post_content AS content_html, post_status AS status, NULL AS featured_image, 'user_' || post_author AS author_id, strftime('%s', post_date_gmt) AS published_at, NULL AS scheduled_at, strftime('%s', post_date_gmt) AS created_at, strftime('%s', post_modified_gmt) AS updated_at FROM cp_posts WHERE post_type = 'post';
CREATE VIEW IF NOT EXISTS pages AS SELECT 'page_' || ID AS id, post_title AS title, post_name AS slug, post_content AS content, post_content AS content_html, post_status AS status, menu_order AS sort_order, strftime('%s', post_date_gmt) AS created_at, strftime('%s', post_modified_gmt) AS updated_at FROM cp_posts WHERE post_type = 'page';
CREATE VIEW IF NOT EXISTS categories AS SELECT 'term_' || t.term_id AS id, t.name, t.slug, tt.description, CASE WHEN tt.parent = 0 THEN NULL ELSE 'term_' || tt.parent END AS parent_id, 0 AS sort_order, unixepoch() AS created_at FROM cp_terms t JOIN cp_term_taxonomy tt ON tt.term_id = t.term_id WHERE tt.taxonomy='category';
CREATE VIEW IF NOT EXISTS tags AS SELECT 'term_' || t.term_id AS id, t.name, t.slug, unixepoch() AS created_at FROM cp_terms t JOIN cp_term_taxonomy tt ON tt.term_id = t.term_id WHERE tt.taxonomy='post_tag';
CREATE VIEW IF NOT EXISTS post_categories AS SELECT 'post_' || object_id AS post_id, 'term_' || tt.term_id AS category_id FROM cp_term_relationships tr JOIN cp_term_taxonomy tt ON tt.term_taxonomy_id=tr.term_taxonomy_id WHERE tt.taxonomy='category';
CREATE VIEW IF NOT EXISTS post_tags AS SELECT 'post_' || object_id AS post_id, 'term_' || tt.term_id AS tag_id FROM cp_term_relationships tr JOIN cp_term_taxonomy tt ON tt.term_taxonomy_id=tr.term_taxonomy_id WHERE tt.taxonomy='post_tag';
CREATE VIEW IF NOT EXISTS media AS SELECT 'media_' || ID AS id, post_name AS file_name, post_title AS original_name, post_mime_type AS mime_type, 0 AS file_size, guid AS file_url, strftime('%s', post_date_gmt) AS created_at FROM cp_posts WHERE post_type='attachment';
CREATE VIEW IF NOT EXISTS seo_meta AS SELECT 'seo_' || post_id AS id, 'post' AS object_type, 'post_' || post_id AS object_id, NULL AS meta_title, NULL AS meta_description, NULL AS canonical_url, 'index, follow' AS robots, NULL AS og_title, NULL AS og_description, NULL AS og_image, 'summary_large_image' AS twitter_card, NULL AS focus_keyword, unixepoch() AS created_at, unixepoch() AS updated_at FROM cp_postmeta WHERE meta_key='_yoast_wpseo_title';
CREATE VIEW IF NOT EXISTS schemas AS SELECT id, object_type, object_id, 'Article' AS schema_type, schema_json, created_at, created_at AS updated_at FROM cp_schema_generations;
CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY DEFAULT 'default', name TEXT NOT NULL, domain TEXT NOT NULL, description TEXT, language TEXT NOT NULL DEFAULT 'ko', timezone TEXT NOT NULL DEFAULT 'Asia/Seoul', homepage_type TEXT NOT NULL DEFAULT 'posts', posts_per_page INTEGER NOT NULL DEFAULT 10, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS redirects (id TEXT PRIMARY KEY, source TEXT NOT NULL UNIQUE, target TEXT NOT NULL, status_code INTEGER NOT NULL DEFAULT 301);
CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, menu_id TEXT NOT NULL, label TEXT NOT NULL, url TEXT NOT NULL, parent_id TEXT, target TEXT NOT NULL DEFAULT '_self', sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS analytics_daily (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, pageviews INTEGER NOT NULL DEFAULT 0, visitors INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
