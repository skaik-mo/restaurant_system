import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { ENVELOPE_MESSAGE_KEY } from './envelope-response.decorator.js';

/**
 * Wraps every successful response as { success: true, data?, message? }.
 * A handler that returns nothing and has no message (logout, 204) sends no body.
 * Errors are shaped by AllExceptionsFilter, not here.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message = this.reflector.getAllAndOverride<string | undefined>(ENVELOPE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data: unknown) => {
        const hasData = data !== undefined && data !== null;
        if (!hasData && message === undefined) {
          return data;
        }
        return {
          success: true,
          ...(hasData && { data }),
          ...(message !== undefined && { message }),
        };
      }),
    );
  }
}