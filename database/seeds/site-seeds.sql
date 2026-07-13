-- database/seeds/site-seeds.sql
-- WordPress-compatible seed data for database/site-schema.sql.

INSERT INTO sites (id, name, domain, language, timezone, homepage_type, posts_per_page)
VALUES ('default', '내 블로그', 'example.com', 'ko', 'Asia/Seoul', 'posts', 10)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, domain=excluded.domain, updated_at=unixepoch();

INSERT INTO cp_options (option_name, option_value, autoload) VALUES
('siteurl', 'https://example.com', 'yes'),
('home', 'https://example.com', 'yes'),
('blogname', '내 블로그', 'yes'),
('blogdescription', 'CloudPress WordPress Hosting으로 만든 블로그입니다.', 'yes'),
('posts_per_page', '10', 'yes'),
('WPLANG', 'ko_KR', 'yes'),
('timezone_string', 'Asia/Seoul', 'yes'),
('start_of_week', '1', 'yes'),
('template', 'generatepress', 'yes'),
('stylesheet', 'generatepress', 'yes'),
('permalink_structure', '/%postname%/', 'yes'),
('default_category', '1', 'yes'),
('cp_ai_plugin', 'aibp-pro.zip', 'yes'),
('cp_image_worker_url', 'https://aibp100.jiji15899.workers.dev/', 'yes'),
('cp_cache_plugin', 'wp-rocket-main.zip', 'yes'),
('cp_sqlite_plugin', 'cloudpress-sqlite-integration.zip', 'yes'),
('active_plugins', 'a:4:{i:0;s:21:"aibp-pro/aibp-pro.php";i:1;s:23:"wp-rocket/wp-rocket.php";i:2;s:63:"cloudpress-sqlite-integration/cloudpress-sqlite-integration.php";i:3;s:55:"cloudpress-easy-migration/cloudpress-easy-migration.php";}', 'yes')
ON CONFLICT(option_name) DO UPDATE SET option_value=excluded.option_value, autoload=excluded.autoload;

INSERT INTO cp_users (ID, user_login, user_pass, user_nicename, user_email, display_name)
VALUES (1, 'admin', 'CHANGE_ME_HASH', 'admin', 'admin@example.com', 'Administrator')
ON CONFLICT(ID) DO UPDATE SET user_login=excluded.user_login, user_email=excluded.user_email;

INSERT INTO cp_terms (term_id, name, slug, term_group)
VALUES (1, '미분류', 'uncategorized', 0)
ON CONFLICT(term_id) DO UPDATE SET name=excluded.name, slug=excluded.slug;

INSERT INTO cp_term_taxonomy (term_taxonomy_id, term_id, taxonomy, description, parent, count)
VALUES (1, 1, 'category', '분류되지 않은 글', 0, 0)
ON CONFLICT(term_id, taxonomy) DO UPDATE SET description=excluded.description;

INSERT INTO menus (id, name, location) VALUES ('menu_001', '메인 메뉴', 'primary')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, location=excluded.location;

INSERT INTO menu_items (id, menu_id, label, url, sort_order) VALUES
('mi_001', 'menu_001', '홈', '/', 0),
('mi_002', 'menu_001', '카테고리', '/categories', 1)
ON CONFLICT(id) DO UPDATE SET label=excluded.label, url=excluded.url, sort_order=excluded.sort_order;

INSERT INTO cp_plugins (plugin_file, name, version, status, required, source_zip) VALUES
('aibp-pro/aibp-pro.php', 'AI 글쓰기/스키마/이미지 생성', 'bundled', 'active', 1, 'aibp-pro.zip'),
('wp-rocket/wp-rocket.php', 'WP Rocket Cache', 'bundled', 'active', 1, 'wp-rocket-main.zip'),
('cloudpress-sqlite-integration/cloudpress-sqlite-integration.php', 'CloudPress SQLite Integration', 'bundled', 'active', 1, 'cloudpress-sqlite-integration.zip'),
('cloudpress-easy-migration/cloudpress-easy-migration.php', 'CloudPress Easy Migration', 'bundled', 'active', 1, 'cloudpress-easy-migration.zip')
ON CONFLICT(plugin_file) DO UPDATE SET status=excluded.status, required=excluded.required, source_zip=excluded.source_zip;

INSERT INTO cp_shard_registry (shard_key, database_name, role, status, weight) VALUES
('database01.db', 'database01.db', 'primary', 'active', 100),
('database02.db', 'database02.db', 'content', 'active', 100),
('database03.db', 'database03.db', 'content', 'active', 100),
('database04.db', 'database04.db', 'content', 'active', 100),
('database05.db', 'database05.db', 'content', 'active', 100),
('database06.db', 'database06.db', 'content', 'active', 100),
('database07.db', 'database07.db', 'content', 'active', 100),
('database08.db', 'database08.db', 'content', 'active', 100),
('database09.db', 'database09.db', 'content', 'active', 100),
('database10.db', 'database10.db', 'content', 'active', 100)
ON CONFLICT(shard_key) DO UPDATE SET role=excluded.role, status=excluded.status, weight=excluded.weight, updated_at=unixepoch();

INSERT INTO cp_usermeta (user_id, meta_key, meta_value) VALUES
(1, 'cp_capabilities', 'a:1:{s:13:"administrator";b:1;}'),
(1, 'cp_user_level', '10'),
(1, 'show_admin_bar_front', 'true'),
(1, 'locale', 'ko_KR');

INSERT INTO cp_themes (slug, name, version, status, source) VALUES
('generatepress', 'GeneratePress', 'bundled', 'active', 'wordpress.org/themes/generatepress')
ON CONFLICT(slug) DO UPDATE SET status=excluded.status, source=excluded.source, updated_at=unixepoch();
