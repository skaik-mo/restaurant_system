import type { ConfigService } from '@nestjs/config';

const MIN_SECRET_LENGTH = 32;

export const JWT_ALGORITHM = 'HS256' as const;

/**
 * Reads JWT_ACCESS_SECRET and fails at boot if it is missing, too short, or still
 * the .env.example placeholder. A weak secret can be brute-forced offline from
 * any captured token.
 */
export function getJwtAccessSecret(config: ConfigService): string {
  const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
  if (secret.length < MIN_SECRET_LENGTH || secret.startsWith('replace-with')) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} random characters and not the .env.example placeholder`,
    );
  }
  return secret;
}