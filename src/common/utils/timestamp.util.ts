/**
 * Converts a Postgres timestamptz text value (e.g. "2026-09-23 16:17:31.614359+00")
 * to ISO 8601 ("2026-09-23T16:17:31.614Z"). Also accepts values that are already ISO.
 */
export function toIsoTimestamp(value: string): string {
  const normalized = value
    .replace(' ', 'T')                     // date/time separator
    .replace(/([+-]\d{2})$/, '$1:00');     // "+00" -> "+00:00"
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unparseable timestamp: ${value}`);
  }
  return date.toISOString();
}