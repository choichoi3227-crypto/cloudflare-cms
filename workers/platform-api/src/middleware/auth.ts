// workers/platform-api/src/middleware/auth.ts
import type { Env, AuthenticatedRequest } from '../types';
import { unauthorized } from '../utils/response';
export function requireAuth(request: Request): Response | null {
  const userId = request.headers.get('X-User-Id');
  const cfToken = request.headers.get('X-CF-Token');
  const cfAccountId = request.headers.get('X-CF-Account-Id');
  if (!userId || !cfToken || !cfAccountId) return unauthorized();
  return null;
}
