import type { UserRoleName, UserStatus } from './auth.types'

export type AdminRoleSummary = {
  roleId: number
  roleName: UserRoleName
}

export type AdminUser = {
  id: string
  fullName: string
  email: string
  status: UserStatus
  roles: AdminRoleSummary[]
  createdAt: string
}

export type CreateAdminUserPayload = {
  email: string
  fullName: string
  password: string
  roleId?: number
}

export type UpdateAdminUserPayload = Partial<{
  email: string
  fullName: string
  password: string
  roleId: number
}>
