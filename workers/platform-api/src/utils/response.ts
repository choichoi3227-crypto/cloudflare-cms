// workers/platform-api/src/utils/response.ts
import type { ApiResponse, ApiError, PaginationMeta } from '@shared/types/common';
export function success<T>(data: T, status: number = 200): Response { return new Response(JSON.stringify({ success:true, data } as ApiResponse<T>), { status, headers:{'Content-Type':'application/json'} }); }
export function successWithMeta<T>(data: T, meta: PaginationMeta): Response { return new Response(JSON.stringify({ success:true, data, meta } as ApiResponse<T>), { status:200, headers:{'Content-Type':'application/json'} }); }
export function error(code: string, message: string, status: number = 400, details?: Record<string, string[]>): Response { const err: ApiError = { code, message, details }; return new Response(JSON.stringify({ success:false, error:err } as ApiResponse<never>), { status, headers:{'Content-Type':'application/json'} }); }
export function unauthorized(message = '로그인이 필요합니다.'): Response { return error('UNAUTHORIZED', message, 401); }
export function notFound(message = '리소스를 찾을 수 없습니다.'): Response { return error('NOT_FOUND', message, 404); }
export function conflict(message: string): Response { return error('CONFLICT', message, 409); }
export function tooManyRequests(message = '요청이 너무 많습니다.'): Response { return error('TOO_MANY_REQUESTS', message, 429); }
export function internalError(message = '서버 오류가 발생했습니다.'): Response { return error('INTERNAL_ERROR', message, 500); }
