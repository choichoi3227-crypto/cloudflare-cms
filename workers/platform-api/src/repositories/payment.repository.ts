import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@shared/utils/id';
import { now } from '@shared/utils/date';

export type HostingPlanType = 'lite' | 'standard' | 'smart' | 'intelligent';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface HostingOrder {
  id: string;
  user_id: string;
  hosting_id: string | null;
  plan_type: HostingPlanType;
  product_id: string;
  billing_number: string;
  amount_krw: number;
  amount_usd: number;
  currency: string;
  payment_provider: 'paypal';
  payment_status: PaymentStatus;
  paypal_order_id: string | null;
  paid_at: number | null;
  created_at: number;
  updated_at: number;
}

export class PaymentRepository {
  constructor(private db: D1Database) {}

  async createPending(data: { userId: string; planType: HostingPlanType; productId: string; billingNumber: string; amountKRW: number; amountUSD: number; paypalOrderId?: string | null }): Promise<HostingOrder> {
    const id = generateId('ord');
    const ts = now();
    await this.db.prepare(
      `INSERT INTO hosting_orders (id,user_id,hosting_id,plan_type,product_id,billing_number,amount_krw,amount_usd,currency,payment_provider,payment_status,paypal_order_id,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, data.userId, null, data.planType, data.productId, data.billingNumber, data.amountKRW, data.amountUSD, 'USD', 'paypal', 'pending', data.paypalOrderId ?? null, ts, ts).run();
    return this.findById(id) as Promise<HostingOrder>;
  }

  async attachPayPalOrder(id: string, paypalOrderId: string): Promise<void> {
    await this.db.prepare('UPDATE hosting_orders SET paypal_order_id=?,updated_at=? WHERE id=?').bind(paypalOrderId, now(), id).run();
  }

  async markPaidByPayPalOrder(paypalOrderId: string): Promise<HostingOrder | null> {
    const ts = now();
    const hostingId = generateId('hst');
    await this.db.prepare(`UPDATE hosting_orders SET payment_status='paid',hosting_id=?,paid_at=?,updated_at=? WHERE paypal_order_id=?`).bind(hostingId, ts, ts, paypalOrderId).run();
    return this.findByPayPalOrderId(paypalOrderId);
  }

  async markFailedByPayPalOrder(paypalOrderId: string): Promise<void> {
    await this.db.prepare(`UPDATE hosting_orders SET payment_status='failed',updated_at=? WHERE paypal_order_id=?`).bind(now(), paypalOrderId).run();
  }

  async findById(id: string): Promise<HostingOrder | null> {
    return this.db.prepare('SELECT * FROM hosting_orders WHERE id=?').bind(id).first<HostingOrder>();
  }

  async findByPayPalOrderId(paypalOrderId: string): Promise<HostingOrder | null> {
    return this.db.prepare('SELECT * FROM hosting_orders WHERE paypal_order_id=?').bind(paypalOrderId).first<HostingOrder>();
  }

  async findPaidOpenOrderForUser(userId: string): Promise<HostingOrder | null> {
    return this.db.prepare(`SELECT * FROM hosting_orders WHERE user_id=? AND payment_status='paid' AND hosting_id IS NOT NULL AND hosting_id NOT IN (SELECT COALESCE(hosting_order_id,'') FROM site_registry) ORDER BY paid_at ASC LIMIT 1`).bind(userId).first<HostingOrder>();
  }

  async assignOrderToSite(orderId: string, siteId: string): Promise<void> {
    await this.db.prepare('UPDATE site_registry SET hosting_order_id=? WHERE id=?').bind(orderId, siteId).run();
  }
}
