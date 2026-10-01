import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { COMMON_ERRORS } from '../errors/common.errors.js';
import type { ErrorDefinition } from '../errors/error-definition.js';
import { ErrorResponseDto } from '../dto/response/error-response.dto.js';

/**
 * Documents an error status using the SAME definitions the runtime throws, so
 * codes and messages can't drift. Lists every possible code in the description;
 * the example body uses the first one.
 */
export function ApiErrorResponse(status: number, ...errors: [ErrorDefinition, ...ErrorDefinition[]]) {
  const [first] = errors;
  const isValidation = first.code === COMMON_ERRORS.VALIDATION_FAILED.code;

  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({
      status,
      description: errors.map((e) => `- \`${e.code}\`: ${e.message}`).join('\n'),
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        example: {
          success: false,
          error: {
            code: first.code,
            message: first.message,
            ...(isValidation && { details: [{ field: 'email', message: 'email must be an email' }] }),
          },
        },
      },
    }),
  );
}