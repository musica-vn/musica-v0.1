import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@musica/contracts';

const getErrorMessage = (exception: HttpException, responseBody: unknown): string => {
  if (typeof responseBody === 'string') return responseBody;

  if (typeof responseBody === 'object' && responseBody !== null) {
    if ('message' in responseBody) {
      const message = (responseBody as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.filter((x) => typeof x === 'string').join(', ');
    }
  }

  return exception.message;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const requestId =
      typeof response.locals.requestId === 'string' ? response.locals.requestId : '';

    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const message = getErrorMessage(exception, responseBody);

      const body: ApiErrorResponse = {
        success: false,
        statusCode,
        error: {
          code: `HTTP_${statusCode}`,
          message,
          details: typeof responseBody === 'object' ? responseBody : undefined,
        },
        requestId,
        timestamp,
      };

      response.status(statusCode).json(body);
      return;
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        details: {
          path: request.url,
          method: request.method,
        },
      },
      requestId,
      timestamp,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
