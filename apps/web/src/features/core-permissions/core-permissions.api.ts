import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/http'
import type { PaginationMeta } from '@musica/contracts'
import type {
  AdminCorePermissionsListData,
  AdminCorePermissionsListQuery,
  CorePermission,
  CorePermissionStatus,
  CreateCorePermissionPayload,
  UpdateCorePermissionPayload,
} from './core-permissions.types'

export const listAdminCorePermissions = async (query: AdminCorePermissionsListQuery) => {
  return apiGet<AdminCorePermissionsListData, PaginationMeta>('/admin/core-permissions', { params: query })
}

export const createAdminCorePermission = async (payload: CreateCorePermissionPayload) => {
  return apiPost<CorePermission, CreateCorePermissionPayload>('/admin/core-permissions', payload)
}

export const updateAdminCorePermission = async (permissionId: string, payload: UpdateCorePermissionPayload) => {
  return apiPatch<CorePermission, UpdateCorePermissionPayload>(`/admin/core-permissions/${permissionId}`, payload)
}

export const updateAdminCorePermissionStatus = async (permissionId: string, status: CorePermissionStatus) => {
  return apiPatch<CorePermission, { status: CorePermissionStatus }>(`/admin/core-permissions/${permissionId}/status`, {
    status,
  })
}

export const deleteAdminCorePermission = async (permissionId: string) => {
  return apiDelete<{ ok: true }>(`/admin/core-permissions/${permissionId}`)
}

