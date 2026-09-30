import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const HEALTH_ERRORS = {
  DATABASE_UNAVAILABLE: { code: 'HEALTH_DATABASE_UNAVAILABLE', message: 'Database unreachable' },
} as const satisfies Record<string, ErrorDefinition>;