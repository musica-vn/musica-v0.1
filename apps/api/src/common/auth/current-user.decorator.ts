import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthUserContext } from './auth.types'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserContext | null => {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>()
    const user = request.user
    if (typeof user !== 'object' || user === null) return null
    const userId = (user as any).userId
    const roleId = (user as any).roleId
    const roleName = (user as any).roleName
    if (typeof userId !== 'string') return null
    if (roleId !== null && typeof roleId !== 'number') return null
    if (roleName !== null && typeof roleName !== 'string') return null
    return { userId, roleId: roleId ?? null, roleName: roleName ?? null }
  },
)
