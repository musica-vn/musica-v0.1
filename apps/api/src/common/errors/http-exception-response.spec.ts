import { parseHttpExceptionResponse } from './http-exception-response';

describe('parseHttpExceptionResponse', () => {
  it('maps domain code when responseBody is an ALL_CAPS string', () => {
    const parsed = parseHttpExceptionResponse(
      'PACKAGE_ALREADY_JOINED',
      409,
      'fallback',
    );
    expect(parsed).toEqual({
      code: 'PACKAGE_ALREADY_JOINED',
      message: 'PACKAGE_ALREADY_JOINED',
    });
  });

  it('falls back to HTTP status code when message is not a domain code', () => {
    const parsed = parseHttpExceptionResponse('Unauthorized', 401, 'fallback');
    expect(parsed.code).toBe('HTTP_401');
    expect(parsed.message).toBe('Unauthorized');
  });

  it('prefers explicit code in object responseBody', () => {
    const parsed = parseHttpExceptionResponse(
      { code: 'EMAIL_EXISTS', message: 'Email already exists' },
      409,
      'fallback',
    );
    expect(parsed.code).toBe('EMAIL_EXISTS');
    expect(parsed.message).toBe('Email already exists');
  });

  it('uses VALIDATION_ERROR for 400 with message array', () => {
    const parsed = parseHttpExceptionResponse(
      { statusCode: 400, message: ['email must be an email'], error: 'Bad Request' },
      400,
      'fallback',
    );
    expect(parsed.code).toBe('VALIDATION_ERROR');
    expect(parsed.message).toBe('email must be an email');
  });
});
