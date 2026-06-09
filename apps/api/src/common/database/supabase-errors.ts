import { ApiHttpException } from '../errors/api-http.exception';
import { readPostgresErrorCode } from './postgres-errors';

export const throwSupabaseError = (
  code: string,
  statusCode: number,
  error: unknown,
): never => {
  const supabaseCode = readPostgresErrorCode(error);
  throw new ApiHttpException(
    { code, details: supabaseCode ? { supabaseCode } : undefined },
    statusCode,
  );
};

