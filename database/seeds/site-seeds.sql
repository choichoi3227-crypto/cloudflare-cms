-- database/seeds/site-seeds.sql
INSERT INTO sites (id, name, domain, language, timezone, homepage_type, posts_per_page) VALUES ('default', '내 블로그', 'example.com', 'ko', 'Asia/Seoul', 'posts', 10);

INSERT INTO site_settings (key, value) VALUES
('site_title', '내 블로그'),
('site_description', 'CloudPress로 만든 블로그입니다.'),
('admin_path', 'cp-admin'),
('timezone', 'Asia/Seoul'),
('posts_per_page', '10'),
('show_author', 'true'),
('show_date', 'true'),
('show_categories', 'true'),
('show_tags', 'true'),
('comment_enabled', 'true'),
('comment_moderation', 'true'),
('rss_enabled', 'true'),
('rss_limit', '20'),
('analytics_enabled', 'true'),
('robots_index', 'true'),
('robots_follow', 'true'),
('theme_active', 'default');

INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_001', '미분류', 'uncategorized', '분류되지 않은 글', 0);

INSERT INTO menus (id, name, location) VALUES ('menu_001', '메인 메뉴', 'primary');
INSERT INTO menu_items (id, menu_id, label, url, sort_order) VALUES 
('mi_001', 'menu_001', '홈', '/', 0),
('mi_002', 'menu_001', '카테고리', '/categories', 1);

INSERT INTO themes (id, name, version, author, is_active) VALUES ('theme_001', 'default', '1.0.0', 'CloudPress', 1);
