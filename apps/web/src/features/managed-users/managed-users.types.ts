import type { UserStatus } from '../auth/auth.types'

export type ManagedRoleName = 'Buyer' | 'Artist'

export type ManagedUserRoleSummary = {
  roleId: number
  roleName: ManagedRoleName
}

export type ManagedUser = {
  id: string
  fullName: string
  email: string
  status: UserStatus
  roles: ManagedUserRoleSummary[]
  createdAt: string
}

export type CreateManagedUserPayload = {
  email: string
  fullName: string
  password: string
  roleName: ManagedRoleName
}

export type UpdateManagedUserPayload = Partial<{
  email: string
  fullName: string
  password: string
}>
