import {
  CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ROLES_KEY } from './require-roles.decorator';
import type { AuthenticatedRequest } from './auth.types';
import { ApiHttpException } from '../errors/api-http.exception';

const normalizeRoleName = (roleName: string) =>
  roleName
    .trim()
    .replaceAll(/[\s-]+/g, '_')
    .toUpperCase();

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Guard phân quyền theo RequireRoles metadata, normalize roleName để tránh lệch format.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ApiHttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }

    const normalizedUserRole =
      typeof user.roleName === 'string'
        ? normalizeRoleName(user.roleName)
        : null;
    const normalizedRequiredRoles = requiredRoles.map(normalizeRoleName);
    const hasRole =
      typeof normalizedUserRole === 'string' &&
      normalizedRequiredRoles.includes(normalizedUserRole);
    if (!hasRole) {
      throw new ApiHttpException(
        { code: 'AUTH_INSUFFICIENT_ROLE' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
