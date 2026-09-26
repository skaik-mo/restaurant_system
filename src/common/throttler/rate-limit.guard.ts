import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * ThrottlerGuard that also sends the standard `Retry-After` header (seconds)
 * on 429, next to the library's per-throttler `Retry-After-<name>` headers.
 * HTTP clients and retry libraries understand `Retry-After` automatically.
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    response.setHeader('Retry-After', String(Math.max(1, Math.ceil(detail.timeToBlockExpire))));
    return super.throwThrottlingException(context, detail);
  }
}