import { HttpException } from '@nestjs/common';

export type ApiHttpExceptionPayload = {
  code: string;
  message?: string;
  details?: unknown;
};

/**
 * HttpException wrapper chuẩn hoá response body để ApiExceptionFilter có thể map `error.code`
 * theo business code ổn định.
 */
export class ApiHttpException extends HttpException {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(payload: ApiHttpExceptionPayload, statusCode: number) {
    super(
      {
        code: payload.code,
        message: payload.message ?? payload.code,
        details: payload.details,
      },
      statusCode,
    );
    this.code = payload.code;
    this.details = payload.details;
  }
}
