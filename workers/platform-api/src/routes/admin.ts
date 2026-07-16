// workers/platform-api/src/routes/admin.ts
import type { Env } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { SiteRepository } from '../repositories/site.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { success, error } from '../utils/response';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';

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

export async function handleAdminSaveSettings(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json() as { paypal?: Record<string, string>; google?: Record<string, string>; github?: Record<string, string> };
  const entries: Array<{ key: string; value: string; isSecret: number }> = [];
  for (const [group, values] of Object.entries(body)) {
    if (!values || typeof values !== 'object') continue;
    for (const [key, value] of Object.entries(values)) {
      entries.push({ key: `${group}.${key}`, value: String(value), isSecret: /secret|token|key|json/i.test(key) ? 1 : 0 });
    }
  }
  const ts = now();
  for (const entry of entries) {
    await env.DB.prepare('INSERT INTO admin_settings (key,value,is_secret,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,is_secret=excluded.is_secret,updated_at=excluded.updated_at').bind(entry.key, entry.value, entry.isSecret, ts).run();
  }
  return success({ saved: entries.length });
}

export async function handleAdminSaveDesign(request: Request, env: Env): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const userId = request.headers.get('X-User-Id');
  const body = await request.json() as Record<string, unknown>;
  const existing = await env.DB.prepare(`SELECT id FROM site_design_settings WHERE scope='global'`).first<{ id: string }>();
  const id = existing?.id || generateId('dsn');
  await env.DB.prepare(
    `INSERT INTO site_design_settings (id,scope,settings_json,updated_by,updated_at) VALUES (?,'global',?,?,?)
     ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
  ).bind(id, JSON.stringify(body), userId, now()).run();
  return success({ id, settings: body });
}
