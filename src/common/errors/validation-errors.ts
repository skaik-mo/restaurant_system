import { BadRequestException, type ValidationError } from '@nestjs/common';
import { COMMON_ERRORS } from './common.errors.js';

interface FieldError {
  field: string;
  message: string;
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export function toValidationException(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    code: COMMON_ERRORS.VALIDATION_FAILED.code,
    message: COMMON_ERRORS.VALIDATION_FAILED.message,
    details: flatten(errors),
  });
}