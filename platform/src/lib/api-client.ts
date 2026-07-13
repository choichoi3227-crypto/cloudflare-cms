// platform/src/lib/api-client.ts
import type { ApiResponse } from '@shared/types/common';
const PLATFORM_API = import.meta.env.PLATFORM_API_URL || 'http://localhost:8787';

async function request<T>(path: string, options: RequestInit = {}, sessionId?: string | null): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (sessionId) headers['X-Session'] = sessionId;
  const response = await fetch(`${PLATFORM_API}${path}`, { ...options, headers });
  return response.json() as Promise<ApiResponse<T>>;
}

export const apiClient = {
  get: <T>(path: string, sessionId?: string | null) => request<T>(path, { method: 'GET' }, sessionId),
  post: <T>(path: string, body?: unknown, sessionId?: string | null) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, sessionId),
  put: <T>(path: string, body?: unknown, sessionId?: string | null) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }, sessionId),
  delete: <T>(path: string, sessionId?: string | null) => request<T>(path, { method: 'DELETE' }, sessionId),
};
