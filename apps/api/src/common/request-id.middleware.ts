import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existingRequestId =
      typeof req.headers[REQUEST_ID_HEADER] === 'string'
        ? req.headers[REQUEST_ID_HEADER]
        : undefined;

    const requestId = existingRequestId ?? randomUUID();

    res.setHeader(REQUEST_ID_HEADER, requestId);
    res.locals.requestId = requestId;

    next();
  }
}
