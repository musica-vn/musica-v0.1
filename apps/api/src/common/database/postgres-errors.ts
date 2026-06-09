/**
 * Helpers parse Postgres/PostgREST error shape an toàn với `unknown`.
 */
const readStringField = (value: unknown, key: string): string | null => {
  if (typeof value !== 'object' || value === null) return null;
  const fieldValue = (value as Record<string, unknown>)[key];
  return typeof fieldValue === 'string' ? fieldValue : null;
};

/**
 * Postgres error code cho unique violation: 23505.
 */
export const isUniqueViolation = (error: unknown): boolean =>
  readStringField(error, 'code') === '23505';

export const readPostgresErrorCode = (error: unknown): string | null =>
  readStringField(error, 'code');
