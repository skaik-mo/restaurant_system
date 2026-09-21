import { createHash } from 'node:crypto';

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}