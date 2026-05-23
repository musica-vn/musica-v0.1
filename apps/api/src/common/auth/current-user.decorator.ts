import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthUserContext } from './auth.types'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserContext | null => {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>()
    const user = request.user
    if (typeof user !== 'object' || user === null) return null
    const userId = (user as any).userId
    const roles = (user as any).roles
    if (typeof userId !== 'string') return null
    if (!Array.isArray(roles) || !roles.every((x) => typeof x === 'string')) return null
    return { userId, roles }
  },
)

