import type { ListData, PaginationMeta } from '@musica/contracts'
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/axios'
import type { CreateManagedUserPayload, ManagedRoleName, ManagedUser, UpdateManagedUserPayload } from '../types/managed-users.types'
import type { UserStatus } from '../types/auth.types'

export const listManagedUsers = async (params: {
  page: number
  pageSize: number
  q?: string
  status?: UserStatus
  roleName?: ManagedRoleName
}) => {
  return apiGet<ListData<ManagedUser>, PaginationMeta>('/admin/users', { params })
}

export const createManagedUser = async (payload: CreateManagedUserPayload) => {
  return apiPost<ManagedUser, CreateManagedUserPayload>('/admin/users', payload)
}

export const updateManagedUser = async (userId: string, payload: UpdateManagedUserPayload) => {
  return apiPatch<ManagedUser, UpdateManagedUserPayload>(`/admin/users/${userId}`, payload)
}

export const updateManagedUserStatus = async (userId: string, status: 'ACTIVE' | 'LOCKED') => {
  return apiPatch<ManagedUser, { status: 'ACTIVE' | 'LOCKED' }>(`/admin/users/${userId}/status`, { status })
}

export const deleteManagedUser = async (userId: string) => {
  return apiDelete<{ ok: boolean }>(`/admin/users/${userId}`)
}
