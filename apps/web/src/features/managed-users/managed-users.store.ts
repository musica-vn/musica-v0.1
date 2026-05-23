import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createManagedUser, deleteManagedUser, listManagedUsers, updateManagedUser, updateManagedUserStatus } from './managed-users.api'
import type { CreateManagedUserPayload, ManagedRoleCode, ManagedUser, UpdateManagedUserPayload } from './managed-users.types'
import type { PaginationMeta } from '@musica/contracts'
import type { UserStatus } from '../auth/auth.types'

export const useManagedUsersStore = defineStore('managed-users', () => {
  const items = ref<ManagedUser[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const isLoading = ref(false)

  const page = computed(() => meta.value?.pagination.page ?? 1)
  const pageSize = computed(() => meta.value?.pagination.pageSize ?? 20)
  const totalItems = computed(() => meta.value?.pagination.totalItems ?? 0)

  const fetchUsers = async (params: {
    page: number
    pageSize: number
    q?: string
    status?: UserStatus
    roleCode?: ManagedRoleCode
  }) => {
    isLoading.value = true
    try {
      const response = await listManagedUsers(params)
      items.value = [...response.data.items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      meta.value = response.meta
    } finally {
      isLoading.value = false
    }
  }

  const createOne = async (payload: CreateManagedUserPayload) => {
    const response = await createManagedUser(payload)
    return response.data
  }

  const updateOne = async (userId: string, payload: UpdateManagedUserPayload) => {
    const response = await updateManagedUser(userId, payload)
    return response.data
  }

  const setStatus = async (userId: string, status: 'ACTIVE' | 'LOCKED') => {
    const response = await updateManagedUserStatus(userId, status)
    return response.data
  }

  const removeOne = async (userId: string) => {
    await deleteManagedUser(userId)
  }

  return {
    items,
    meta,
    isLoading,
    page,
    pageSize,
    totalItems,
    fetchUsers,
    createOne,
    updateOne,
    setStatus,
    removeOne,
  }
})
