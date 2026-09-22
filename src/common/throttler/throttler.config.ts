import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;

export const THROTTLER_NAMES = ['ip', 'email', 'user'] as const;
export type ThrottlerName = (typeof THROTTLER_NAMES)[number];

type TrackableRequest = Record<string, unknown>;

function ipTracker(req: TrackableRequest): string {
  return `ip:${String(req.ip)}`;
}

function emailTracker(req: TrackableRequest): string {
  const body = req.body as { email?: unknown } | undefined;
  const email = body?.email;
  if (typeof email === 'string' && email.trim() !== '') {
    return `email:${email.trim().toLowerCase()}`;
  }
  return ipTracker(req);
}

function userTracker(req: TrackableRequest): string {
  const user = req.user as { sub?: unknown } | undefined;
  return typeof user?.sub === 'number' ? `user:${user.sub}` : ipTracker(req);
}

export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'ip', ttl: MINUTE_MS, limit: 30, getTracker: ipTracker },
    { name: 'email', ttl: MINUTE_MS, limit: 5, getTracker: emailTracker },
    { name: 'user', ttl: 15 * MINUTE_MS, limit: 3, getTracker: userTracker },
  ],
};