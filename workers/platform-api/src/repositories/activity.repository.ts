// workers/platform-api/src/repositories/activity.repository.ts
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, now } from '@shared/utils/id';
export class ActivityRepository {
  constructor(private db: D1Database) {}
  async log(data: { user_id:string; action:string; resource_type?:string; resource_id?:string; metadata?:Record<string,unknown>; ip_address?:string }): Promise<void> {
    await this.db.prepare('INSERT INTO activity_logs (id,user_id,action,resource_type,resource_id,metadata,ip_address,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(generateId('act'),data.user_id,data.action,data.resource_type||null,data.resource_id||null,data.metadata?JSON.stringify(data.metadata):null,data.ip_address||null,now()).run();
  }
}
