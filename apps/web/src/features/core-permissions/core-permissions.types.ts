import type { PaginationMeta } from '@musica/contracts'

export type CorePermissionStatus = 'ACTIVE' | 'INACTIVE'

export type CorePermission = {
  id: string
  code: string
  name: string
  lawReference: string
  status: CorePermissionStatus
  description: string | null
  createdAt: string
  updatedAt: string
}

export type AdminCorePermissionsListQuery = {
  page: number
  pageSize: number
  keyword?: string
  status?: CorePermissionStatus
}

export type AdminCorePermissionsListData = {
  items: CorePermission[]
}

export type AdminCorePermissionsListResult = {
  data: AdminCorePermissionsListData
  meta: PaginationMeta
}

export type CreateCorePermissionPayload = {
  code: string
  name: string
  lawReference: string
  description?: string
}

export type UpdateCorePermissionPayload = Partial<CreateCorePermissionPayload> & {
  status?: CorePermissionStatus
}
