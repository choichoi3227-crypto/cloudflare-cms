// shared/src/constants/status.ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

export const POST_STATUS = { DRAFT: 'draft', SCHEDULED: 'scheduled', PUBLISHED: 'published', PRIVATE: 'private' } as const;
export const COMMENT_STATUS = { PENDING: 'pending', APPROVED: 'approved', SPAM: 'spam', DELETED: 'deleted' } as const;
export const DEPLOYMENT_STATUS = { PENDING: 'pending', BUILDING: 'building', DEPLOYING: 'deploying', SUCCESS: 'success', FAILED: 'failed' } as const;
