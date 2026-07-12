// workers/cms-site/src/admin/routes/system-status.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';

export async function handleAdminSystemStatus(request: request: Env): Promise<Response> {
  const method = request.method;
  if (method !== 'GET') {
    return jsonResponse({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET 요청만 지원합니다.' } }, 405);
  }

  try {
    const userId = request.headers.get('X-User-User-Id');
    const cfToken = request.headers.get('X-CF-Token');

    if (!userId || !cfToken) {
      return jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다. 플랫폼 API 토큰이 누락되어 있습니다.' } }, 401);
    }

    // 사용자 Cloudflare Account ID 조회
    const userCfAccount = await env.DB.prepare(
      'SELECT cloudflare_account_id FROM user_cloudflare_accounts WHERE user_id = ? AND status = \'active\''
    ).first<{ cloudflare_account_id: string }>();

    if (!userCfAccount) {
      return jsonResponse({ success: false, error: { code: 'NO_CF_ACCOUNT', message: 'Cloudflare 계정 연동이 필요합니다.' } }, 400);
    }

    const cfAccountId = userCfAccount.cloudflare_account_id;
    const headers = { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' };

    // 1. Worker 상태 확인
    const workersRegistry = await env.DB.prepare(
      "SELECT worker_name, worker_domain, worker_type FROM workers_registry WHERE user_id = ? AND status = 'active'"
    ).all<{ worker_name: string; worker_domain: string; worker_type: string }>();

    const workerStatuses: Array<{
    name: string;
    domain: string;
    type: string;
    status: string;
    error?: string;
  }> = [];

    for (const w of workersRegistry) {
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${w.worker_name}/settings`, { headers });
        if (!res.ok) throw new Error(`Worker not found: ${w.worker_name}`);
        const data = await res.json() as { result: { id: string; created_on: string; modified_on: string; deployment_id: string; latest_deployment: { id: string; created_on: string; status: string } };

        workerStatuses.push({
          name: w.worker_name,
          domain: w.worker_domain,
          type: w.worker_type === 'hub' ? 'CMS Hub' : 'Public Site',
          status: data.status === 'active' ? 'Active' : `Failed (${data.status})`,
        });
      } catch (err) {
        workerStatuses.push({
          name: w.worker_name,
          domain: w.worker_domain,
          type: w.worker_type === 'hub' ? 'CMS Hub' : 'Public Site',
          status: 'Error',
          error: err instanceof Error ? err.message : '연결 실패',
        });
      }
    }

    // 2. D1 상태 확인
    const d1List = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database`, { headers });
    const d1Data = await d1List.json() as { result: Array<{ uuid: string; name: string; created_at: string }>;
    const d1Statuses = d1Data.map(db => ({ name: db.name, type: 'D1 Database', status: 'Active' }));

    // 3. KV 상태 확인
    const kvList = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/storage/kv/namespaces`, { headers });
    const kvData = await kvList.json() as { result: Array<{ id: string; title: string }> };
    const kvStatuses = kvData.map(kv => ({ name: kv.title || kv.id, type: 'KV Namespace', status: 'Active' }));

    // 4. R2 상태 확인
    const r2List = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets`, { headers });
    const r2Data = await r2List.json() as { result: Array<{ id: string; name: string; created_at: string }> };
    const r2Statuses = r2Data.map(r => ({ name: r.name, type: 'R2 Bucket', status: 'Active' }));

    return jsonResponse({
      success: true,
      data: {
        cloudflare_account_id: cfAccountId,
        workers: workerStatuses,
        databases: d1Statuses,
        kv: kvStatuses,
        r2: r2Statuses,
      },
    });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'SYSTEM_ERROR', message: `시스템 상태 확인 실패: ${err instanceof Error ? err.message : '알 수 없는 오류' } }, 500);
  }
}
