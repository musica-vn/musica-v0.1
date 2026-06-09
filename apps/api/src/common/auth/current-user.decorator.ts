import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUserContext } from './auth.types';

const isAuthUserContext = (value: unknown): value is AuthUserContext => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;

  const userId = record.userId;
  const roleId = record.roleId;
  const roleName = record.roleName;

  if (typeof userId !== 'string' || userId.length === 0) return false;
  if (roleId !== null && typeof roleId !== 'number') return false;
  if (roleName !== null && typeof roleName !== 'string') return false;

  return true;
};

/**
 * Decorator lấy thông tin user đã được JwtAuthGuard attach vào request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserContext | null => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return isAuthUserContext(request.user) ? request.user : null;
  },
);
