export function parseCorsOrigins(raw: string | undefined, isProduction: boolean): string[] {
  const values = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (values.length === 0 && isProduction) {
    throw new Error('CORS_ORIGINS must list at least one origin in production');
  }

  const origins = new Set<string>();
  for (const value of values) {
    origins.add(assertExactOrigin(value));
  }
  return [...origins];
}

function assertExactOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid origin: ${value}`);
  }
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
  if (!isHttp || url.origin !== value) {
    throw new Error(
      `CORS_ORIGINS entries must be exact origins like https://app.example.com (no path, no trailing slash, no wildcard): ${value}`,
    );
  }
  return value;
}
