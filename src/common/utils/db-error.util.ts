const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function isConstraintViolation(err: unknown, sqlState: string, constraint: string): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const { sqlState: actualState, constraint: actual } = err as { sqlState?: unknown; constraint?: unknown };
  return actualState === sqlState && actual === constraint;
}

export function isUniqueViolation(err: unknown, constraint: string): boolean {
  return isConstraintViolation(err, PG_UNIQUE_VIOLATION, constraint);
}

export function isForeignKeyViolation(err: unknown, constraint: string): boolean {
  return isConstraintViolation(err, PG_FOREIGN_KEY_VIOLATION, constraint);
}