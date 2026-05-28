import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createAdminCorePermission,
  deleteAdminCorePermission,
  listAdminCorePermissions,
  updateAdminCorePermission,
  updateAdminCorePermissionStatus,
} from './core-permissions.api'
import type { CorePermission, CorePermissionStatus, CreateCorePermissionPayload, UpdateCorePermissionPayload } from './core-permissions.types'
import type { PaginationMeta } from '@musica/contracts'

export const useCorePermissionsStore = defineStore('core-permissions', () => {
  const items = ref<CorePermission[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const isLoading = ref(false)

  const page = computed(() => meta.value?.pagination.page ?? 1)
  const pageSize = computed(() => meta.value?.pagination.pageSize ?? 20)
  const totalItems = computed(() => meta.value?.pagination.totalItems ?? 0)

  const activeItems = computed(() => items.value.filter((x) => x.status === 'ACTIVE'))

  const fetchCorePermissions = async (params: { page: number; pageSize: number; keyword?: string; status?: CorePermissionStatus }) => {
    isLoading.value = true
    try {
      const response = await listAdminCorePermissions(params)
      items.value = response.data.items
      meta.value = response.meta
    } finally {
      isLoading.value = false
    }
  }

  const createOne = async (payload: CreateCorePermissionPayload) => {
    const response = await createAdminCorePermission(payload)
    return response.data
  }

  const updateOne = async (permissionId: string, payload: UpdateCorePermissionPayload) => {
    const response = await updateAdminCorePermission(permissionId, payload)
    return response.data
  }

  const setStatus = async (permissionId: string, status: CorePermissionStatus) => {
    const response = await updateAdminCorePermissionStatus(permissionId, status)
    return response.data
  }

  const removeOne = async (permissionId: string) => {
    await deleteAdminCorePermission(permissionId)
  }

  return {
    items,
    meta,
    isLoading,
    page,
    pageSize,
    totalItems,
    activeItems,
    fetchCorePermissions,
    createOne,
    updateOne,
    setStatus,
    removeOne,
  }
})
