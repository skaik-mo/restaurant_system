import type { ConfigService } from '@nestjs/config';

export function getAppTimeZone(config: ConfigService): string {
  const timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions();
  } catch {
    throw new Error(
      `APP_TIMEZONE "${timeZone}" is not a valid IANA time zone (e.g. Asia/Hebron, Asia/Qatar)`,
    );
  }
  return timeZone;
}