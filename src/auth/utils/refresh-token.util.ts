import * as argon2 from 'argon2';

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
  return argon2.hash(token);
}

export function verifyRefreshToken(hash: string, token: string): Promise<boolean> {
  return argon2.verify(hash, token);
}