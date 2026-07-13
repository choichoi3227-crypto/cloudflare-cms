// workers/cms-site/admin/routes/themes.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { generateId, now } from '@shared/utils/id';

export async function handleAdminThemes(request: Request, env: Env, id?: string, action?: string): Promise<Response> {
  const method = request.method;

  // 생성
  if (method === 'POST' && !id && !action) {
    return handleThemeUpload(request, env);
  }

  // 상세 보기
  if (method === 'GET' && !id) {
    return listThemes(env);
  }

  // 특정 테마 활성화/비활성화
  if (method === 'POST' && id && action === 'activate') {
    return activateTheme(request, env, id);
  }

  // 삭제
  if (method === 'DELETE' && id) {
    return deleteTheme(request, env, id);
  }
  
  return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' } }, 404);
  }
}

async function listThemes(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT id, name, version, author, is_active FROM themes ORDER BY name'
  ).all<{
    id: string;
    name: string;
    version: string;
    author: string | null;
    is_active: number;
    created_at: number;
  }>);

  return jsonResponse({ success: true, data: result });
}

async function activateTheme(request: Request, env: Env, themeId: string): Promise<Response> {
  const result = await env.DB.prepare('UPDATE themes SET is_active = 0 WHERE id = ? AND is_active = 1').bind(themeId).run();

  if (result.meta.changes === 0) {
    return jsonResponse({ success: false, error: { code: 'ACTIVATION_FAILED', message: '테마 활성에 실패했습니다.' } }, 500);
  }

  return jsonResponse({ success: true, data: { activated: true } });
}

async function deleteTheme(request: Request, env: Env, themeId: string): Promise<Response> {
  const id = themeId || '';
  if (!id) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
  }

  async function deleteTheme(request: Request, env: Env, themeId: string): Promise<Response> {
  const id = themeId || '';
  if (!id) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
  }

  const result = await env.DB.prepare(
    'DELETE FROM theme_files WHERE theme_id = ? AND object_type = ?'
  ).bind(themeId).run();

  if (result.meta.changes === 0) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '테마를 찾을 수 없습니다.' } }, 404);
  }

  return jsonResponse({ success: true, data: { deleted: true } });
}
