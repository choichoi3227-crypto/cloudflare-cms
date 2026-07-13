// shared/src/utils/validation.ts
import type { ApiResponse, ApiError } from '../types/common';

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function isDomain(domain: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain);
}

export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.replace(/[<>'"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c] ?? c)).substring(0, maxLength);
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function createErrorResponse(code: string, message: string, details?: Record<string, string[]>): ApiResponse<never> {
  const error: ApiError = { code, message, details };
  return { success: false, error };
}
