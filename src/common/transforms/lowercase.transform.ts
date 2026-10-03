import { Transform } from 'class-transformer';

export const Lowercase = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value));