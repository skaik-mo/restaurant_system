import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import { COMMON_ERRORS } from './common.errors.js';
import type { ErrorDefinition } from './error-definition.js';

// Used when a framework-generated error (guard, throttler, router) has no code of its own.
const DEFAULT_ERRORS: Readonly<Record<number, ErrorDefinition>> = {
    401: COMMON_ERRORS.UNAUTHORIZED,
    403: COMMON_ERRORS.FORBIDDEN,
    404: COMMON_ERRORS.NOT_FOUND,
    429: COMMON_ERRORS.RATE_LIMITED,
};

/**
 * Every error response becomes { statusCode, code, message, error }.
 * Response bodies without a `message` (e.g. /health's { status: 'error' })
 * are not in this format and pass through unchanged.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const response = host.switchToHttp().getResponse();

        if (!(exception instanceof HttpException)) {
            // Unexpected error: log it, tell the client nothing about it.
            this.logger.error(
                exception instanceof Error ? exception.message : String(exception),
                exception instanceof Error ? exception.stack : undefined,
            );
            httpAdapter.reply(
                response,
                {
                    statusCode: 500,
                    code: COMMON_ERRORS.INTERNAL.code,
                    message: COMMON_ERRORS.INTERNAL.message,
                    error: STATUS_CODES[500],
                },
                500,
            );
            return;
        }

        const status = exception.getStatus();
        httpAdapter.reply(response, this.normalize(status, exception.getResponse()), status);
    }

    private normalize(status: number, raw: string | object): unknown {
        const body = typeof raw === 'string' ? { message: raw } : raw;
        if (!('message' in body)) {
            return body;
        }

        const { code, message } = body as { code?: string; message: string | string[] };
        const fallback = DEFAULT_ERRORS[status];

        return {
            statusCode: status,
            code: code ?? fallback?.code ?? (status === 400 ? COMMON_ERRORS.BAD_REQUEST.code : COMMON_ERRORS.HTTP_ERROR.code),
            message: code === undefined && fallback ? fallback.message : message,
            error: STATUS_CODES[status] ?? 'Error',
        };
    }
}