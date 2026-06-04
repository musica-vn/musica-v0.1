import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PaginationMeta } from '@musica/contracts'
import {
  createAdminDigitalRightConfig,
  createAdminExpressionConfig,
  createAdminModificationConfig,
  createAdminPhysicalRightConfig,
  deleteAdminDigitalRightConfig,
  deleteAdminExpressionConfig,
  deleteAdminModificationConfig,
  deleteAdminPhysicalRightConfig,
  listAdminDigitalRightConfigs,
  listAdminExpressionConfigs,
  listAdminModificationConfigs,
  listAdminPhysicalRightConfigs,
  updateAdminDigitalRightConfig,
  updateAdminDigitalRightConfigStatus,
  updateAdminExpressionConfig,
  updateAdminExpressionConfigStatus,
  updateAdminModificationConfig,
  updateAdminModificationConfigStatus,
  updateAdminPhysicalRightConfig,
  updateAdminPhysicalRightConfigStatus,
} from '../services/licensing-configs.service'
import type {
  CreateDigitalRightConfigPayload,
  CreateExpressionConfigPayload,
  CreateModificationConfigPayload,
  CreatePhysicalRightConfigPayload,
  DigitalRightConfig,
  DigitalRightConfigsListQuery,
  ExpressionConfig,
  GenericLicensingConfigsListQuery,
  LicensingConfigStatus,
  ModificationConfig,
  PhysicalRightConfig,
  UpdateDigitalRightConfigPayload,
  UpdateExpressionConfigPayload,
  UpdateModificationConfigPayload,
  UpdatePhysicalRightConfigPayload,
} from '../types/licensing-configs.types'

const createLicensingConfigStore = <
  TItem,
  TListQuery extends { page: number; pageSize: number },
  TCreatePayload,
  TUpdatePayload,
>(
  storeId: string,
  handlers: {
    list: (query: TListQuery) => Promise<{ data: { items: TItem[] }; meta: PaginationMeta }>
    create: (payload: TCreatePayload) => Promise<{ data: TItem }>
    update: (itemId: string, payload: TUpdatePayload) => Promise<{ data: TItem }>
    setStatus: (itemId: string, status: LicensingConfigStatus) => Promise<{ data: TItem }>
    remove: (itemId: string) => Promise<{ data: { ok: true } }>
  },
) =>
  defineStore(storeId, () => {
    const items = ref<TItem[]>([])
    const meta = ref<PaginationMeta | null>(null)
    const isLoading = ref(false)

    const page = computed(() => meta.value?.pagination.page ?? 1)
    const pageSize = computed(() => meta.value?.pagination.pageSize ?? 20)
    const totalItems = computed(() => meta.value?.pagination.totalItems ?? 0)

    const fetchItems = async (params: TListQuery) => {
      isLoading.value = true
      try {
        const response = await handlers.list(params)
        items.value = response.data.items
        meta.value = response.meta
      } finally {
        isLoading.value = false
      }
    }

    const createOne = async (payload: TCreatePayload) => {
      const response = await handlers.create(payload)
      return response.data
    }

    const updateOne = async (itemId: string, payload: TUpdatePayload) => {
      const response = await handlers.update(itemId, payload)
      return response.data
    }

    const setStatus = async (itemId: string, status: LicensingConfigStatus) => {
      const response = await handlers.setStatus(itemId, status)
      return response.data
    }

    const removeOne = async (itemId: string) => {
      await handlers.remove(itemId)
    }

    return {
      items,
      meta,
      isLoading,
      page,
      pageSize,
      totalItems,
      fetchItems,
      createOne,
      updateOne,
      setStatus,
      removeOne,
    }
  })

export const useDigitalRightConfigsStore = createLicensingConfigStore<
  DigitalRightConfig,
  DigitalRightConfigsListQuery,
  CreateDigitalRightConfigPayload,
  UpdateDigitalRightConfigPayload
>('digital-right-configs', {
  list: listAdminDigitalRightConfigs,
  create: createAdminDigitalRightConfig,
  update: updateAdminDigitalRightConfig,
  setStatus: updateAdminDigitalRightConfigStatus,
  remove: deleteAdminDigitalRightConfig,
})

export const usePhysicalRightConfigsStore = createLicensingConfigStore<
  PhysicalRightConfig,
  GenericLicensingConfigsListQuery,
  CreatePhysicalRightConfigPayload,
  UpdatePhysicalRightConfigPayload
>('physical-right-configs', {
  list: listAdminPhysicalRightConfigs,
  create: createAdminPhysicalRightConfig,
  update: updateAdminPhysicalRightConfig,
  setStatus: updateAdminPhysicalRightConfigStatus,
  remove: deleteAdminPhysicalRightConfig,
})

export const useExpressionConfigsStore = createLicensingConfigStore<
  ExpressionConfig,
  GenericLicensingConfigsListQuery,
  CreateExpressionConfigPayload,
  UpdateExpressionConfigPayload
>('expression-configs', {
  list: listAdminExpressionConfigs,
  create: createAdminExpressionConfig,
  update: updateAdminExpressionConfig,
  setStatus: updateAdminExpressionConfigStatus,
  remove: deleteAdminExpressionConfig,
})

export const useModificationConfigsStore = createLicensingConfigStore<
  ModificationConfig,
  GenericLicensingConfigsListQuery,
  CreateModificationConfigPayload,
  UpdateModificationConfigPayload
>('modification-configs', {
  list: listAdminModificationConfigs,
  create: createAdminModificationConfig,
  update: updateAdminModificationConfig,
  setStatus: updateAdminModificationConfigStatus,
  remove: deleteAdminModificationConfig,
})
