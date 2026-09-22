import { createHash } from 'node:crypto';
import { generateRandomToken } from './random-token.util.js';

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface EmailVerificationToken {
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export function createEmailVerificationToken(): EmailVerificationToken {
  const token = generateRandomToken();
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
  };
}