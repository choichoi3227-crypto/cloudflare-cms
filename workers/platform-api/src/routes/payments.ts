import type { Env } from '../types';
import { PaymentRepository, type HostingPlanType } from '../repositories/payment.repository';
import { success, error } from '../utils/response';
import { generateId } from '@shared/utils/id';

const PLAN_PRICES: Record<HostingPlanType, { krw: number; usd: number; productId: string; label: string }> = {
  lite: { krw: 9900, usd: 7.5, productId: 'cp-lite-monthly', label: '라이트 플랜' },
  standard: { krw: 19900, usd: 15, productId: 'cp-standard-monthly', label: '스탠다드 플랜' },
  smart: { krw: 34900, usd: 26, productId: 'cp-smart-monthly', label: '스마트 플랜' },
  intelligent: { krw: 59000, usd: 44, productId: 'cp-intelligent-monthly', label: '인텔리전트 플랜' },
};

async function getAdminSetting(env: Env, key: string): Promise<string | undefined> {
  const row = await env.DB.prepare('SELECT value FROM admin_settings WHERE key=?').bind(key).first<{ value: string }>();
  return row?.value || undefined;
}

async function getPayPalConfig(env: Env): Promise<{ clientId: string; clientSecret: string; baseUrl: string }> {
  const clientId = env.PAYPAL_CLIENT_ID || await getAdminSetting(env, 'paypal.clientId');
  const clientSecret = env.PAYPAL_CLIENT_SECRET || await getAdminSetting(env, 'paypal.clientSecret');
  const baseUrl = env.PAYPAL_API_BASE_URL || await getAdminSetting(env, 'paypal.apiBaseUrl') || 'https://api-m.paypal.com';
  if (!clientId || !clientSecret) throw new Error('PayPal 설정이 필요합니다.');
  return { clientId, clientSecret, baseUrl };
}

function getUserId(request: Request): string | null {
  return request.headers.get('X-User-Id');
}

function isPlanType(value: string): value is HostingPlanType {
  return value in PLAN_PRICES;
}

async function getPayPalAccessToken(env: Env): Promise<string> {
  const config = await getPayPalConfig(env);
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error('PayPal 인증에 실패했습니다.');
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function createPayPalOrder(env: Env, plan: HostingPlanType, billingNumber: string): Promise<{ id: string; approvalUrl: string | null }> {
  const token = await getPayPalAccessToken(env);
  const { baseUrl } = await getPayPalConfig(env);
  const siteUrl = env.PUBLIC_SITE_URL || 'http://localhost:4321';
  const price = PLAN_PRICES[plan];
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: billingNumber, description: `CloudPress ${price.label} 월 호스팅`, amount: { currency_code: 'USD', value: price.usd.toFixed(2) } }],
      application_context: {
        brand_name: 'CloudPress',
        user_action: 'PAY_NOW',
        return_url: `${siteUrl}/payment/complete?status=success&billing=${encodeURIComponent(billingNumber)}`,
        cancel_url: `${siteUrl}/payment/complete?status=failed&billing=${encodeURIComponent(billingNumber)}`,
      },
    }),
  });
  if (!response.ok) throw new Error('PayPal 주문 생성에 실패했습니다.');
  const data = await response.json() as { id: string; links?: Array<{ rel: string; href: string }> };
  return { id: data.id, approvalUrl: data.links?.find((link) => link.rel === 'approve')?.href ?? null };
}

async function capturePayPalOrder(env: Env, paypalOrderId: string): Promise<boolean> {
  const token = await getPayPalAccessToken(env);
  const { baseUrl } = await getPayPalConfig(env);
  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return response.ok;
}

export async function handleCreatePayment(request: Request, env: Env): Promise<Response> {
  const userId = getUserId(request);
  if (!userId) return error('UNAUTHORIZED', '로그인이 필요합니다.', 401);
  const body = await request.json() as { planType?: string; productId?: string; billingNumber?: string };
  if (!body.planType || !isPlanType(body.planType)) return error('VALIDATION_ERROR', '올바른 플랜을 선택해주세요.', 400);
  const price = PLAN_PRICES[body.planType];
  const billingNumber = body.billingNumber || generateId('bill');
  const repo = new PaymentRepository(env.DB);
  const order = await repo.createPending({ userId, planType: body.planType, productId: body.productId || price.productId, billingNumber, amountKRW: price.krw, amountUSD: price.usd });

  try {
    const paypal = await createPayPalOrder(env, body.planType, billingNumber);
    await repo.attachPayPalOrder(order.id, paypal.id);
    return success({ ...order, paypal_order_id: paypal.id, approvalUrl: paypal.approvalUrl, checkoutUrl: `/product/${body.planType}/${price.productId}/${billingNumber}` }, 201);
  } catch (err) {
    return error('PAYPAL_CREATE_FAILED', err instanceof Error ? err.message : 'PayPal 주문 생성에 실패했습니다.', 502);
  }
}

export async function handleCapturePayment(request: Request, env: Env): Promise<Response> {
  const userId = getUserId(request);
  if (!userId) return error('UNAUTHORIZED', '로그인이 필요합니다.', 401);
  const body = await request.json() as { paypalOrderId?: string };
  if (!body.paypalOrderId) return error('VALIDATION_ERROR', 'PayPal 주문 ID가 필요합니다.', 400);
  const repo = new PaymentRepository(env.DB);
  const ok = await capturePayPalOrder(env, body.paypalOrderId);
  if (!ok) {
    await repo.markFailedByPayPalOrder(body.paypalOrderId);
    return error('PAYMENT_FAILED', '결제 실패', 402);
  }
  const order = await repo.markPaidByPayPalOrder(body.paypalOrderId);
  return success({ order, message: '결제 완료!' });
}

export async function handlePaymentStatus(request: Request, env: Env): Promise<Response> {
  const userId = getUserId(request);
  if (!userId) return error('UNAUTHORIZED', '로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const paypalOrderId = url.searchParams.get('paypalOrderId');
  if (!paypalOrderId) return error('VALIDATION_ERROR', 'PayPal 주문 ID가 필요합니다.', 400);
  const order = await new PaymentRepository(env.DB).findByPayPalOrderId(paypalOrderId);
  if (!order || order.user_id !== userId) return error('NOT_FOUND', '결제 정보를 찾을 수 없습니다.', 404);
  return success(order);
}
