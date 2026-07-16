// workers/platform-api/src/routes/sites.ts
import type { Env } from '../types';
import { SiteRepository } from '../repositories/site.repository';
import { UserRepository } from '../repositories/user.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { ProvisioningService } from '../services/provisioning.service';
import { success, error, notFound } from '../utils/response';
import { isDomain } from '@shared/utils/validation';
import { decryptApiKey } from '../utils/crypto';

const LOAD_BALANCING_BY_PLAN: Record<string, string> = {
  lite: 'single',
  standard: 'basic',
  smart: 'smart',
  intelligent: 'intelligent',
};

async function findCloudflareAccountId(cfAccountEmail: string, cfGlobalApiKey: string): Promise<string | null> {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts', {
    headers: { 'X-Auth-Email': cfAccountEmail, 'X-Auth-Key': cfGlobalApiKey, 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json() as { result?: Array<{ id: string }> };
  return data.result?.[0]?.id ?? null;
}

export async function handleListSites(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  const sites = await new SiteRepository(env.DB).findByUserId(userId);
  return success(sites.map(s => ({ id:s.id, site_name:s.site_name, domain:s.domain, status:s.status, created_at:s.created_at })));
}

export async function handleCreateSite(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
  try {
    const body = await request.json() as { site_name?:string; domain?:string };
    if (!body.site_name || body.site_name.trim().length < 2) return error('VALIDATION_ERROR','사이트 이름은 2자 이상이어야 합니다.');
    if (!body.domain || !isDomain(body.domain)) return error('VALIDATION_ERROR','올바른 도메인을 입력해주세요.');
    const user = await new UserRepository(env.DB).findByIdWithSecrets(userId);
    if (!user) return error('UNAUTHORIZED','로그인이 필요합니다.',401);
    if (user.status !== 'active' || !user.email_verified) return error('ACCOUNT_NOT_READY','이메일 인증과 Cloudflare Global API 키 등록을 완료해주세요.',403);
    if (!user.cf_account_email || !user.cf_global_api_key_encrypted) return error('CF_KEY_REQUIRED','Cloudflare Global API 키 등록이 필요합니다.',403);

    const paymentRepo = new PaymentRepository(env.DB);
    const paidOrder = await paymentRepo.findPaidOpenOrderForUser(userId);
    if (!paidOrder) return error('PAYMENT_REQUIRED','사이트를 만들려면 먼저 호스팅 플랜 결제가 필요합니다.',402);

    const cfGlobalApiKey = await decryptApiKey(user.cf_global_api_key_encrypted, env.ENCRYPTION_SECRET);
    const cfAccountId = await findCloudflareAccountId(user.cf_account_email, cfGlobalApiKey);
    if (!cfAccountId) return error('CF_ACCOUNT_NOT_FOUND','Cloudflare 계정 정보를 찾을 수 없습니다.',400);

    const svc = new ProvisioningService(env.DB, env.KV, cfGlobalApiKey, cfAccountId, user.cf_account_email, 'global_key');
    const result = await svc.provisionSite(userId, body.site_name.trim(), body.domain.trim(), {
      hostingOrderId: paidOrder.id,
      planType: paidOrder.plan_type,
      workerLoadBalancing: LOAD_BALANCING_BY_PLAN[paidOrder.plan_type] || 'single',
    });
    await paymentRepo.assignOrderToSite(paidOrder.id, result.site_id);
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
