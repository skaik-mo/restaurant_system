import { hashSecret, verifySecret } from '../../common/utils/hashing.util.js';

export interface ParsedRefreshToken {
  rowId: number;
  secret: string;
}

export function buildRefreshToken(rowId: number, secret: string): string {
  return `${rowId}.${secret}`;
}

export function parseRefreshToken(token: string): ParsedRefreshToken | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const rowId = Number(token.slice(0, dotIndex));
  const secret = token.slice(dotIndex + 1);

  if (!Number.isInteger(rowId) || rowId <= 0 || !secret) return null;

  return { rowId, secret };
}

export function hashRefreshToken(token: string): Promise<string> {
  return hashSecret(token);
}

export function verifyRefreshToken(hash: string, token: string): Promise<boolean> {
  return verifySecret(hash, token);
}