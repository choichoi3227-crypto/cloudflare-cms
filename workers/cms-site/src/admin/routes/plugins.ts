import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { PhpWasmRuntime } from '../../services/php-wasm.service';

export async function handleAdminPlugins(request: Request, env: Env, method = request.method, id?: string, action?: string): Promise<Response> {
  if (method === 'GET' && !id) {
    const plugins = await env.DB.prepare(
      'SELECT id, slug, name, version, source, is_active, requires_php_wasm, created_at, updated_at FROM plugins ORDER BY name'
    ).all();
    return jsonResponse({ success: true, data: plugins.results || [], php_wasm: PhpWasmRuntime.fromEnv(env).inspect() });
  }

  if (method === 'POST' && !id) {
    const body = await request.json() as { slug: string; name: string; version?: string; source?: string; download_url?: string };
    if (!body.slug || !body.name) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'slug와 name은 필수입니다.' } }, 400);
    }
    const report = PhpWasmRuntime.fromEnv(env).inspect();
    const now = Math.floor(Date.now() / 1000);
    const pluginId = `plugin_${crypto.randomUUID()}`;
    await env.DB.prepare(
      'INSERT INTO plugins (id, slug, name, version, source, download_url, is_active, requires_php_wasm, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)'
    ).bind(pluginId, body.slug, body.name, body.version || 'latest', body.source || 'wordpress.org', body.download_url || null, now, now).run();
    return jsonResponse({ success: true, data: { id: pluginId, php_wasm: report } }, 201);
  }

  if (method === 'POST' && id && action === 'activate') {
    const report = PhpWasmRuntime.fromEnv(env).inspect();
    if (!report.supported) {
      return jsonResponse({ success: false, error: { code: 'PHP_WASM_NOT_CONFIGURED', message: report.warnings[0], details: { missing: report.missing } } }, 409);
    }
    const result = await env.DB.prepare('UPDATE plugins SET is_active = 1, updated_at = ? WHERE id = ?').bind(Math.floor(Date.now() / 1000), id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '플러그인을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { activated: true, php_wasm: report } });
  }

  if (method === 'POST' && id && action === 'deactivate') {
    const result = await env.DB.prepare('UPDATE plugins SET is_active = 0, updated_at = ? WHERE id = ?').bind(Math.floor(Date.now() / 1000), id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '플러그인을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deactivated: true } });
  }

  if (method === 'DELETE' && id) {
    const result = await env.DB.prepare('DELETE FROM plugins WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '플러그인을 찾을 수 없습니다.' } }, 404);
    return jsonResponse({ success: true, data: { deleted: true } });
  }

  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
