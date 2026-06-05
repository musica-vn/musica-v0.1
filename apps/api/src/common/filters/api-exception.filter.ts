import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@musica/contracts';
import { parseHttpExceptionResponse } from '../errors/http-exception-response';
import {
  getOrCreateRequestId,
  getResponseTimestamp,
} from '../http/request-context';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  /**
   * Global exception filter để đảm bảo mọi lỗi đều trả về ApiErrorResponse theo `@musica/contracts`.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const requestId = getOrCreateRequestId(response);
    const timestamp = getResponseTimestamp();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const parsed = parseHttpExceptionResponse(
        responseBody,
        statusCode,
        exception.message,
      );

      const body: ApiErrorResponse = {
        success: false,
        statusCode,
        error: {
          code: parsed.code,
          message: parsed.message,
          details: parsed.details,
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
