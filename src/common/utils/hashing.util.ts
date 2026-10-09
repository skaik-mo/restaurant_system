import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';

// Fast hash for high-entropy random tokens only (never for passwords)
export function sha256Hex(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
}

export function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export function verifySecret(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}