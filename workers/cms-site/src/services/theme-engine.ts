// workers/cms-site/src/services/theme-engine.ts
import type { D1Database } from '@cloudflare/javascript-api';

interface ThemeConfig {
  name: string;
  version: string;
  author?: string;
  description?: string;
  homepage_template?: string;
  post_template?: string;
  page_template?: string;
  category_template?: string;
  tag_template?: string;
}

export class ThemeEngine {
  constructor(private db: D1Database) {}

  async uploadTheme(zipBytes: ArrayBuffer, fileName: string): Promise<{ id: string; name: string; fileCount: number; errors: string[] }> {
    // 1. ZIP 파일 파싱 (간단한 브라우저 구현)
    const textDecoder = new TextDecoder('utf-8');
    const uint8Array = new Uint8Array(zipBytes);
    
    // ZIP 구조에서 파일 목록 찾기 (End of Central Directory)
    let centralDirEnd = -1;
    for (let i = 0; i < uint8Array.length - 21; i++) {
      if (
        uint8Array[i] === 0x50 && uint8Array[i + 1] === 0x4B &&
        uint8Array[i + 2] === 0x4F && uint8Array[i + 3] === 0x4C &&
        uint8Array[i + 4] === 0x4F && uint8Array[i + 5] === 0x4E
      ) {
        centralDirEnd = i + 6;
        break;
      }
    }

    if (centralDirEnd === -1) {
      return { id: '', name: '', fileCount: 0, errors: ['올바른 ZIP 파일입니다. (End of Central Directory를 찾을 수 없습니다)'] };
    }

    // Central Directory 오프셋 시작점 계산
    let offset = centralDirEnd + 1;
    let currentOffset = offset;
    const files: Array<{ path: string; content: string }> = [];
    const errors: string[] = [];

    while (currentOffset < uint8Array.length - 22) {
      // 파일 헤더 파싱
      if (uint8Array[currentOffset + 26] === 0x50 && uint8Array[currentOffset + 27] === => 'K' &&
          uint8Array[currentOffset + 28] === 0x4C && uint8Array[currentOffset + 29] === 0x41) {
        
        const fileNameLen = uint8Array[currentOffset + 26];
        const fileName = textDecoder.decode(uint8Array.slice(currentOffset + 30, currentOffset + 30 + fileNameLen));
        
        // 파일 데이터 오프셋 위치 계산
        const compressionMethod = uint8Array[currentOffset + 30 + fileNameLen];
        let dataOffset = currentOffset + 30 + fileNameLen + 1;
        
        let dataLength = 0;
        if (compressionMethod === 0x08 || compressionMethod === 0x00) {
          dataLength = (uint8Array[dataOffset] | (uint8Array[dataOffset + 1] << 8) | (uint8Array[dataOffset + 2] << 16) | (uint8Array[dataOffset + 3] << 24);
          dataOffset += 4;
        } else if (compressionMethod === 0x01) {
          dataLength = (uint8Array[dataOffset] | (uint8Array[dataOffset + 1] << 8) | (uint8Array[dataOffset + 2] << 16);
          dataOffset += 3;
        } else {
          errors.push(`지원하지 않는 압축 방식입니다: ${compressionMethod}`);
          break;
        }

        if (dataLength < 0 || dataOffset + dataLength > uint8Array.length) {
          errors.push(`파일 "${fileName}" 데이터 손상`);
          currentOffset += 30 + fileNameLen + 1;
          continue;
        }

        const fileContent = textDecoder.decode(uint8Array.slice(dataOffset, dataOffset + dataLength));
        files.push({ path: fileName, content: fileContent });

        // Local File Header (버전 무시)
        let nextOffset = dataOffset + dataLength;
        if (nextOffset % 4 !== 0) {
          nextOffset += 4 - (nextOffset % 4);
        }
        currentOffset = nextOffset;
      } else {
        currentOffset++;
      }
    }

    if (files.length === 0) {
      return { id: '', name: '', fileCount: 0, errors: ['ZIP 파일 내에 파일이 없습니다.'] };
    }

    // 2. 필수 파일 검증
    const hasConfig = files.some(f => f.path === 'config.json');
    const hasTemplate = files.some(f => f.path.endsWith('.html'));
    
    if (!hasConfig) {
      return { id: '', name: '', fileCount: files.length, errors: ['config.json 파일이 없습니다.'] };
    }

    let config: ThemeConfig = { name: 'Unknown', version: '1.0.0' };
    try {
      const configFile = files.find(f => f.path === 'config.json');
      if (configFile) {
        config = JSON.parse(configFile.content);
      }
    } catch {
      return { id: '', name: config.name, fileCount: files.length, errors: ['config.json 파싱 에러가 있습니다.'] };
    }

    if (!config.name) {
      errors.push('config.json에 name이 없습니다.');
    }

    if (!hasTemplate) {
      errors.push('HTML 템플릿 파일(.html)가 없습니다.');
    }

    // 3. D1에 테마 저장
    const themeId = `theme_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const statements = [
        env.DB.prepare(
          'INSERT INTO themes (id, name, version, author, is_active, created_at) VALUES (?, ?, ?, ?, 0, 1, ?)'
        ).bind(themeId, config.name, config.version, config.author || null, timestamp),
      ];

      for (const file of files) {
        statements.push(
          env.DB.prepare(
            'INSERT INTO theme_files (id, theme_id, file_path, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            `tf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            themeId,
            file.path,
            file.content,
            timestamp, timestamp,
          ),
        );
      }

      await env.DB.batch(statements);

      return { id: themeId, name: config.name, fileCount: files.length, errors };
    } catch (err) {
      return { id: themeId, name: config.name, fileCount: files.length, errors: [`DB 저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`] };
    }
  }

  async applyTheme(themeId: string): Promise<boolean> {
    try {
      // 현재 활성 테마를 비활 해제
      await env.DB.prepare("UPDATE themes SET is_active = 0 WHERE is_active = 1").run();
      
      // 선택한 테마를 활성화
      const result = await env.DB.prepare("UPDATE themes SET is_active = 1 WHERE id = ?").bind(themeId).run();
      
      // 사이트 설정에 활성 테마 ID 반영
      await env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('theme_active', ?)").bind(themeId).run();

      return result.meta.changes > 0;
    } catch {
      return false;
    }
  }

  async deleteTheme(themeId: string): Promise<boolean> {
    const theme = await env.DB.prepare('SELECT is_active FROM themes WHERE id = ?').bind(themeId).first<{ is_active: number }>();
    
    if (theme?.is_active === 1) {
      return false; // 활성 테마는 삭제 불가
    }

    await env.DB.prepare('DELETE FROM theme_files WHERE theme_id = ?').bind(themeId).run();
    await env.DB.prepare('DELETE FROM themes WHERE id = ?').bind(themeId).run();
    
    return true;
  }

  async getThemeFiles(themeId: string): Promise<Array<{ id: string; file_path: string }>> {
    return (await env.DB.prepare('SELECT id, file_path FROM theme_files WHERE theme_id = ? ORDER BY file_path').bind(themeId).all<{ id: string; file_path: string }>());
  }

  async getThemeFileContent(themeId: string, filePath: string): Promise<string | null> {
    const file = await env.DB.prepare('SELECT content FROM theme_files WHERE theme_id = ? AND file_path = ?').bind(themeId, filePath).first<{ content: string }>();
    return file?.content || null;
  }

  async getActiveTheme(): Promise<{ id: string; name: string; version: string } | null> {
    return env.DB.prepare(
      'SELECT id, name, version FROM themes WHERE is_active = 1 LIMIT 1'
    ).first<{ id: string; name: string; version: string }>();
  }

  async getTemplateForType(type: string, themeId: string): Promise<string | null> {
    const config = await this.getThemeConfig(themeId);
    const key = `${type}_template`;
    
    if (config[key]) return config[key];
    
    // 기본 템플릿 폴백백
    if (type === 'post') return `<article><h1>{{title}}</h1><time>{{published}}</time><div class="post-content">{{content}}</div></article>`;
    if (type === 'page') return `<article><h1>{{title}}</h1><div class="page-content">{{content}}</div></article>`;
    if (type === 'category') return `<h1>{{name}}</h1><div class="category-content">{{content}}</div>`;
    if (type === 'tag') return `<h1>#{{name}}</h1><div class="tag-content">{{content}}</div>`;
    
    return null;
  }

  private async getThemeConfig(themeId: string): Promise<ThemeConfig> {
    const files = await this.getThemeFiles(themeId);
    const configFile = files.find(f => f.file_path === 'config.json');
    
    const defaultConfig: ThemeConfig = {
      name: 'Default Theme',
      version: '1.0.0',
      homepage_template: '<main class="container"><h1>{{site_title}}</h1><div class="post-list">{{content}}</div></main>',
      post_template: '<article><h1>{{title}}</h1><time>{{published}}</time><div class="post-content">{{content}}</div></article>',
      page_template: '<article><h1>{{title}}</h1><div class="page-content">{{content}}</div></article>',
      category_template: '<h1>{{name}}</h1><div class="category-content">{{content}}</div>',
      tag_template: '<h1>#{{name}}</h1><div class="tag-content">{{content}}</div>',
    };

    if (configFile) {
      try { return { ...defaultConfig, ...JSON.parse(configFile.content) }; } catch {}
    }
    return defaultConfig;
  }
}
