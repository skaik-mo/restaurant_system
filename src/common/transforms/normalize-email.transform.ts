import { Transform } from 'class-transformer';
import { trimAndLowercase } from '../utils/text.util.js';

export const NormalizeEmail = () =>
    Transform(({ value }) =>
        (typeof value === 'string' ? trimAndLowercase(value) : value))