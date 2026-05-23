import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createAdmin, deleteAdmin, listAdmins, updateAdmin, updateAdminStatus } from './admins.api'
import type { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from './admins.types'
import type { PaginationMeta } from '@musica/contracts'
import type { UserStatus } from '../auth/auth.types'

export const useAdminsStore = defineStore('admins', () => {
  const items = ref<AdminUser[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const isLoading = ref(false)

  const page = computed(() => meta.value?.pagination.page ?? 1)
  const pageSize = computed(() => meta.value?.pagination.pageSize ?? 20)
  const totalItems = computed(() => meta.value?.pagination.totalItems ?? 0)

  const fetchAdmins = async (params: { page: number; pageSize: number; q?: string; status?: UserStatus }) => {
    isLoading.value = true
    try {
      const response = await listAdmins(params)
      items.value = response.data.items
      meta.value = response.meta
    } finally {
      isLoading.value = false
    }
  }

  const createOne = async (payload: CreateAdminUserPayload) => {
    const response = await createAdmin(payload)
    return response.data
  }

  const updateOne = async (adminId: string, payload: UpdateAdminUserPayload) => {
    const response = await updateAdmin(adminId, payload)
    return response.data
  }

  const setStatus = async (adminId: string, status: 'ACTIVE' | 'LOCKED') => {
    const response = await updateAdminStatus(adminId, status)
    return response.data
  }

  const removeOne = async (adminId: string) => {
    await deleteAdmin(adminId)
  }

  return {
    items,
    meta,
    isLoading,
    page,
    pageSize,
    totalItems,
    fetchAdmins,
    createOne,
    updateOne,
    setStatus,
    removeOne,
  }
})

