import type { JwtSignOptions } from '@nestjs/jwt';

// A positive integer followed by one unit, e.g. 15m, 1h, 1d. Deliberately
// strict: a typo must fail at boot, not on the first login.
const EXPIRES_IN_PATTERN = /^[1-9]\d*(s|m|h|d)$/;

export function parseJwtExpiresIn(value: string): NonNullable<JwtSignOptions['expiresIn']> {
  if (!EXPIRES_IN_PATTERN.test(value)) {
    throw new Error(
      `JWT_ACCESS_EXPIRES_IN "${value}" is invalid: use a number followed by s, m, h or d (e.g. 15m, 1h)`,
    );
  }
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}