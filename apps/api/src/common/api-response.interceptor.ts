import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from '@musica/contracts';

export type ApiEnvelopePayload<TData, TMeta = undefined> = {
  data: TData;
  meta?: TMeta;
};

const isEnvelopePayload = (
  value: unknown,
): value is ApiEnvelopePayload<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'data' in value &&
  !('success' in value);

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown, unknown>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((value) => {
        const requestId =
          typeof response.locals.requestId === 'string'
            ? response.locals.requestId
            : '';

        const timestamp = new Date().toISOString();
        const statusCode = response.statusCode;

        const payload = isEnvelopePayload(value)
          ? { data: value.data ?? null, meta: value.meta }
          : { data: value ?? null, meta: undefined };

        return {
          success: true,
          statusCode,
          data: payload.data,
          meta: payload.meta,
          requestId,
          timestamp,
        };
      }),
    );
  }
}
