import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { WordPressMarketplaceService, type WordPressAssetType } from '../../services/wordpress-marketplace.service';

export async function handleAdminMarketplace(request: Request, env: Env, method = request.method): Promise<Response> {
  if (method !== 'GET') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 요청만 지원합니다.' } }, 405);
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'plugin') as WordPressAssetType;
  if (type !== 'plugin' && type !== 'theme') {
    return jsonResponse({ success: false, error: { code: 'INVALID_TYPE', message: 'type은 plugin 또는 theme이어야 합니다.' } }, 400);
  }

  const query = url.searchParams.get('q') || 'popular';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const perPage = Math.min(48, Math.max(1, Number(url.searchParams.get('per_page') || '24')));

  const marketplace = new WordPressMarketplaceService();
  const result = await marketplace.search(type, query, page, perPage);

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'INSERT INTO marketplace_cache (id, asset_type, query, payload_json, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(`market_${crypto.randomUUID()}`, type, query, JSON.stringify(result), now).run().catch(() => undefined);

  return jsonResponse({ success: true, data: result.items, meta: { page: result.page, total_pages: result.totalPages, per_page: perPage } });
}
