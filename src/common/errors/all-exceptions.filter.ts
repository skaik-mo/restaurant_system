import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import { COMMON_ERRORS } from './common.errors.js';
import type { ErrorDefinition } from './error-definition.js';

// Used when a framework-generated error (guard, throttler, router, body parser) has no code of its own.
const DEFAULT_ERRORS: Readonly<Record<number, ErrorDefinition>> = {
    400: COMMON_ERRORS.BAD_REQUEST,
    401: COMMON_ERRORS.UNAUTHORIZED,
    403: COMMON_ERRORS.FORBIDDEN,
    404: COMMON_ERRORS.NOT_FOUND,
    429: COMMON_ERRORS.RATE_LIMITED,
};

// Every error response becomes { success: false, error: { code, message, details? } }
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
            httpAdapter.reply(response, this.body(COMMON_ERRORS.INTERNAL), 500);
            return;
        }

        const status = exception.getStatus();
        httpAdapter.reply(response, this.fromHttpException(status, exception.getResponse()), status);
    }

    private fromHttpException(status: number, raw: string | object) {
        const own = typeof raw === 'object' ? (raw as { code?: unknown; message?: unknown; details?: unknown }) : {};

        // Thrown by our code (or the validation factory): carries its own code and message.
        if (typeof own.code === 'string' && typeof own.message === 'string') {
            return this.body({ code: own.code, message: own.message }, own.details);
        }

        // Framework-generated: replace the framework's text with a controlled message.
        return this.body(
            DEFAULT_ERRORS[status] ?? {
                code: COMMON_ERRORS.HTTP_ERROR.code,
                message: STATUS_CODES[status] ?? COMMON_ERRORS.HTTP_ERROR.message,
            },
        );
    }

    private body(error: ErrorDefinition, details?: unknown) {
        return {
            success: false,
            error: { code: error.code, message: error.message, ...(details !== undefined && { details }) },
        }
    }
}