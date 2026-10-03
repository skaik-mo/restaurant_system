import { applyDecorators } from '@nestjs/common';
import { Trim } from './trim.transform.js';
import { Lowercase } from './lowercase.transform.js';

export const NormalizeEmail = () => applyDecorators(Trim(), Lowercase());