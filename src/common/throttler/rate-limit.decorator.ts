import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { THROTTLER_NAMES, type ThrottlerName } from './throttler.config.js';

interface Limit {
  limit: number;
  ttl: number;
}

export type RateLimits = Partial<Record<ThrottlerName, Limit>>;

export function RateLimit(limits: RateLimits) {
  const applied: Record<string, Limit> = {};
  const skipped: Record<string, boolean> = {};

  for (const name of THROTTLER_NAMES) {
    const limit = limits[name];
    if (limit) {
      applied[name] = limit;
    } else {
      skipped[name] = true;
    }
  }

  return applyDecorators(Throttle(applied), SkipThrottle(skipped));
}