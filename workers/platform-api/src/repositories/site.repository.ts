// workers/platform-api/src/repositories/site.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, now } from '@shared/utils/id';
import type { Site, WorkerInfo } from '@shared/types/site';

export class SiteRepository {
  constructor(private db: D1Database) {}
  async findById(id: string): Promise<Site | null> { return this.db.prepare('SELECT * FROM site_registry WHERE id=?').bind(id).first<Site>(); }
  async findByDomain(domain: string): Promise<Site | null> { return this.db.prepare('SELECT * FROM site_registry WHERE domain=?').bind(domain).first<Site>(); }
  async findByUserId(userId: string): Promise<Site[]> { const r = await this.db.prepare('SELECT * FROM site_registry WHERE user_id=? AND status=? ORDER BY created_at DESC').bind(userId,'active').all<Site>(); return r.results; }
  async create(data: { user_id:string; site_name:string; domain:string; worker_id:string|null; d1_id:string|null; kv_id:string|null }): Promise<Site> {
    const id = generateId('site'); const ts = now();
    await this.db.prepare('INSERT INTO site_registry (id,user_id,worker_id,site_name,domain,d1_id,kv_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,data.user_id,data.worker_id,data.site_name,data.domain,data.d1_id,data.kv_id,'provisioning',ts,ts).run();
    return { id, user_id:data.user_id, worker_id:data.worker_id, site_name:data.site_name, domain:data.domain, d1_id:data.d1_id, kv_id:data.kv_id, status:'provisioning', created_at:ts, updated_at:ts };
  }
  async updateProvisioning(id: string, workerId: string, d1Id: string, kvId: string): Promise<void> {
    await this.db.prepare('UPDATE site_registry SET worker_id=?,d1_id=?,kv_id=?,status=?,updated_at=? WHERE id=?').bind(workerId,d1Id,kvId,'active',now(),id).run();
  }
  async delete(id: string, userId: string): Promise<boolean> {
    const r = await this.db.prepare('UPDATE site_registry SET status=?,updated_at=? WHERE id=? AND user_id=?').bind('deleted',now(),id,userId).run();
    return r.meta.changes > 0;
  }
}

export class WorkerRepository {
  constructor(private db: D1Database) {}
  async create(data: { user_id:string; worker_name:string; worker_domain:string; worker_type:string }): Promise<WorkerInfo> {
    const id = generateId('wkr');
    await this.db.prepare('INSERT INTO workers_registry (id,user_id,worker_name,worker_domain,worker_type,status,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,data.user_id,data.worker_name,data.worker_domain,data.worker_type,'active',now()).run();
    return { id, user_id:data.user_id, worker_name:data.worker_name, worker_domain:data.worker_domain, worker_type:data.worker_type, status:'active', created_at:now() };
  }
}
