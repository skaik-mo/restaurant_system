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

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

// Offset of the zone from UTC at a given instant, in ms (local wall clock minus UTC)
function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The UTC instant at which the current calendar day started in the given IANA zone
export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const p = zonedParts(now, timeZone);
  const localMidnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  const firstGuess = localMidnightAsUtc - zoneOffsetMs(new Date(localMidnightAsUtc), timeZone);
  // Second pass corrects the guess when a DST change falls between the two instants
  return new Date(localMidnightAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}
