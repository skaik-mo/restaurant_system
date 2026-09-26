import { SetMetadata } from '@nestjs/common';

export const ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY = 'allowWhenPasswordChangeRequired';

/**
 * Lets a handler run even while the user must change their password.
 * Read by MustChangePasswordGuard. Use sparingly: only for routes needed to
 * complete the password change, learn about it, or end the session.
 */
export const AllowWhenPasswordChangeRequired = () =>
  SetMetadata(ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY, true);