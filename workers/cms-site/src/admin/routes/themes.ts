import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { PhpWasmRuntime } from '../../services/php-wasm.service';

export async function handleAdminThemes(request: Request, env: Env, method = request.method, id?: string, action?: string): Promise<Response> {
  if (method === 'GET' && !id) {
    const themes = await env.DB.prepare('SELECT id, name, version, author, is_active, created_at FROM themes ORDER BY is_active DESC, name').all();
    return jsonResponse({ success: true, data: themes.results || [], php_wasm: PhpWasmRuntime.fromEnv(env).inspect() });
  }

  if (method === 'GET' && id && action === 'files') {
    const files = await env.DB.prepare('SELECT id, file_path, created_at, updated_at FROM theme_files WHERE theme_id = ? ORDER BY file_path').bind(id).all();
    return jsonResponse({ success: true, data: files.results || [] });
  }

  if (method === 'GET' && id) {
    const theme = await env.DB.prepare('SELECT id, name, version, author, is_active, created_at FROM themes WHERE id = ?').bind(id).first();
    if (!theme) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: theme });
  }

  if (method === 'POST' && !id) {
    const contentType = request.headers.get('Content-Type') || '';
    let input: { slug?: string; name?: string; version?: string; author?: string; source?: string; download_url?: string } = {};

    if (contentType.includes('application/json')) {
      input = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      input = {
        slug: String(form.get('slug') || ''),
        name: String(form.get('name') || form.get('theme_name') || ''),
        version: String(form.get('version') || 'latest'),
        author: String(form.get('author') || ''),
        source: String(form.get('source') || 'upload'),
      };
      if (form.get('theme_zip')) input.source = 'wordpress-upload';
    }

    if (!input.name) return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '테마 이름은 필수입니다.' } }, 400);

    const now = Math.floor(Date.now() / 1000);
    const themeId = `theme_${crypto.randomUUID()}`;
    await env.DB.prepare('INSERT INTO themes (id, name, version, author, is_active, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .bind(themeId, input.name, input.version || 'latest', input.author || null, now).run();
    await env.DB.prepare('INSERT INTO theme_files (id, theme_id, file_path, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(`tf_${crypto.randomUUID()}`, themeId, 'wordpress-source.json', JSON.stringify(input), now, now).run();

    return jsonResponse({ success: true, data: { id: themeId, php_wasm: PhpWasmRuntime.fromEnv(env).inspect() } }, 201);
  }

  if (method === 'POST' && id && action === 'activate') {
    const report = PhpWasmRuntime.fromEnv(env).inspect();
    if (!report.supported) {
      return jsonResponse({ success: false, error: { code: 'PHP_WASM_NOT_CONFIGURED', message: report.warnings[0], details: { missing: report.missing } } }, 409);
    }
    await env.DB.prepare('UPDATE themes SET is_active = 0').run();
    const result = await env.DB.prepare('UPDATE themes SET is_active = 1 WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { activated: true, php_wasm: report } });
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM theme_files WHERE theme_id = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM themes WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }

  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
