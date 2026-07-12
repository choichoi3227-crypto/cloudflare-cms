// workers/cms-site/src/admin/routes/seo.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminSeo(request: Request, env: Env, objectType: string, objectId: string): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    const meta = await env.DB.prepare(
      'SELECT * FROM seo_meta WHERE object_type = ? AND object_id = ?'
    ).bind(objectType, objectId).first();

    if (!meta) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'SEO 데이터가 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: meta });
  }

  if (method === 'PUT') {
    const body = await request.json() as Record<string, string>;

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
    if (body.focus_keyword !== undefined) { fields.push('focus_keyword = ?'); values.push(body.focus_keyword); }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 SEO 항목이 없습니다.' } }, 400);
    }

    fields.push('updated_at = ?'); values.push(Math.floor(Date.now() / 1000));
    values.push(objectId);

    const result = await env.DB.prepare(`UPDATE seo_meta SET ${fields.join(', ')} WHERE object_type = ? AND object_id = ?`).bind(...values, objectId).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'SEO 데이터를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }
}
