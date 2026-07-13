// workers/platform-api/src/routes/admin.ts
import type { Env } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { SiteRepository } from '../repositories/site.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { success, error } from '../utils/response';

// 관리자 라우트는 platform(Astro) 서버가 세션 쿠키의 이메일을 검증한 뒤
// X-Admin-Verified: 1 헤더를 부여했을 때만 호출됩니다. 워커 자체는 이메일 목록을
// 알지 못하므로, 이 헤더가 없으면 항상 거부합니다.
function requireAdmin(request: Request): Response | null {
  if (request.headers.get('X-Admin-Verified') !== '1') {
    return error('FORBIDDEN', '관리자 권한이 필요합니다.', 403);
  }
  return null;
}

export async function handleAdminOverview(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const userRepo = new UserRepository(env.DB);
  const siteRepo = new SiteRepository(env.DB);
  const [userCount, siteCount, activeSites, provisioningSites] = await Promise.all([
    userRepo.count(),
    siteRepo.count(),
    siteRepo.countByStatus('active'),
    siteRepo.countByStatus('provisioning'),
  ]);
  return success({ userCount, siteCount, activeSites, provisioningSites });
}

export async function handleAdminListUsers(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;
  const users = await new UserRepository(env.DB).findAll(limit, offset);
  return success(users);
}

export async function handleAdminListSites(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;
  const sites = await new SiteRepository(env.DB).findAll(limit, offset);
  return success(sites.map((s) => ({ id:s.id, user_id:s.user_id, site_name:s.site_name, domain:s.domain, status:s.status, worker_id:s.worker_id, created_at:s.created_at })));
}

export async function handleAdminListActivity(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;
  const logs = await new ActivityRepository(env.DB).findRecent(limit, offset);
  return success(logs);
}
