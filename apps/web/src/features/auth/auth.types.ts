export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ARTIST' | 'BUYER'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  status: UserStatus
}

export type AuthLoginData = {
  accessToken: string
  tokenType: 'Bearer'
  expiresInSeconds: number
  user: AuthUser
  roles: UserRole[]
}

