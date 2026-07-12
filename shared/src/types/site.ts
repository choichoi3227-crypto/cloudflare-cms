// shared/src/types/site.ts
export interface Site {
  id: string;
  user_id: string;
  worker_id: string | null;
  site_name: string;
  domain: string;
  d1_id: string | null;
  kv_id: string | null;
  status: SiteStatus;
  wordpress_admin_username?: string | null;
  wordpress_admin_password_hint?: string | null;
  php_wasm_worker_name?: string | null;
  shard_count?: number;
  active_shard_key?: string;
  created_at: number;
  updated_at: number;
}

export type SiteStatus = 'provisioning' | 'active' | 'suspended' | 'deleted';

export interface WorkerInfo {
  id: string;
  user_id: string;
  worker_name: string;
  worker_domain: string;
  worker_type: WorkerType;
  status: string;
  created_at: number;
}

export type WorkerType = 'hub' | 'site' | 'system';
