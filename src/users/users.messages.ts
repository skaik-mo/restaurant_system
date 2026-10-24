import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const USERS_ERRORS = {
  EMAIL_TAKEN: { code: 'USERS_EMAIL_TAKEN', message: 'A user with this email already exists' },
  NOT_FOUND: { code: 'USERS_NOT_FOUND', message: 'User not found' },
  CANNOT_MODIFY_SELF: { code: 'USERS_CANNOT_MODIFY_SELF', message: 'You cannot change your own role or status' },
  LAST_ADMIN: { code: 'USERS_LAST_ADMIN', message: 'At least one active admin must remain' },
} as const satisfies Record<string, ErrorDefinition>;

export const USERS_MESSAGES = {
  CREATED: 'User created successfully',
} as const;
