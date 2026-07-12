// workers/platform-api/src/routes/system-status.ts
import type { Env } from '../types';
import { success, error, unauthorized } from '../utils/response';

interface CloudflareWorkerStatus {
  id: string;
  status: string;
  created_on: string;
  modified_on: string;
}

interface CloudflareWorkerScript {
  id: string;
  modified_on: string;
}

export async function handleSystemStatus(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-User-Id');
  const cfToken = request.headers.get('X-CF-Token');
  if (!userId || !cfToken) return unauthorized('시스템 상태를 확인하려면 플랫폼 API 토큰이 필요합니다.');

  try {
    // 1. 사용자의 Cloudflare Account ID 조회
    const userCfAccount = await env.DB.prepare(
      'SELECT cloudflare_account_id FROM user_cloudflare_accounts WHERE user_id = ?'
    ).bind(userId).first<{ cloudflare_account_id: string }>();

    if (!userCfAccount) {
      return error('NO_CF_ACCOUNT', 'Cloudflare 계정 연동 정보가 없습니다.', 400);
    }

    const cfAccountId = userCfAccount.cloudflare_account_id;
    const headers = { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' };

    // 2. 등록된 Worker 상태 확인 (사용자 Worker)
    const workers = await env.DB.prepare(
      "SELECT worker_name, worker_domain, worker_type FROM workers_registry WHERE user_id = ? AND status = 'active'"
    ).bind(userId).all<{ worker_name: string; worker_domain: string; worker_type: string }>();

    const workerStatuses: Array<{
      name: string;
      domain: string;
      type: string;
      status: string;
      error?: string;
    }> = [];

    for (const w of workers) {
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${w.worker_name}/settings`, { headers });
        if (!res.ok) throw new Error(`Worker ${w.worker_name} not found`);
        const data = await res.json() as { result: CloudflareWorkerScript };
        workerStatuses.push({
          name: w.worker_name,
          domain: w.worker_domain,
          type: w.worker_type,
          status: 'Active',
        });
      } catch (err) {
        workerStatuses.push({
          name: w.worker_name,
          domain: w.worker_domain,
          type: w.worker_type,
          status: 'Error',
          error: err instanceof Error ? err.message : '알 수 없는 오류',
        });
      }
    }

    // 3. D1 상태 확인 (사용자 D1)
    const d1List = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database`, { headers });
    const d1Data = await d1List.json() as { result: Array<{ uuid: string; name: string; created_at: string }> };
    const d1Statuses = d1Data.map(db => ({
      name: db.name,
      type: 'D1 Database',
      status: 'Active',
    }));

    // 4. R2 상태 확인 (사용자 R2 - 미디어 저장용)
    const r2List = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets`, { headers });
    const r2Data = await r2List.json() as { result: Array<{ id: string; name: string; created_at: string }> };
    const r2Statuses = r2Data.map(bucket => ({
      name: bucket.name,
      type: 'R2 Bucket',
      status: 'Active',
    }));

    return success({
      cloudflare_account_id: cfAccountId,
      workers: workerStatuses,
      databases: d1Statuses,
      buckets: r2Statuses,
    });
  } catch (err) {
    return error('SYSTEM_CHECK_FAILED', `시스템 상태 확인에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, 500);
  }
}
