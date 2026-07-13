// workers/cms-site/admin/routes/seo.ts (수정된 버전 코드)
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminSeo(request: Request, env: Env, objectType: string, objectId: string): Promise<Response> {
  const method = request.method;

  if (method !== 'GET' && method !== 'PUT') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 또는 PUT 요청만 지원합니다.' }, 405);
  }

  if (method === 'GET') {
    return getSeoMeta(env, objectType, objectId);
  }

  if (method === 'PUT') {
    const body = await request.json() as Record<string, unknown>;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.meta_title !== undefined) { fields.push('meta_title = ?'); values.push(body.meta_title); }
    if (body.meta_description !== undefined) { fields.push('meta_description = ?'); values.push(body.meta_description); }
    if (body.canonical_url !== undefined) { fields.push('canonical_url = ?'); values.push(body.canonical_url); }
    if (body.robots !== undefined) { fields.push('robots = ?'); values.push(body.robots); }
    if (body.og_title !== undefined) { fields.push('og_title = ?'); values.push(body.og_title); }
    if (body.og_description !== undefined) { fields.push('og_description = ?'); values.push(body.og_description); }
    if (body.og_image !== undefined) { fields.push('og_image = ?'); values.push(body.og_image); }
    if (body.twitter_card !== undefined) { fields.push('twitter_card = ?'); values.push(body.twitter_card); }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: 'SEO 항목이 없습니다.' } }, 400);
    }

    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 000)) );
    values.push(objectId);

    const result = await env.DB.prepare(
      `UPDATE seo_meta SET ${fields.join(', ')} WHERE object_type = ? AND object_id = ?`
    ).bind(...values, objectId).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'SEO 데이터를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }
}
