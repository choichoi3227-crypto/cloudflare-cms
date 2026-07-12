// workers/cms-site/src/admin/routes/media.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { BloggerService, extractGoogleusercontentUrls, isGoogleusercontentUrl } from '../../services/blogger.service';

interface MediaRecord {
  id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_url: string;
  created_at: number;
}

export async function handleAdminMedia(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;

  if (method === 'GET' && !id) {
    const page = parseInt(new URL(request.url).searchParams.get('page') || '1', 10);
    const perPage = parseInt(new URL(request.url).searchParams.get('per_page') || '30', 10);
    const offset = (page - 1) * perPage;

    const result = await env.DB.prepare(
      'SELECT id, file_name, original_name, mime_type, file_size, file_url, created_at FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(perPage, offset).all<MediaRecord>();

    const totalResult = await env.DB.prepare('SELECT COUNT(*) as count FROM media').first<{ count: number }>();
    const total = totalResult?.count || 0;

    return jsonResponse({
      success: true,
      data: result.results || [],
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    });
  }

  if (method === 'POST' && !id) {
    const contentType = request.headers.get('Content-Type') || '';
    let sourceUrl = '';
    let originalName = 'blogger-media';

    if (contentType.includes('application/json')) {
      const body = await request.json() as { googleusercontent_url?: string; blogger_post_url?: string; original_name?: string };
      originalName = body.original_name || originalName;
      if (body.googleusercontent_url) {
        sourceUrl = body.googleusercontent_url;
      } else if (body.blogger_post_url) {
        const blogger = new BloggerService(env.DB);
        const post = await blogger.fetchPostByUrl(body.blogger_post_url);
        sourceUrl = extractGoogleusercontentUrls(post?.content || '')[0] || '';
        originalName = post?.title || originalName;
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      sourceUrl = String(formData.get('googleusercontent_url') || '');
      originalName = String(formData.get('original_name') || originalName);

      if (formData.get('file')) {
        return jsonResponse({
          success: false,
          error: {
            code: 'BLOGGER_MEDIA_ONLY',
            message: '파일 직접 저장은 사용할 수 없습니다. Blogger API로 생성된 googleusercontent URL을 전달해주세요.',
          },
        }, 400);
      }
    }

    if (!sourceUrl || !isGoogleusercontentUrl(sourceUrl)) {
      return jsonResponse({
        success: false,
        error: { code: 'INVALID_MEDIA_URL', message: 'Blogger API에서 추적한 googleusercontent URL만 등록할 수 있습니다.' },
      }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const mediaId = `blogger_${crypto.randomUUID()}`;
    const fileName = sourceUrl.split('/').pop()?.split('?')[0] || mediaId;

    await env.DB.prepare(
      'INSERT INTO media (id, file_name, original_name, mime_type, file_size, file_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(mediaId, fileName, originalName, 'image/*', 0, sourceUrl, now).run();

    return jsonResponse({
      success: true,
      data: { id: mediaId, fileName, original_name: originalName, url: sourceUrl, size: 0, type: 'image/*', provider: 'blogger' },
    }, 201);
  }

  if (method === 'DELETE' && id) {
    const deleteResult = await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '미디어를 찾을 수 없습니다.' } }, 404);
    }
    return jsonResponse({ success: true, data: { deleted: true } });
  }

  return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' } }, 405);
}
