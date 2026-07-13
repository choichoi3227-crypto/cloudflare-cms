// workers/platform-api/src/routes/sites.ts
import type { Env } from '../types';
import { SiteRepository } from '../repositories/site.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { ProvisioningService } from '../services/provisioning.service';
import { success, error, notFound } from '../utils/response';
import { isDomain } from '@shared/utils/validation';

export async function handleListSites(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  const sites = await new SiteRepository(env.DB).findByUserId(userId);
  return success(sites.map(s => ({ id:s.id, site_name:s.site_name, domain:s.domain, status:s.status, created_at:s.created_at })));
}

export async function handleCreateSite(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  const cfToken = request.headers.get('X-CF-Token');
  const cfAccountId = request.headers.get('X-CF-Account-Id');
  if (!userId || !cfToken || !cfAccountId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  try {
    const body = await request.json() as { site_name?:string; domain?:string };
    if (!body.site_name || body.site_name.trim().length < 2) return error('VALIDATION_ERROR','사이트 이름은 2자 이상이어야 합니다.');
    if (!body.domain || !isDomain(body.domain)) return error('VALIDATION_ERROR','올바른 도메인을 입력해주세요.');
    const svc = new ProvisioningService(env.DB, env.KV, cfToken, cfAccountId);
    const result = await svc.provisionSite(userId, body.site_name.trim(), body.domain.trim());
    await new ActivityRepository(env.DB).log({ user_id:userId, action:'site.created', resource_type:'site', resource_id:result.site_id, metadata:{domain:body.domain} });
    return success({ id:result.site_id, site_name:body.site_name.trim(), domain:body.domain.trim(), status:'provisioning' }, 201);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('이미 사용 중인')) return error('CONFLICT',err.message,409);
      return error('PROVISIONING_ERROR',err.message,500);
    }
    return error('INTERNAL_ERROR','서버 오류가 발생했습니다.',500);
  }
}

export async function handleGetSite(request: Request, env: Env, siteId: string): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  const site = await new SiteRepository(env.DB).findById(siteId);
  if (!site || site.user_id !== userId) return notFound();
  return success(site);
}

export async function handleDeleteSite(request: Request, env: Env, siteId: string): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  const deleted = await new SiteRepository(env.DB).delete(siteId, userId);
  if (!deleted) return notFound();
  await new ActivityRepository(env.DB).log({ user_id:userId, action:'site.deleted', resource_type:'site', resource_id:siteId });
  return success({ deleted:true });
}
