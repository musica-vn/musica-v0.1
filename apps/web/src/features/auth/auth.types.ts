export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'

export type UserRoleName = 'Super Admin' | 'Admin' | 'Artist' | 'Buyer'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  status: UserStatus
  roleId: number | null
  roleName: UserRoleName | null
}

export type AuthLoginData = {
  accessToken: string
  tokenType: 'Bearer'
  expiresInSeconds: number
  user: AuthUser
}
