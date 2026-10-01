import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' },
  INVALID_REFRESH_TOKEN: { code: 'AUTH_INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
  CURRENT_PASSWORD_INCORRECT: { code: 'AUTH_CURRENT_PASSWORD_INCORRECT', message: 'Current password is incorrect' },
  PASSWORD_UNCHANGED: { code: 'AUTH_PASSWORD_UNCHANGED', message: 'New password must be different from the current password' },
  INVALID_RESET_TOKEN: { code: 'AUTH_INVALID_RESET_TOKEN', message: 'Invalid or expired reset token' },
  INVALID_VERIFICATION_TOKEN: { code: 'AUTH_INVALID_VERIFICATION_TOKEN', message: 'Invalid or expired verification token' },
  EMAIL_ALREADY_VERIFIED: { code: 'AUTH_EMAIL_ALREADY_VERIFIED', message: 'Email is already verified' },
  VERIFICATION_EMAIL_FAILED: { code: 'AUTH_VERIFICATION_EMAIL_FAILED', message: 'Could not send verification email. Please try again later.' },
  PASSWORD_CHANGE_REQUIRED: { code: 'AUTH_PASSWORD_CHANGE_REQUIRED', message: 'Password change required before continuing' },
} as const satisfies Record<string, ErrorDefinition>;

export const AUTH_MESSAGES = {
  EMAIL_VERIFIED: 'Email verified',
  VERIFICATION_EMAIL_SENT: 'Verification email sent',
  FORGOT_PASSWORD_SENT: 'If an account exists for that email, a reset link has been sent.',
  PASSWORD_RESET: 'Password has been reset. Please log in with your new password.',
} as const;

export const AUTH_CONFIG_ERRORS = {
  WEAK_JWT_SECRET: (minLength: number) =>
    `JWT_ACCESS_SECRET must be at least ${minLength} random characters and not the .env.example placeholder`,
} as const;