<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../../shared/api/http'
import { useCorePermissionsStore } from '../../core-permissions/core-permissions.store'
import {
  useDigitalRightConfigsStore,
  useExpressionConfigsStore,
  useModificationConfigsStore,
  usePhysicalRightConfigsStore,
} from '../../licensing-configs/licensing-configs.store'
import type {
  CreateDigitalRightConfigPayload,
  CreateExpressionConfigPayload,
  CreateModificationConfigPayload,
  CreatePhysicalRightConfigPayload,
  DigitalDurationType,
  DigitalPlatform,
  DigitalRightConfig,
  ExpressionConfig,
  LicensingConfigResource,
  LicensingConfigStatus,
  ModificationConfig,
  PhysicalRightConfig,
  ReferencedPermissionSummary,
  UpdateDigitalRightConfigPayload,
  UpdateExpressionConfigPayload,
  UpdateModificationConfigPayload,
  UpdatePhysicalRightConfigPayload,
} from '../../licensing-configs/licensing-configs.types'

type AnyLicensingConfig = DigitalRightConfig | PhysicalRightConfig | ExpressionConfig | ModificationConfig

const props = defineProps<{
  resource: LicensingConfigResource
}>()

const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const textAreaClass =
  'min-h-[140px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'
const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'

const resourceConfigMap: Record<
  LicensingConfigResource,
  {
    title: string
    description: string
    createLabel: string
    detailColumnLabel: string
    detailPlaceholder: string
    priceLabel: string
    emptyState: string
    supportsDigitalFilters: boolean
  }
> = {
  digital: {
    title: 'Digital Rights',
    description:
      'Quản lý cấu hình bản quyền nền tảng số theo từng platform, duration và tập core permissions đính kèm.',
    createLabel: 'Thêm gói digital',
    detailColumnLabel: 'Platform / Duration',
    detailPlaceholder: 'Platform + duration',
    priceLabel: 'Base multiplier',
    emptyState: 'Chưa có digital right config nào.',
    supportsDigitalFilters: true,
  },
  physical: {
    title: 'Physical Rights',
    description:
      'Quản lý các loại hình sử dụng âm nhạc ngoài đời thực và hệ số giá áp dụng cho từng bối cảnh offline.',
    createLabel: 'Thêm gói physical',
    detailColumnLabel: 'Venue / Usage type',
    detailPlaceholder: 'Loại hình sử dụng',
    priceLabel: 'Base multiplier',
    emptyState: 'Chưa có physical right config nào.',
    supportsDigitalFilters: false,
  },
  expression: {
    title: 'Expression Configs',
    description:
      'Quản lý hình thức biểu hiện của sản phẩm âm nhạc, hệ số giá và các quyền cốt lõi bắt buộc đi kèm.',
    createLabel: 'Thêm expression',
    detailColumnLabel: 'Expression name',
    detailPlaceholder: 'Tên hình thức biểu hiện',
    priceLabel: 'Price multiplier',
    emptyState: 'Chưa có expression config nào.',
    supportsDigitalFilters: false,
  },
  modification: {
    title: 'Modification Configs',
    description:
      'Quản lý mức độ biến đổi tác phẩm, hệ số giá và tập core permissions phải có khi can thiệp tác phẩm gốc.',
    createLabel: 'Thêm modification',
    detailColumnLabel: 'Modification name',
    detailPlaceholder: 'Tên mức độ biến đổi',
    priceLabel: 'Price multiplier',
    emptyState: 'Chưa có modification config nào.',
    supportsDigitalFilters: false,
  },
}

const digitalStore = useDigitalRightConfigsStore()
const physicalStore = usePhysicalRightConfigsStore()
const expressionStore = useExpressionConfigsStore()
const modificationStore = useModificationConfigsStore()
const corePermissionsStore = useCorePermissionsStore()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const filters = reactive<{
  keyword: string
  status: LicensingConfigStatus | ''
  targetPlatform: DigitalPlatform | ''
  durationType: DigitalDurationType | ''
}>({
  keyword: '',
  status: '',
  targetPlatform: '',
  durationType: '',
})

const pagination = reactive({ page: 1, pageSize: 20 })

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedItem = ref<AnyLicensingConfig | null>(null)
const isSubmitting = ref(false)

const form = reactive<{
  code: string
  targetPlatform: DigitalPlatform
  durationType: DigitalDurationType
  basePriceMultiplier: number
  venueUsageType: string
  name: string
  priceMultiplier: number
  referencedPermissionIds: string[]
}>({
  code: '',
  targetPlatform: 'YOUTUBE',
  durationType: 'ONE_YEAR',
  basePriceMultiplier: 1,
  venueUsageType: '',
  name: '',
  priceMultiplier: 1,
  referencedPermissionIds: [],
})

const currentResource = computed(() => resourceConfigMap[props.resource])

const currentItems = computed<AnyLicensingConfig[]>(() => {
  switch (props.resource) {
    case 'digital':
      return digitalStore.items
    case 'physical':
      return physicalStore.items
    case 'expression':
      return expressionStore.items
    case 'modification':
      return modificationStore.items
  }
})

const currentMeta = computed(() => {
  switch (props.resource) {
    case 'digital':
      return digitalStore.meta
    case 'physical':
      return physicalStore.meta
    case 'expression':
      return expressionStore.meta
    case 'modification':
      return modificationStore.meta
  }
})

const currentIsLoading = computed(() => {
  switch (props.resource) {
    case 'digital':
      return digitalStore.isLoading
    case 'physical':
      return physicalStore.isLoading
    case 'expression':
      return expressionStore.isLoading
    case 'modification':
      return modificationStore.isLoading
  }
})

const currentTotalItems = computed(() => {
  switch (props.resource) {
    case 'digital':
      return digitalStore.totalItems
    case 'physical':
      return physicalStore.totalItems
    case 'expression':
      return expressionStore.totalItems
    case 'modification':
      return modificationStore.totalItems
  }
})

const totalPages = computed(() => currentMeta.value?.pagination.totalPages ?? 1)
const pageStart = computed(() => (currentTotalItems.value === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, currentTotalItems.value))

const mergedPermissionOptions = computed<ReferencedPermissionSummary[]>(() => {
  const activePermissions = corePermissionsStore.activeItems.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    lawReference: item.lawReference,
  }))

  const selectedPermissions = selectedItem.value?.referencedPermissions ?? []
  const permissionMap = new Map<string, ReferencedPermissionSummary>()

  for (const permission of [...selectedPermissions, ...activePermissions]) {
    permissionMap.set(permission.id, permission)
  }

  return [...permissionMap.values()]
})

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = error.message
    return
  }

  errorMessage.value = error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

const resetForm = () => {
  form.code = ''
  form.targetPlatform = 'YOUTUBE'
  form.durationType = 'ONE_YEAR'
  form.basePriceMultiplier = 1
  form.venueUsageType = ''
  form.name = ''
  form.priceMultiplier = 1
  form.referencedPermissionIds = []
}

const fillFormFromItem = (item: AnyLicensingConfig) => {
  resetForm()
  form.code = item.code
  form.referencedPermissionIds = [...item.referencedPermissionIds]

  switch (props.resource) {
    case 'digital': {
      const digitalItem = item as DigitalRightConfig
      form.targetPlatform = digitalItem.targetPlatform
      form.durationType = digitalItem.durationType
      form.basePriceMultiplier = digitalItem.basePriceMultiplier
      break
    }
    case 'physical': {
      const physicalItem = item as PhysicalRightConfig
      form.venueUsageType = physicalItem.venueUsageType
      form.basePriceMultiplier = physicalItem.basePriceMultiplier
      break
    }
    case 'expression': {
      const expressionItem = item as ExpressionConfig
      form.name = expressionItem.name
      form.priceMultiplier = expressionItem.priceMultiplier
      break
    }
    case 'modification': {
      const modificationItem = item as ModificationConfig
      form.name = modificationItem.name
      form.priceMultiplier = modificationItem.priceMultiplier
      break
    }
  }
}

const fetchList = async () => {
  clearMessages()

  const keyword = filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined
  const status = filters.status || undefined

  switch (props.resource) {
    case 'digital':
      await digitalStore.fetchItems({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword,
        status,
        targetPlatform: filters.targetPlatform || undefined,
        durationType: filters.durationType || undefined,
      })
      break
    case 'physical':
      await physicalStore.fetchItems({ page: pagination.page, pageSize: pagination.pageSize, keyword, status })
      break
    case 'expression':
      await expressionStore.fetchItems({ page: pagination.page, pageSize: pagination.pageSize, keyword, status })
      break
    case 'modification':
      await modificationStore.fetchItems({ page: pagination.page, pageSize: pagination.pageSize, keyword, status })
      break
  }
}

const openCreate = () => {
  clearMessages()
  selectedItem.value = null
  resetForm()
  editDialogVisible.value = false
  createDialogVisible.value = true
}

const openEdit = (item: AnyLicensingConfig) => {
  clearMessages()
  selectedItem.value = item
  fillFormFromItem(item)
  createDialogVisible.value = false
  editDialogVisible.value = true
}

const buildCreatePayload = () => {
  const code = form.code.trim().length > 0 ? form.code.trim().toUpperCase() : undefined
  const referencedPermissionIds = [...form.referencedPermissionIds]

  switch (props.resource) {
    case 'digital':
      return {
        code,
        targetPlatform: form.targetPlatform,
        durationType: form.durationType,
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
      } satisfies CreateDigitalRightConfigPayload
    case 'physical':
      return {
        code,
        venueUsageType: form.venueUsageType.trim(),
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
      } satisfies CreatePhysicalRightConfigPayload
    case 'expression':
      return {
        code,
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies CreateExpressionConfigPayload
    case 'modification':
      return {
        code,
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies CreateModificationConfigPayload
  }
}

const buildUpdatePayload = () => {
  const referencedPermissionIds = [...form.referencedPermissionIds]

  switch (props.resource) {
    case 'digital':
      return {
        targetPlatform: form.targetPlatform,
        durationType: form.durationType,
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
      } satisfies UpdateDigitalRightConfigPayload
    case 'physical':
      return {
        venueUsageType: form.venueUsageType.trim(),
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
      } satisfies UpdatePhysicalRightConfigPayload
    case 'expression':
      return {
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies UpdateExpressionConfigPayload
    case 'modification':
      return {
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies UpdateModificationConfigPayload
  }
}

const submitCreate = async () => {
  clearMessages()
  isSubmitting.value = true

  try {
    switch (props.resource) {
      case 'digital':
        await digitalStore.createOne(buildCreatePayload() as CreateDigitalRightConfigPayload)
        break
      case 'physical':
        await physicalStore.createOne(buildCreatePayload() as CreatePhysicalRightConfigPayload)
        break
      case 'expression':
        await expressionStore.createOne(buildCreatePayload() as CreateExpressionConfigPayload)
        break
      case 'modification':
        await modificationStore.createOne(buildCreatePayload() as CreateModificationConfigPayload)
        break
    }

    successMessage.value = 'Đã tạo cấu hình thành công.'
    createDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmitting.value = false
  }
}

const submitEdit = async () => {
  if (!selectedItem.value) return

  clearMessages()
  isSubmitting.value = true

  try {
    switch (props.resource) {
      case 'digital':
        await digitalStore.updateOne(selectedItem.value.id, buildUpdatePayload() as UpdateDigitalRightConfigPayload)
        break
      case 'physical':
        await physicalStore.updateOne(selectedItem.value.id, buildUpdatePayload() as UpdatePhysicalRightConfigPayload)
        break
      case 'expression':
        await expressionStore.updateOne(selectedItem.value.id, buildUpdatePayload() as UpdateExpressionConfigPayload)
        break
      case 'modification':
        await modificationStore.updateOne(selectedItem.value.id, buildUpdatePayload() as UpdateModificationConfigPayload)
        break
    }

    successMessage.value = 'Đã cập nhật cấu hình.'
    editDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmitting.value = false
  }
}

const toggleStatus = async (item: AnyLicensingConfig) => {
  clearMessages()
  const nextStatus: LicensingConfigStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  try {
    switch (props.resource) {
      case 'digital':
        await digitalStore.setStatus(item.id, nextStatus)
        break
      case 'physical':
        await physicalStore.setStatus(item.id, nextStatus)
        break
      case 'expression':
        await expressionStore.setStatus(item.id, nextStatus)
        break
      case 'modification':
        await modificationStore.setStatus(item.id, nextStatus)
        break
    }

    successMessage.value = 'Đã cập nhật trạng thái.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const removeOne = async (item: AnyLicensingConfig) => {
  clearMessages()

  try {
    switch (props.resource) {
      case 'digital':
        await digitalStore.removeOne(item.id)
        break
      case 'physical':
        await physicalStore.removeOne(item.id)
        break
      case 'expression':
        await expressionStore.removeOne(item.id)
        break
      case 'modification':
        await modificationStore.removeOne(item.id)
        break
    }

    successMessage.value = 'Đã xoá cấu hình.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return

  pagination.page = nextPage
  await fetchList()
}

const getDetailText = (item: AnyLicensingConfig) => {
  switch (props.resource) {
    case 'digital': {
      const digitalItem = item as DigitalRightConfig
      return `${digitalItem.targetPlatform} · ${digitalItem.durationType}`
    }
    case 'physical':
      return (item as PhysicalRightConfig).venueUsageType
    case 'expression':
      return (item as ExpressionConfig).name
    case 'modification':
      return (item as ModificationConfig).name
  }
}

const getPriceValue = (item: AnyLicensingConfig) => {
  switch (props.resource) {
    case 'digital':
      return (item as DigitalRightConfig).basePriceMultiplier
    case 'physical':
      return (item as PhysicalRightConfig).basePriceMultiplier
    case 'expression':
      return (item as ExpressionConfig).priceMultiplier
    case 'modification':
      return (item as ModificationConfig).priceMultiplier
  }
}

onMounted(() => {
  void corePermissionsStore.fetchCorePermissions({ page: 1, pageSize: 200, status: 'ACTIVE' }).catch(() => {})
  void fetchList()
})
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="text-xl font-semibold text-slate-950 dark:text-white">{{ currentResource.title }}</div>
        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ currentResource.description }}</div>
      </div>
      <button type="button" :class="primaryButtonClass" :disabled="currentIsLoading" @click="openCreate">
        <i class="pi pi-plus mr-2" />
        {{ currentResource.createLabel }}
      </button>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="grid gap-3 md:grid-cols-4">
        <label class="space-y-2 md:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keyword</span>
          <input v-model="filters.keyword" :class="fieldClass" placeholder="Tìm theo code hoặc tên hiển thị" :disabled="currentIsLoading" />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</span>
          <select v-model="filters.status" :class="fieldClass" :disabled="currentIsLoading">
            <option value="">Tất cả</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <label v-if="currentResource.supportsDigitalFilters" class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Platform</span>
          <select v-model="filters.targetPlatform" :class="fieldClass" :disabled="currentIsLoading">
            <option value="">Tất cả</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="FACEBOOK">FACEBOOK</option>
          </select>
        </label>
        <label v-if="currentResource.supportsDigitalFilters" class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Duration</span>
          <select v-model="filters.durationType" :class="fieldClass" :disabled="currentIsLoading">
            <option value="">Tất cả</option>
            <option value="ONE_YEAR">ONE_YEAR</option>
            <option value="PERPETUAL">PERPETUAL</option>
          </select>
        </label>
      </div>

      <div class="mt-3 flex justify-end">
        <button type="button" :class="secondaryButtonClass" :disabled="currentIsLoading" @click="fetchList">
          <i class="pi pi-filter mr-2" />
          Lọc
        </button>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40">
        <div class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="px-4 py-4 font-semibold">Code</th>
                <th class="px-4 py-4 font-semibold">{{ currentResource.detailColumnLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ currentResource.priceLabel }}</th>
                <th class="px-4 py-4 font-semibold">Referenced permissions</th>
                <th class="px-4 py-4 font-semibold">Status</th>
                <th class="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr v-for="item in currentItems" :key="item.id" class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30">
                <td class="px-4 py-4">
                  <div class="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                    {{ item.code }}
                  </div>
                </td>
                <td class="px-4 py-4">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ getDetailText(item) }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ currentResource.detailPlaceholder }}
                  </div>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ getPriceValue(item) }}</td>
                <td class="px-4 py-4">
                  <div v-if="item.referencedPermissions.length === 0" class="text-slate-400 dark:text-slate-500">Chưa gắn quyền</div>
                  <div v-else class="flex flex-wrap gap-2">
                    <span
                      v-for="permission in item.referencedPermissions.slice(0, 3)"
                      :key="`${item.id}-${permission.id}`"
                      class="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200"
                    >
                      {{ permission.code }}
                    </span>
                    <span
                      v-if="item.referencedPermissions.length > 3"
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      +{{ item.referencedPermissions.length - 3 }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    :class="item.status === 'ACTIVE'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'"
                  >
                    {{ item.status }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="openEdit(item)">
                      <i class="pi pi-pencil" />
                    </button>
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="toggleStatus(item)">
                      <i :class="item.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-rose-300 dark:hover:border-rose-500/30 dark:hover:text-rose-200"
                      :disabled="currentIsLoading"
                      @click="removeOne(item)"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!currentIsLoading && currentItems.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {{ currentResource.emptyState }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ currentTotalItems }}
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" :class="secondaryButtonClass" :disabled="currentIsLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
          <button type="button" :class="secondaryButtonClass" :disabled="currentIsLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">Sau</button>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="createDialogVisible" modal class="w-[min(860px,96vw)]" :header="currentResource.createLabel">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Code</span>
          <input v-model="form.code" :class="fieldClass" placeholder="Bo trong neu muon backend tu cap code" :disabled="isSubmitting" />
        </label>

        <template v-if="props.resource === 'digital'">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Platform</span>
            <select v-model="form.targetPlatform" :class="fieldClass" :disabled="isSubmitting">
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="TIKTOK">TIKTOK</option>
              <option value="FACEBOOK">FACEBOOK</option>
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Duration</span>
            <select v-model="form.durationType" :class="fieldClass" :disabled="isSubmitting">
              <option value="ONE_YEAR">ONE_YEAR</option>
              <option value="PERPETUAL">PERPETUAL</option>
            </select>
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Base multiplier</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <template v-if="props.resource === 'physical'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Venue / Usage type</span>
            <input v-model="form.venueUsageType" :class="fieldClass" placeholder="PHÒNG TRÀ / HỘI CHỢ / QUÁN CAFE" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Base multiplier</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ props.resource === 'expression' ? 'Expression name' : 'Modification name' }}
            </span>
            <input v-model="form.name" :class="fieldClass" :placeholder="props.resource === 'expression' ? 'Nhạc nền Vlog' : 'Cải biên phối khí'" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Price multiplier</span>
            <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Referenced core permissions</span>
          <select v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.code }} - {{ permission.name }}
            </option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" :disabled="isSubmitting" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isSubmitting" @click="submitCreate">Tạo</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal class="w-[min(860px,96vw)]" header="Cập nhật cấu hình">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Code</span>
          <input v-model="form.code" :class="fieldClass" disabled />
        </label>

        <template v-if="props.resource === 'digital'">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Platform</span>
            <select v-model="form.targetPlatform" :class="fieldClass" :disabled="isSubmitting">
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="TIKTOK">TIKTOK</option>
              <option value="FACEBOOK">FACEBOOK</option>
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Duration</span>
            <select v-model="form.durationType" :class="fieldClass" :disabled="isSubmitting">
              <option value="ONE_YEAR">ONE_YEAR</option>
              <option value="PERPETUAL">PERPETUAL</option>
            </select>
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Base multiplier</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <template v-if="props.resource === 'physical'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Venue / Usage type</span>
            <input v-model="form.venueUsageType" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Base multiplier</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ props.resource === 'expression' ? 'Expression name' : 'Modification name' }}
            </span>
            <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Price multiplier</span>
            <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Referenced core permissions</span>
          <select v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.code }} - {{ permission.name }}
            </option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" :disabled="isSubmitting" @click="editDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isSubmitting" @click="submitEdit">Lưu</button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
