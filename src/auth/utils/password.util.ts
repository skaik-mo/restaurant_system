import { randomBytes } from 'node:crypto';
import { hashSecret, verifySecret } from '../../common/utils/hashing.util.js';


const DUMMY_HASH: Promise<string> = hashSecret(randomBytes(32).toString('hex'));

export function hashPassword(plain: string): Promise<string> {
  return hashSecret(plain);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return verifySecret(hash, plain);
}

/**
 * Timing-safe check for login. When the user doesn't exist (hash undefined),
 * still runs one full verification against a dummy hash, then returns false,
 * so "unknown email" and "wrong password" take the same time.
 */
export async function verifyPasswordOrDummy(
  hash: string | undefined,
  plain: string,
): Promise<boolean> {
  if (hash === undefined) {
    await verifySecret(await DUMMY_HASH, plain);
    return false;
  }
  return verifySecret(hash, plain);
}