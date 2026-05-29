import { CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { REQUIRE_ROLES_KEY } from './require-roles.decorator'
import type { AuthUserContext } from './auth.types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUserContext }>()
    const user = request.user
    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
    }

    const hasRole = typeof user.roleName === 'string' && requiredRoles.includes(user.roleName)
    if (!hasRole) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
    }

    return true
  }
}
