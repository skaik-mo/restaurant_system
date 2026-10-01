import type { ConfigService } from '@nestjs/config';

/**
 * Fail-closed: Swagger is exposed only when SWAGGER_ENABLED is exactly "true",
 * or when it's unset and NODE_ENV is exactly "development". Anything else
 * (including a deployment that forgot NODE_ENV) means no /api and no /api-json.
 */
export function isSwaggerEnabled(config: ConfigService): boolean {
  const explicit = config.get<string>('SWAGGER_ENABLED');
  if (explicit !== undefined && explicit !== '') {
    return explicit === 'true';
  }
  return config.get<string>('NODE_ENV') === 'development';
}