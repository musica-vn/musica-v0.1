import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

/**
 * Lấy requestId từ response context (ưu tiên res.locals), fallback tự generate để đảm bảo
 * mọi API response đều có `requestId` theo contract.
 */
export const getOrCreateRequestId = (response: Response): string => {
  const existing =
    typeof response.locals.requestId === 'string' &&
    response.locals.requestId.length > 0
      ? response.locals.requestId
      : null;

  if (existing) return existing;

  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
};

/**
 * Timestamp ISO8601 dùng trong response envelope.
 */
export const getResponseTimestamp = (): string => new Date().toISOString();
