const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const { sqlState, constraint: actual } = err as { sqlState?: unknown; constraint?: unknown };
  return sqlState === PG_UNIQUE_VIOLATION && actual === constraint;
}