import { applyDecorators, SetMetadata, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ENVELOPE_MESSAGE_KEY = 'envelopeMessage';

interface EnvelopeResponseOptions {
    status: number;
    description: string;
    /** DTO class of `data`. Omit for message-only responses. */
    type?: Type<unknown>;
    /** Success message. Sets both the Swagger example and the runtime `message`. */
    message?: string;
}

/**
 * Documents a success response as { success: true, data?, message? } in Swagger AND
 * supplies the runtime `message` read by ResponseEnvelopeInterceptor, so the
 * two can never drift apart.
 */
export function EnvelopeResponse({ status, description, type, message }: EnvelopeResponseOptions) {
    const decorators: Array<ClassDecorator | MethodDecorator> = [
        ApiResponse({
            status,
            description,
            schema: {
                type: 'object',
                required: ['success', ...(type ? ['data'] : [])],
                properties: {
                    success: { type: 'boolean', example: true },
                    ...(type && { data: { $ref: getSchemaPath(type) } }),
                    ...(message !== undefined && { message: { type: 'string', example: message } }),
                },
            },
        }),
    ];
    if (type) decorators.push(ApiExtraModels(type));
    if (message !== undefined) decorators.push(SetMetadata(ENVELOPE_MESSAGE_KEY, message));
    return applyDecorators(...decorators);
}