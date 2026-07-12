// workers/cms-site/src/admin/routes/media.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminMedia(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;

  // 목록 조회
  if (method === 'GET' && !id) {
    const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
    const perPage = parseInt(new URL(request.url).searchParams.get('per_page') || '30');
    const offset = (page - 1) * perPage;

    const result = await env.DB.prepare(
      "SELECT id, file_name, original_name, mime_type, file_size, file_url, created_at FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(perPage, offset).all<{
        id: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        file_size: number;
        file_url: string;
        created_at: number;
      }>();

    const totalResult = await env.DB.prepare('SELECT COUNT(*) as count FROM media').first<{ count: number }>();
    const total = totalResult?.count || 0;

    return jsonResponse({
      success: true,
      data: result,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    });
  }

  // 업로드
  if (method === 'POST' && !id) {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return jsonResponse({ success: false, error: { code: 'NO_FILE', message: '파일을 선택해주세요.' } }, 400);
    }

    if (!file.name || file.size === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_FILE', message: '빈 파일은 비어 있어야 합니다.' } }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}.${file.name.split('.').pop()}`;
    const key = `media/${fileName}`;

    try {
      // R2에 업로드
      const bucketId = await getR2BucketId(env);
      if (!bucketId) {
        // R2 버킷 자동 생성 (실제 운영에서는 Provisioning 서비스에서 처리)
        return jsonResponse({ success: false, error: { code: 'NO_BUCKET', message: 'R2 버킷이 없습니다. 사이트 설정을 확인해주세요.' } }, 500);
      }

      const object = await env.R2.bucket(bucketId).put(key, arrayBuffer, {
        httpMetadata: {
          'Content-Type': file.type || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000',
          'Content-Disposition': `attachment; filename="${escapeHtml(file.name}"`,
        },
      });

      // D1에 메타데이터 저장
      await env.DB.prepare(
        'INSERT INTO media (id, file_name, original_name, mime_type, file_size, file_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        fileName,
        file.name,
        file.type,
        file.size,
        `https://${bucketId}.r2.dev/${key}`,
        Math.floor(Date.now() / 1000),
      ).run();

      return jsonResponse({
        success: true,
        data: {
          id: key,
          fileName,
          original_name: file.name,
          url: `https://${bucketId}.r2.dev/${key}`,
          size: file.size,
          type: file.type,
        },
      }, 201);
    } catch (err) {
      console.error('R2 Upload Error:', err);
      return jsonResponse({ success: false, error: { code: 'UPLOAD_ERROR', message: '파일 업로드에 실패했습니다.' } }, 500);
    }
  }

  // 삭제
  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
    const deleteResult = await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '미디어를 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
