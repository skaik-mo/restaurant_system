import type { ErrorDefinition } from './error-definition.js';

export const COMMON_ERRORS = {
  VALIDATION_FAILED: { code: 'COMMON_VALIDATION_FAILED', message: 'Validation failed' },
  UNAUTHORIZED: { code: 'COMMON_UNAUTHORIZED', message: 'Missing or invalid access token' },
  FORBIDDEN: { code: 'COMMON_FORBIDDEN', message: 'You do not have permission to perform this action' },
  NOT_FOUND: { code: 'COMMON_NOT_FOUND', message: 'Resource not found' },
  BAD_REQUEST: { code: 'COMMON_BAD_REQUEST', message: 'Bad request' },
  RATE_LIMITED: { code: 'COMMON_RATE_LIMITED', message: 'Too many requests, retry later' },
  INTERNAL: { code: 'COMMON_INTERNAL_ERROR', message: 'Internal server error' },
  HTTP_ERROR: { code: 'COMMON_HTTP_ERROR', message: 'Request failed' },
} as const satisfies Record<string, ErrorDefinition>;