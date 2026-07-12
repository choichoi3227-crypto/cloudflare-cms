import type { D1Database } from '@cloudflare/workers-types';

interface ThemeConfig {
  name: string;
  version: string;
  author?: string;
  description?: string;
}

export class ThemeEngine {
  constructor(private db: D1Database) {}

  async installThemeManifest(config: ThemeConfig, source: Record<string, unknown> = {}): Promise<{ id: string; name: string; fileCount: number; errors: string[] }> {
    const errors: string[] = [];
    if (!config.name) errors.push('config.name은 필수입니다.');
    if (!config.version) errors.push('config.version은 필수입니다.');
    if (errors.length) return { id: '', name: config.name || '', fileCount: 0, errors };

    const themeId = `theme_${crypto.randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch([
      this.db.prepare('INSERT INTO themes (id, name, version, author, is_active, created_at) VALUES (?, ?, ?, ?, 0, ?)')
        .bind(themeId, config.name, config.version, config.author || null, now),
      this.db.prepare('INSERT INTO theme_files (id, theme_id, file_path, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(`tf_${crypto.randomUUID()}`, themeId, 'theme-source.json', JSON.stringify({ config, source }), now, now),
    ]);

    return { id: themeId, name: config.name, fileCount: 1, errors: [] };
  }
}
