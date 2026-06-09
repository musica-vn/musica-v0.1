const isDomainErrorCode = (value: string): boolean =>
  /^[A-Z][A-Z0-9_]*$/.test(value);

type ParsedHttpExceptionResponse = {
  code: string;
  message: string;
  details?: unknown;
};

const readMessageFromBody = (body: unknown): string | null => {
  if (typeof body === 'string') return body;

  if (typeof body === 'object' && body !== null) {
    const messageValue = (body as Record<string, unknown>).message;
    if (typeof messageValue === 'string') return messageValue;
    if (Array.isArray(messageValue)) {
      const messages = messageValue.filter((x) => typeof x === 'string');
      return messages.length > 0 ? messages.join(', ') : null;
    }
  }

  return null;
};

const readCodeFromBody = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) return null;
  const codeValue = (body as Record<string, unknown>).code;
  return typeof codeValue === 'string' && codeValue.length > 0 ? codeValue : null;
};

/**
 * Parse HttpException.getResponse() thành `{ code, message, details }` để build ApiErrorResponse.
 *
 * Priority:
 * - explicit `code` trong response body
 * - validation (400 + message array) => VALIDATION_ERROR
 * - domain code dạng ALL_CAPS_UNDERSCORE trong string message
 * - fallback: HTTP_${statusCode}
 */
export const parseHttpExceptionResponse = (
  responseBody: unknown,
  statusCode: number,
  fallbackMessage: string,
): ParsedHttpExceptionResponse => {
  const explicitCode = readCodeFromBody(responseBody);
  const message = readMessageFromBody(responseBody) ?? fallbackMessage;

  const defaultCode = `HTTP_${statusCode}`;

  if (explicitCode) {
    return {
      code: explicitCode,
      message,
      details: typeof responseBody === 'object' ? responseBody : undefined,
    };
  }

  if (typeof responseBody === 'object' && responseBody !== null) {
    const messageValue = (responseBody as Record<string, unknown>).message;
    if (statusCode === 400 && Array.isArray(messageValue)) {
      return {
        code: 'VALIDATION_ERROR',
        message,
        details: responseBody,
      };
    }
  }

  if (typeof responseBody === 'string' && isDomainErrorCode(responseBody)) {
    return { code: responseBody, message: responseBody };
  }

  if (typeof message === 'string' && isDomainErrorCode(message)) {
    return {
      code: message,
      message,
      details: typeof responseBody === 'object' ? responseBody : undefined,
    };
  }

  return {
    code: defaultCode,
    message,
    details: typeof responseBody === 'object' ? responseBody : undefined,
  };
};
