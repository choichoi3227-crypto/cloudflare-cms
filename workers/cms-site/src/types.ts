import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
  ADMIN_PATH?: string;
  ADMIN_SECRET?: string;
  SITE_DOMAIN?: string;
  PHP_WASM_URL?: string;
  PHP_WASM_ENTRYPOINT?: string;
  PHP_WASM_MEMORY_PAGES?: string;
}
