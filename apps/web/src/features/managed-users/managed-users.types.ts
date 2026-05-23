import type { UserStatus } from '../auth/auth.types'

export type ManagedRoleCode = 'BUYER' | 'ARTIST'

export type ManagedUser = {
  id: string
  fullName: string
  email: string
  status: UserStatus
  roleCodes: ManagedRoleCode[]
  createdAt: string
}

export type CreateManagedUserPayload = {
  email: string
  fullName: string
  password: string
  roleCode: ManagedRoleCode
}

export type UpdateManagedUserPayload = Partial<{
  email: string
  fullName: string
  password: string
}>
