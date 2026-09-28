import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const USERS_ERRORS = {
  EMAIL_TAKEN: { code: 'USERS_EMAIL_TAKEN', message: 'A user with this email already exists' },
} as const satisfies Record<string, ErrorDefinition>;