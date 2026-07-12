// workers/platform-api/src/middleware/rate-limit.ts
export async function rateLimit(key: string, limit: number, windowMs: number, kv: KVNamespace): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now(); const windowKey = `rl:${key}`;
  try {
    const entry = await kv.get<{ count: number; resetAt: number }>(windowKey, 'json');
    if (!entry || entry.resetAt <= now) {
      await kv.put(windowKey, JSON.stringify({ count:1, resetAt:now+windowMs }), { expirationTtl:Math.ceil(windowMs/1000)+10 });
      return { allowed:true, remaining:limit-1, resetAt:now+windowMs };
    }
    if (entry.count >= limit) return { allowed:false, remaining:0, resetAt:entry.resetAt };
    entry.count += 1;
    await kv.put(windowKey, JSON.stringify(entry), { expirationTtl:Math.ceil(windowMs/1000)+10 });
    return { allowed:true, remaining:limit-entry.count, resetAt:entry.resetAt };
  } catch { return { allowed:true, remaining:limit, resetAt:now+windowMs }; }
}
