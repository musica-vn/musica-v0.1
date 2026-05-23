import type { ListData, PaginationMeta } from '@musica/contracts'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/http'
import type { CreateAdminUserPayload, AdminUser, UpdateAdminUserPayload } from './admins.types'
import type { UserStatus } from '../auth/auth.types'

export const listAdmins = async (params: {
  page: number
  pageSize: number
  q?: string
  status?: UserStatus
}) => {
  return apiGet<ListData<AdminUser>, PaginationMeta>('/admin/users/admins', { params })
}

export const createAdmin = async (payload: CreateAdminUserPayload) => {
  return apiPost<AdminUser, CreateAdminUserPayload>('/admin/users/admins', payload)
}

export const updateAdmin = async (adminId: string, payload: UpdateAdminUserPayload) => {
  return apiPatch<AdminUser, UpdateAdminUserPayload>(`/admin/users/admins/${adminId}`, payload)
}

export const updateAdminStatus = async (adminId: string, status: 'ACTIVE' | 'LOCKED') => {
  return apiPatch<AdminUser, { status: 'ACTIVE' | 'LOCKED' }>(`/admin/users/admins/${adminId}/status`, {
    status,
  })
}

export const deleteAdmin = async (adminId: string) => {
  return apiDelete<{ ok: boolean }>(`/admin/users/admins/${adminId}`)
}

