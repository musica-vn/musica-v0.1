import type { UserRole, UserStatus } from '../auth/auth.types'

export type AdminUser = {
  id: string
  fullName: string
  email: string
  status: UserStatus
  roleCodes: UserRole[]
  createdAt: string
}

export type CreateAdminUserPayload = {
  email: string
  fullName: string
  password: string
  roleCode?: 'ADMIN'
}

export type UpdateAdminUserPayload = Partial<{
  email: string
  fullName: string
  password: string
  roleCode: 'ADMIN'
}>

