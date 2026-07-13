// platform/src/env.d.ts
/// <reference types="astro/client" />
interface CloudflareEnv {
  CF_D1: D1Database;
  CF_KV: KVNamespace;
}
declare namespace App {
  interface Locals {
    user: { id: string; email: string; username: string; avatar_url: string | null } | null;
  }
}
