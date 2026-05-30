import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

const normalizeRoleName = (roleName: string) =>
  roleName.trim().replaceAll(/[\s-]+/g, '_').toUpperCase();

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const normalizedUserRole =
      typeof user.roleName === 'string' ? normalizeRoleName(user.roleName) : null;
    const normalizedRequiredRoles = requiredRoles.map(normalizeRoleName);
    const isAllowed =
      typeof normalizedUserRole === 'string' &&
      normalizedRequiredRoles.includes(normalizedUserRole);

    if (!isAllowed) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
