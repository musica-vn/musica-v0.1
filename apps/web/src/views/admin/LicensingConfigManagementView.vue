<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiClientError } from '../../api/axios'
import {
  listAdminDigitalRightConfigProducts,
  listAdminPhysicalRightConfigProducts,
} from '../../services/licensing-configs.service'
import { useCorePermissionsStore } from '../../stores/core-permissions.store'
import {
  useDigitalRightConfigsStore,
  useExpressionConfigsStore,
  useModificationConfigsStore,
  usePhysicalRightConfigsStore,
} from '../../stores/licensing-configs.store'
import LicensingConfigActionMenu from '../../components/features/admin-shell/LicensingConfigActionMenu.vue'
import LicensingConfigMobileCardList from '../../components/features/admin-shell/LicensingConfigMobileCardList.vue'
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
  PackageRegistrationsListQuery,
  PriceModifier,
  ModificationConfig,
  PhysicalRightConfig,
  ReferencedPermissionSummary,
  UpdateDigitalRightConfigPayload,
  UpdateExpressionConfigPayload,
  UpdateModificationConfigPayload,
  UpdatePhysicalRightConfigPayload,
  VariantPricingModifierKey,
} from '../../types/licensing-configs.types'
import type { ProductPackageRegistration } from '../../types/products.types'

type AnyLicensingConfig = DigitalRightConfig | PhysicalRightConfig | ExpressionConfig | ModificationConfig

const props = defineProps<{
  resource: LicensingConfigResource
}>()

const confirm = useConfirm()

const fieldClass =
  'h-12 w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const selectFieldClass =
  'h-12 w-full min-w-0 appearance-none rounded-2xl border border-slate-200/80 bg-white/90 pl-4 pr-12 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const textAreaClass =
  'min-h-[140px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'
const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
const selectChevronClass =
  'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500'

const resourceConfigMap: Record<
  LicensingConfigResource,
  {
    title: string
    description: string
    createLabel: string
    editLabel: string
    detailColumnLabel: string
    detailPlaceholder: string
    priceLabel: string
    emptyState: string
    keywordPlaceholder: string
    permissionLabel: string
    emptyPermissionsText: string
    permissionLoadingMessage: string
    createSuccessMessage: string
    updateSuccessMessage: string
    deleteSuccessMessage: string
    permissionsDialogEmptyState: string
    draftNotice?: string
    supportsDigitalFilters: boolean
  }
> = {
  digital: {
    title: 'Gói quyền nền tảng số',
    description:
      'Thiết lập gói thương mại cho nền tảng số, chọn bộ quyền cốt lõi bắt buộc và quản lý vòng đời bản nháp hoặc publish.',
    createLabel: 'Tạo gói quyền số',
    editLabel: 'Cập nhật gói quyền số',
    detailColumnLabel: 'Nền tảng / Thời hạn',
    detailPlaceholder: 'Nền tảng thương mại và thời hạn áp dụng',
    priceLabel: 'Giá cơ sở / hệ số',
    emptyState: 'Chưa có gói quyền nền tảng số nào.',
    keywordPlaceholder: 'Tìm theo nền tảng hoặc thời hạn gói số',
    permissionLabel: 'Quyền cốt lõi bắt buộc',
    emptyPermissionsText: 'Chưa chọn quyền cốt lõi bắt buộc',
    permissionLoadingMessage: 'Đang tải bộ quyền cốt lõi bắt buộc...',
    createSuccessMessage: 'Đã tạo bản nháp gói quyền số.',
    updateSuccessMessage: 'Đã cập nhật gói quyền số.',
    deleteSuccessMessage: 'Đã xoá gói quyền số.',
    permissionsDialogEmptyState: 'Chưa cấu hình quyền cốt lõi bắt buộc.',
    draftNotice: 'Bản ghi mới sẽ được tạo ở trạng thái Bản nháp. Dùng thao tác Publish sau khi hoàn tất cấu hình.',
    supportsDigitalFilters: true,
  },
  physical: {
    title: 'Cấu hình quyền sử dụng vật lý',
    description:
      'Thiết lập bối cảnh hoặc địa điểm sử dụng thực tế, bộ quyền cốt lõi bắt buộc và quản lý trạng thái bản nháp hoặc kích hoạt.',
    createLabel: 'Tạo cấu hình quyền vật lý',
    editLabel: 'Cập nhật cấu hình quyền vật lý',
    detailColumnLabel: 'Bối cảnh / địa điểm sử dụng',
    detailPlaceholder: 'Bối cảnh hoặc địa điểm sử dụng thực tế',
    priceLabel: 'Giá cơ sở / hệ số',
    emptyState: 'Chưa có cấu hình quyền sử dụng vật lý nào.',
    keywordPlaceholder: 'Tìm theo bối cảnh hoặc địa điểm sử dụng',
    permissionLabel: 'Quyền cốt lõi bắt buộc',
    emptyPermissionsText: 'Chưa chọn quyền cốt lõi bắt buộc',
    permissionLoadingMessage: 'Đang tải bộ quyền cốt lõi bắt buộc...',
    createSuccessMessage: 'Đã tạo bản nháp cấu hình quyền vật lý.',
    updateSuccessMessage: 'Đã cập nhật cấu hình quyền vật lý.',
    deleteSuccessMessage: 'Đã xoá cấu hình quyền vật lý.',
    permissionsDialogEmptyState: 'Chưa cấu hình quyền cốt lõi bắt buộc.',
    draftNotice: 'Bản ghi mới sẽ được tạo ở trạng thái Bản nháp. Chỉ kích hoạt sau khi hoàn tất bộ quyền và biểu phí áp dụng.',
    supportsDigitalFilters: false,
  },
  expression: {
    title: 'Hình thức biểu hiện',
    description:
      'Quản lý danh mục hình thức biểu hiện của sản phẩm âm nhạc cùng hệ số giá và danh sách quyền tham khảo.',
    createLabel: 'Thêm hình thức biểu hiện',
    editLabel: 'Cập nhật hình thức biểu hiện',
    detailColumnLabel: 'Hình thức biểu hiện',
    detailPlaceholder: 'Tên hình thức biểu hiện',
    priceLabel: 'Hệ số giá',
    emptyState: 'Chưa có hình thức biểu hiện nào.',
    keywordPlaceholder: 'Tìm theo tên hình thức biểu hiện',
    permissionLabel: 'Quyền tham khảo',
    emptyPermissionsText: 'Chưa chọn quyền tham khảo',
    permissionLoadingMessage: 'Đang tải danh sách quyền...',
    createSuccessMessage: 'Đã tạo cấu hình thành công.',
    updateSuccessMessage: 'Đã cập nhật cấu hình.',
    deleteSuccessMessage: 'Đã xoá cấu hình.',
    permissionsDialogEmptyState: 'Chưa chọn quyền tham khảo.',
    supportsDigitalFilters: false,
  },
  modification: {
    title: 'Mức độ biến đổi',
    description:
      'Quản lý mức độ biến đổi tác phẩm cùng hệ số giá và danh sách quyền tham khảo.',
    createLabel: 'Thêm mức độ biến đổi',
    editLabel: 'Cập nhật mức độ biến đổi',
    detailColumnLabel: 'Mức độ biến đổi',
    detailPlaceholder: 'Tên mức độ biến đổi',
    priceLabel: 'Hệ số giá',
    emptyState: 'Chưa có mức độ biến đổi nào.',
    keywordPlaceholder: 'Tìm theo tên mức độ biến đổi',
    permissionLabel: 'Quyền tham khảo',
    emptyPermissionsText: 'Chưa chọn quyền tham khảo',
    permissionLoadingMessage: 'Đang tải danh sách quyền...',
    createSuccessMessage: 'Đã tạo cấu hình thành công.',
    updateSuccessMessage: 'Đã cập nhật cấu hình.',
    deleteSuccessMessage: 'Đã xoá cấu hình.',
    permissionsDialogEmptyState: 'Chưa chọn quyền tham khảo.',
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
  status: 'ACTIVE',
  targetPlatform: '',
  durationType: '',
})

const pagination = reactive({ page: 1, pageSize: 20 })

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedItem = ref<AnyLicensingConfig | null>(null)
const mobileActionItem = ref<AnyLicensingConfig | null>(null)
const isSubmitting = ref(false)
const hasLoadedPermissionOptions = ref(false)
const permissionsDialogVisible = ref(false)
const permissionsDialogTitle = ref('Quyền tham khảo')
const permissionsDialogPermissions = ref<ReferencedPermissionSummary[]>([])
const packageProductsDialogVisible = ref(false)
const packageProductsDialogTitle = ref('')
const packageProductsLoading = ref(false)
const packageProducts = ref<ProductPackageRegistration[]>([])

const form = reactive<{
  targetPlatform: DigitalPlatform
  durationType: DigitalDurationType
  basePriceMultiplier: number
  venueUsageType: string
  name: string
  priceMultiplier: number
  referencedPermissionIds: string[]
  priceModifiers: PriceModifier[]
}>({
  targetPlatform: 'YOUTUBE',
  durationType: 'ONE_YEAR',
  basePriceMultiplier: 1,
  venueUsageType: '',
  name: '',
  priceMultiplier: 1,
  referencedPermissionIds: [],
  priceModifiers: [],
})

const currentResource = computed(() => resourceConfigMap[props.resource])
const isExpressionOrModification = computed(
  () => props.resource === 'expression' || props.resource === 'modification',
)
const isDigitalOrPhysical = computed(() => props.resource === 'digital' || props.resource === 'physical')

type PricingModifierGroupId = 'SUBJECT' | 'DURATION' | 'SCOPE' | 'EXPRESSION' | 'MODIFICATION'

const pricingModifierGroups: Array<
  | {
      id: PricingModifierGroupId
      label: string
      kind: 'enum'
      items: Array<{ key: VariantPricingModifierKey; label: string }>
    }
  | {
      id: PricingModifierGroupId
      label: string
      kind: 'flag'
      flagKey: VariantPricingModifierKey
    }
> = [
  {
    id: 'SUBJECT',
    label: 'Đối tượng',
    kind: 'enum',
    items: [
      { key: 'SUBJECT_INDIVIDUAL', label: 'Cá nhân' },
      { key: 'SUBJECT_ORGANIZATION', label: 'Tổ chức' },
    ],
  },
  {
    id: 'DURATION',
    label: 'Thời hạn',
    kind: 'enum',
    items: [
      { key: 'DURATION_ONE_YEAR', label: '1 năm' },
      { key: 'DURATION_PERPETUAL', label: 'Vĩnh viễn' },
    ],
  },
  {
    id: 'SCOPE',
    label: 'Phạm vi',
    kind: 'enum',
    items: [
      { key: 'SCOPE_SINGLE_CHANNEL', label: '1 kênh' },
      { key: 'SCOPE_MULTI_CHANNEL', label: 'Đa kênh' },
    ],
  },
  {
    id: 'EXPRESSION',
    label: 'Hình thức biểu hiện',
    kind: 'flag',
    flagKey: 'EXPRESSION',
  },
  {
    id: 'MODIFICATION',
    label: 'Mức độ biến đổi',
    kind: 'flag',
    flagKey: 'MODIFICATION',
  },
]

const getPriceModifierMultiplier = (key: VariantPricingModifierKey) =>
  form.priceModifiers.find((item) => item.key === key)?.multiplier ?? 1

const setPriceModifierMultiplier = (key: VariantPricingModifierKey, multiplier: number) => {
  const target = form.priceModifiers.find((item) => item.key === key)
  if (target) {
    target.multiplier = multiplier
    return
  }
  form.priceModifiers.push({ key, multiplier })
}

const hasPriceModifierGroup = (groupId: PricingModifierGroupId) => {
  const group = pricingModifierGroups.find((item) => item.id === groupId)
  if (!group) return false

  if (group.kind === 'flag') {
    return form.priceModifiers.some((modifier) => modifier.key === group.flagKey)
  }

  return group.items.some((item) => form.priceModifiers.some((modifier) => modifier.key === item.key))
}

const addPriceModifierGroup = (groupId: PricingModifierGroupId) => {
  if (!isDigitalOrPhysical.value) return
  const group = pricingModifierGroups.find((item) => item.id === groupId)
  if (!group) return

  const existingKeys = new Set(form.priceModifiers.map((item) => item.key))
  if (group.kind === 'flag') {
    if (!existingKeys.has(group.flagKey)) {
      form.priceModifiers.push({ key: group.flagKey, multiplier: 1 })
    }
    return
  }

  group.items
    .filter((item) => !existingKeys.has(item.key))
    .forEach((item) => form.priceModifiers.push({ key: item.key, multiplier: 1 }))
}

const removePriceModifierGroup = (groupId: PricingModifierGroupId) => {
  if (!isDigitalOrPhysical.value) return
  const group = pricingModifierGroups.find((item) => item.id === groupId)
  if (!group) return

  const removeKeys = new Set(
    group.kind === 'flag' ? [group.flagKey] : group.items.map((item) => item.key),
  )
  const remaining = form.priceModifiers.filter((item) => !removeKeys.has(item.key))
  form.priceModifiers.splice(0, form.priceModifiers.length, ...remaining)
}

const activePricingModifierGroups = computed(() =>
  pricingModifierGroups.filter((group) => hasPriceModifierGroup(group.id)),
)

const availablePricingModifierGroups = computed(() =>
  pricingModifierGroups.filter((group) => !hasPriceModifierGroup(group.id)),
)

const getPricingModifierGroupDescription = (
  group: (typeof pricingModifierGroups)[number],
) => {
  if (group.kind === 'flag') {
    return 'Bật thuộc tính để công thức sử dụng hệ số từ màn hình quản lý riêng.'
  }

  return `Thêm toàn bộ ${group.items.length} giá trị của thuộc tính này để chỉnh hệ số trực tiếp tại đây.`
}

const getPricingModifierGroupBadgeLabel = (
  group: (typeof pricingModifierGroups)[number],
) => (group.kind === 'flag' ? 'Lấy hệ số riêng' : 'Chỉnh tại đây')

const getPricingModifierGroupIcon = (
  group: (typeof pricingModifierGroups)[number],
) => {
  switch (group.id) {
    case 'SUBJECT':
      return 'pi-users'
    case 'DURATION':
      return 'pi-clock'
    case 'SCOPE':
      return 'pi-globe'
    case 'EXPRESSION':
      return 'pi-volume-up'
    case 'MODIFICATION':
      return 'pi-pencil'
  }
}

const getPricingModifierGroupIconClass = (
  group: (typeof pricingModifierGroups)[number],
) =>
  group.kind === 'flag'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
    : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
const isNameValid = computed(() => {
  if (!isExpressionOrModification.value) return true
  return form.name.trim().length > 0
})

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
const isDigitalResource = computed(() => props.resource === 'digital')
const isPhysicalResource = computed(() => props.resource === 'physical')
const isDigitalOrPhysicalResource = computed(() => isDigitalResource.value || isPhysicalResource.value)
const isDraftManagedResource = computed(() => isDigitalOrPhysicalResource.value)
const supportsPermissionPicker = computed(
  () =>
    isDigitalOrPhysicalResource.value ||
    props.resource === 'expression' ||
    props.resource === 'modification',
)
const keywordLabel = computed(() => 'Từ khoá')
const keywordPlaceholder = computed(() => currentResource.value.keywordPlaceholder)
const statusFieldLabel = computed(() => 'Trạng thái')
const permissionsLabel = computed(() => currentResource.value.permissionLabel)
const actionsLabel = computed(() => 'Thao tác')
const emptyPermissionsText = computed(() => currentResource.value.emptyPermissionsText)
const editDialogTitle = computed(() => currentResource.value.editLabel)
const draftNotice = computed(() => currentResource.value.draftNotice ?? null)
const isPermissionOptionsLoading = computed(
  () => supportsPermissionPicker.value && (!hasLoadedPermissionOptions.value || corePermissionsStore.isLoading),
)
const isPermissionSubmitDisabled = computed(
  () => isSubmitting.value || isPermissionOptionsLoading.value || !isNameValid.value,
)
const permissionOptionsLoadingMessage = computed(() => currentResource.value.permissionLoadingMessage)
const permissionOptionsEmptyMessage = computed(() => 'Hiện chưa có quyền cốt lõi đang hoạt động để lựa chọn.')
const permissionsDialogEmptyState = computed(() => currentResource.value.permissionsDialogEmptyState)
const createActionLabel = computed(() => (isDraftManagedResource.value ? 'Tạo bản nháp' : 'Tạo'))

const mergedPermissionOptions = computed<ReferencedPermissionSummary[]>(() => {
  const activePermissions = corePermissionsStore.activeItems.map((item) => ({
    id: item.id,
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

const toggleReferencedPermission = (permissionId: string) => {
  form.referencedPermissionIds = form.referencedPermissionIds.includes(permissionId)
    ? form.referencedPermissionIds.filter((item) => item !== permissionId)
    : [...form.referencedPermissionIds, permissionId]
}

const openPermissionsDialog = (item: AnyLicensingConfig) => {
  closeMobileActionMenu()
  permissionsDialogTitle.value = `${getDetailText(item)} - ${currentResource.value.permissionLabel}`
  permissionsDialogPermissions.value = item.referencedPermissions
  permissionsDialogVisible.value = true
}

const openPackageProductsDialog = async (item: AnyLicensingConfig) => {
  if (!isDigitalOrPhysicalResource.value) return
  closeMobileActionMenu()

  packageProductsDialogTitle.value = `Sản phẩm đã tham gia - ${getDetailText(item)}`
  packageProducts.value = []
  packageProductsDialogVisible.value = true
  packageProductsLoading.value = true

  try {
    const query: PackageRegistrationsListQuery = { page: 1, pageSize: 100, status: 'JOINED' }
    const response = props.resource === 'digital'
      ? await listAdminDigitalRightConfigProducts(item.id, query)
      : await listAdminPhysicalRightConfigProducts(item.id, query)

    packageProducts.value = response.data.items
  } catch (error) {
    setError(error)
  } finally {
    packageProductsLoading.value = false
  }
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const fetchPermissionOptions = async () => {
  hasLoadedPermissionOptions.value = false

  try {
    await corePermissionsStore.fetchCorePermissions({ page: 1, pageSize: 100, status: 'ACTIVE' })
  } catch (error) {
    setError(error)
  } finally {
    hasLoadedPermissionOptions.value = true
  }
}

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = error.message
    return
  }

  errorMessage.value = error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

const fetchListSafely = async () => {
  try {
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const formatStatusLabel = (status: LicensingConfigStatus) => {
  if (isDraftManagedResource.value) {
    return status === 'ACTIVE' ? 'Đã publish' : 'Bản nháp'
  }

  return status === 'ACTIVE' ? 'Hoạt động' : 'Tắt'
}

const formatDigitalPlatformLabel = (platform: DigitalPlatform) => platform

const formatDurationTypeLabel = (durationType: DigitalDurationType) =>
  durationType === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'

const resetForm = () => {
  form.targetPlatform = 'YOUTUBE'
  form.durationType = 'ONE_YEAR'
  form.basePriceMultiplier = 1
  form.venueUsageType = ''
  form.name = ''
  form.priceMultiplier = 1
  form.referencedPermissionIds = []
  form.priceModifiers = []
}

const fillFormFromItem = (item: AnyLicensingConfig) => {
  resetForm()
  form.referencedPermissionIds = [...item.referencedPermissionIds]

  switch (props.resource) {
    case 'digital': {
      const digitalItem = item as DigitalRightConfig
      form.targetPlatform = digitalItem.targetPlatform
      form.durationType = digitalItem.durationType
      form.basePriceMultiplier = digitalItem.basePriceMultiplier
      form.priceModifiers = [...(digitalItem.priceModifiers ?? [])]
      break
    }
    case 'physical': {
      const physicalItem = item as PhysicalRightConfig
      form.venueUsageType = physicalItem.venueUsageType
      form.basePriceMultiplier = physicalItem.basePriceMultiplier
      form.priceModifiers = [...(physicalItem.priceModifiers ?? [])]
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
  closeMobileActionMenu()
  selectedItem.value = null
  resetForm()
  if (supportsPermissionPicker.value && !hasLoadedPermissionOptions.value && !corePermissionsStore.isLoading) {
    void fetchPermissionOptions()
  }
  editDialogVisible.value = false
  createDialogVisible.value = true
}

const openEdit = (item: AnyLicensingConfig) => {
  clearMessages()
  closeMobileActionMenu()
  selectedItem.value = item
  fillFormFromItem(item)
  if (supportsPermissionPicker.value && !hasLoadedPermissionOptions.value && !corePermissionsStore.isLoading) {
    void fetchPermissionOptions()
  }
  createDialogVisible.value = false
  editDialogVisible.value = true
}

const buildCreatePayload = () => {
  const referencedPermissionIds = [...form.referencedPermissionIds]
  const priceModifiers = isDigitalOrPhysical.value
    ? Array.from(
        new Map(
          form.priceModifiers
            .filter((item) => !!item && typeof item === 'object')
            .map((item) => [item.key, { key: item.key, multiplier: Number(item.multiplier) }]),
        ).values(),
      )
    : []

  switch (props.resource) {
    case 'digital':
      return {
        targetPlatform: form.targetPlatform,
        durationType: form.durationType,
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
        priceModifiers,
      } satisfies CreateDigitalRightConfigPayload
    case 'physical':
      return {
        venueUsageType: form.venueUsageType.trim(),
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
        priceModifiers,
      } satisfies CreatePhysicalRightConfigPayload
    case 'expression':
      return {
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies CreateExpressionConfigPayload
    case 'modification':
      return {
        name: form.name.trim(),
        priceMultiplier: Number(form.priceMultiplier),
        referencedPermissionIds,
      } satisfies CreateModificationConfigPayload
  }
}

const buildUpdatePayload = () => {
  const referencedPermissionIds = [...form.referencedPermissionIds]
  const priceModifiers = isDigitalOrPhysical.value
    ? Array.from(
        new Map(
          form.priceModifiers
            .filter((item) => !!item && typeof item === 'object')
            .map((item) => [item.key, { key: item.key, multiplier: Number(item.multiplier) }]),
        ).values(),
      )
    : []

  switch (props.resource) {
    case 'digital':
      return {
        targetPlatform: form.targetPlatform,
        durationType: form.durationType,
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
        priceModifiers,
      } satisfies UpdateDigitalRightConfigPayload
    case 'physical':
      return {
        venueUsageType: form.venueUsageType.trim(),
        basePriceMultiplier: Number(form.basePriceMultiplier),
        referencedPermissionIds,
        priceModifiers,
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
  if (!isNameValid.value) {
    errorMessage.value = 'Vui lòng nhập tên.'
    return
  }
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

    successMessage.value = currentResource.value.createSuccessMessage
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
  if (!isNameValid.value) {
    errorMessage.value = 'Vui lòng nhập tên.'
    return
  }
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

    successMessage.value = currentResource.value.updateSuccessMessage
    editDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmitting.value = false
  }
}

const performToggleStatus = async (item: AnyLicensingConfig) => {
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

    successMessage.value = isDraftManagedResource.value
      ? nextStatus === 'ACTIVE'
        ? 'Đã publish cấu hình.'
        : 'Đã chuyển cấu hình về bản nháp.'
      : 'Đã cập nhật trạng thái.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const performRemoveOne = async (item: AnyLicensingConfig) => {
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

    successMessage.value = currentResource.value.deleteSuccessMessage
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
      return `${formatDigitalPlatformLabel(digitalItem.targetPlatform)} · ${formatDurationTypeLabel(digitalItem.durationType)}`
    }
    case 'physical':
      return (item as PhysicalRightConfig).venueUsageType
    case 'expression':
      return (item as ExpressionConfig).name
    case 'modification':
      return (item as ModificationConfig).name
  }
}

const getStatusClass = (status: LicensingConfigStatus) =>
  status === 'ACTIVE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'

const resolveMobileStatusLabel = (item: AnyLicensingConfig) =>
  isDigitalOrPhysicalResource.value ? formatStatusLabel(item.status) : item.status

const resolveMobileStatusClass = (item: AnyLicensingConfig) => getStatusClass(item.status)

const resolveMobilePriceValue = (item: AnyLicensingConfig) => String(getPriceValue(item))

const resolveMobilePermissionCountLabel = (item: AnyLicensingConfig) =>
  item.referencedPermissions.length === 0 ? emptyPermissionsText.value : `${item.referencedPermissions.length} quyền`

const openMobileActionMenu = (item: AnyLicensingConfig) => {
  mobileActionItem.value = item
}

const closeMobileActionMenu = () => {
  mobileActionItem.value = null
}

const confirmToggleStatus = (item: AnyLicensingConfig) => {
  closeMobileActionMenu()
  const nextStatus: LicensingConfigStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const title = getDetailText(item)

  if (isDraftManagedResource.value) {
    const header = nextStatus === 'ACTIVE' ? 'Xác nhận publish' : 'Xác nhận chuyển bản nháp'
    const message =
      nextStatus === 'ACTIVE'
        ? `Bạn có chắc muốn publish "${title}" để mở cấu hình này cho đăng ký không?`
        : `Bạn có chắc muốn chuyển "${title}" về trạng thái bản nháp không?`
    const acceptLabel = nextStatus === 'ACTIVE' ? 'Publish' : 'Chuyển nháp'

    confirm.require({
      header,
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel,
      rejectLabel: 'Huỷ',
      accept: () => void performToggleStatus(item),
    })

    return
  }

  const statusLabel = formatStatusLabel(nextStatus)
  const header = nextStatus === 'INACTIVE' ? 'Xác nhận tắt' : 'Xác nhận bật'

  confirm.require({
    header,
    message: `Bạn có chắc muốn ${statusLabel.toLowerCase()} "${title}" không?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: nextStatus === 'INACTIVE' ? 'Tắt' : 'Bật',
    rejectLabel: 'Huỷ',
    accept: () => void performToggleStatus(item),
  })
}

const confirmRemoveOne = (item: AnyLicensingConfig) => {
  closeMobileActionMenu()
  const title = getDetailText(item)

  confirm.require({
    header: 'Xác nhận xoá',
    message: `Bạn có chắc muốn xoá "${title}" không? Thao tác này không thể hoàn tác.`,
    icon: 'pi pi-trash',
    acceptLabel: 'Xoá',
    rejectLabel: 'Huỷ',
    acceptClass: 'p-button-danger',
    accept: () => void performRemoveOne(item),
  })
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

let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => filters.keyword,
  () => {
    if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
    keywordDebounceTimer = setTimeout(() => {
      pagination.page = 1
      void fetchListSafely()
    }, 500)
  },
)

watch(
  () => [filters.status, filters.targetPlatform, filters.durationType],
  () => {
    pagination.page = 1
    void fetchListSafely()
  },
)

watch(
  () => props.resource,
  () => {
    clearMessages()
    selectedItem.value = null
    createDialogVisible.value = false
    editDialogVisible.value = false
    permissionsDialogVisible.value = false
    pagination.page = 1
    filters.keyword = ''
    filters.status = 'ACTIVE'
    filters.targetPlatform = ''
    filters.durationType = ''
    if (keywordDebounceTimer) {
      clearTimeout(keywordDebounceTimer)
      keywordDebounceTimer = null
    }
    void fetchPermissionOptions()
    void fetchListSafely()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
})

onMounted(() => {
  void fetchPermissionOptions()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <section class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20 sm:p-6 md:flex-row md:items-center md:justify-between">
      <div class="min-w-0">
        <div class="text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white">{{ currentResource.title }}</div>
        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ currentResource.description }}</div>
      </div>
      <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="currentIsLoading" @click="openCreate">
        <i class="pi pi-plus mr-2" />
        {{ currentResource.createLabel }}
      </button>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
        <label class="space-y-2 sm:col-span-2 xl:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{{ keywordLabel }}</span>
          <input v-model="filters.keyword" :class="fieldClass" :placeholder="keywordPlaceholder" :disabled="currentIsLoading" />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{{ statusFieldLabel }}</span>
          <div class="relative">
            <select v-model="filters.status" :class="selectFieldClass" :disabled="currentIsLoading">
              <option value="">Tất cả</option>
              <option value="ACTIVE">{{ isDigitalOrPhysicalResource ? formatStatusLabel('ACTIVE') : 'ACTIVE' }}</option>
              <option value="INACTIVE">{{ isDigitalOrPhysicalResource ? formatStatusLabel('INACTIVE') : 'INACTIVE' }}</option>
            </select>
            <i class="pi pi-chevron-down" :class="selectChevronClass" />
          </div>
        </label>
        <label v-if="currentResource.supportsDigitalFilters" class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {{ isDigitalOrPhysicalResource ? 'Nền tảng áp dụng' : 'Platform' }}
          </span>
          <div class="relative">
            <select v-model="filters.targetPlatform" :class="selectFieldClass" :disabled="currentIsLoading">
              <option value="">Tất cả</option>
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="TIKTOK">TIKTOK</option>
              <option value="FACEBOOK">FACEBOOK</option>
            </select>
            <i class="pi pi-chevron-down" :class="selectChevronClass" />
          </div>
        </label>
        <label v-if="currentResource.supportsDigitalFilters" class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {{ isDigitalOrPhysicalResource ? 'Thời hạn áp dụng' : 'Duration' }}
          </span>
          <div class="relative">
            <select v-model="filters.durationType" :class="selectFieldClass" :disabled="currentIsLoading">
              <option value="">Tất cả</option>
              <option value="ONE_YEAR">{{ isDigitalOrPhysicalResource ? '1 năm' : 'ONE_YEAR' }}</option>
              <option value="PERPETUAL">{{ isDigitalOrPhysicalResource ? 'Vĩnh viễn' : 'PERPETUAL' }}</option>
            </select>
            <i class="pi pi-chevron-down" :class="selectChevronClass" />
          </div>
        </label>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <LicensingConfigMobileCardList
        class="mt-6"
        :items="currentItems"
        :resource="props.resource"
        :is-loading="currentIsLoading"
        :empty-message="currentResource.emptyState"
        :resolve-detail-text="getDetailText"
        :resolve-price-value="resolveMobilePriceValue"
        :resolve-permission-count-label="resolveMobilePermissionCountLabel"
        :resolve-status-label="resolveMobileStatusLabel"
        :resolve-status-class="resolveMobileStatusClass"
        :can-open-packages="isDigitalOrPhysicalResource"
        @edit="openEdit"
        @toggle="confirmToggleStatus"
        @permissions="openPermissionsDialog"
        @packages="openPackageProductsDialog"
        @more="openMobileActionMenu"
      />

      <div class="mt-6 hidden overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40 sm:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="px-4 py-4 font-semibold">{{ currentResource.detailColumnLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ currentResource.priceLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ permissionsLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ statusFieldLabel }}</th>
                <th class="px-4 py-4 text-right font-semibold">{{ actionsLabel }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr v-for="item in currentItems" :key="item.id" class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30">
                <td class="px-4 py-4">
                  <div
                    class="max-w-[240px] truncate font-semibold text-slate-900 dark:text-white md:max-w-[360px] lg:max-w-[480px]"
                    :title="getDetailText(item)"
                  >
                    {{ getDetailText(item) }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ currentResource.detailPlaceholder }}
                  </div>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ getPriceValue(item) }}</td>
                <td class="px-4 py-4">
                  <div v-if="item.referencedPermissions.length === 0" class="text-slate-400 dark:text-slate-500">{{ emptyPermissionsText }}</div>
                  <div v-else class="flex items-center gap-3">
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="openPermissionsDialog(item)">
                      <i class="pi pi-eye" />
                    </button>
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {{ item.referencedPermissions.length }} quyền
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    :class="getStatusClass(item.status)"
                  >
                    {{ isDigitalOrPhysicalResource ? formatStatusLabel(item.status) : item.status }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      v-if="isDigitalOrPhysicalResource"
                      type="button"
                      :class="iconButtonClass"
                      :disabled="currentIsLoading"
                      @click="openPackageProductsDialog(item)"
                    >
                      <i class="pi pi-users" />
                    </button>
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="openEdit(item)">
                      <i class="pi pi-pencil" />
                    </button>
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="confirmToggleStatus(item)">
                      <i :class="item.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-rose-300 dark:hover:border-rose-500/30 dark:hover:text-rose-200"
                      :disabled="currentIsLoading"
                      @click="confirmRemoveOne(item)"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!currentIsLoading && currentItems.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
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

    <Dialog
      v-model:visible="createDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(860px,96vw)]"
      :header="currentResource.createLabel"
      :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <template v-if="props.resource === 'digital'">
          <div v-if="draftNotice" class="sm:col-span-2">
            <Message severity="info">{{ draftNotice }}</Message>
          </div>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Nền tảng áp dụng</span>
            <div class="relative">
              <select v-model="form.targetPlatform" :class="selectFieldClass" :disabled="isSubmitting">
                <option value="YOUTUBE">YOUTUBE</option>
                <option value="TIKTOK">TIKTOK</option>
                <option value="FACEBOOK">FACEBOOK</option>
              </select>
              <i class="pi pi-chevron-down" :class="selectChevronClass" />
            </div>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thời hạn áp dụng</span>
            <div class="relative">
              <select v-model="form.durationType" :class="selectFieldClass" :disabled="isSubmitting">
                <option value="ONE_YEAR">1 năm</option>
                <option value="PERPETUAL">Vĩnh viễn</option>
              </select>
              <i class="pi pi-chevron-down" :class="selectChevronClass" />
            </div>
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá cơ sở</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <div class="space-y-4 sm:col-span-2">
            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Yếu tố phụ thuộc
              </span>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Chọn thuộc tính cần áp dụng cho gói. Với Đối tượng, Thời hạn, Phạm vi bạn chỉnh hệ số trực tiếp; với Hình thức biểu hiện và Mức độ biến đổi hệ số lấy từ màn hình quản lý riêng.
              </p>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`create-digital-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10"
                :disabled="isSubmitting"
                @click="addPriceModifierGroup(group.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="group.kind === 'flag'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`create-digital-active-group-${group.id}`"
                class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  <div v-if="group.kind === 'flag'" class="text-sm text-slate-500 dark:text-slate-400">
                    Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                  </div>
                  <div v-else>
                    <div
                      v-for="item in group.items"
                      :key="`create-digital-modifier-${item.key}`"
                      class="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <div class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ item.label }}</div>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        :class="fieldClass"
                        :disabled="isSubmitting"
                        :value="getPriceModifierMultiplier(item.key)"
                        @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="props.resource === 'physical'">
          <div v-if="draftNotice" class="sm:col-span-2">
            <Message severity="info">{{ draftNotice }}</Message>
          </div>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Bối cảnh / địa điểm sử dụng</span>
            <input v-model="form.venueUsageType" :class="fieldClass" placeholder="PHÒNG TRÀ / HỘI CHỢ / QUÁN CAFE" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá cơ sở</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <div class="space-y-4 sm:col-span-2">
            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Yếu tố phụ thuộc
              </span>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Chọn thuộc tính cần áp dụng cho gói. Với Đối tượng, Thời hạn, Phạm vi bạn chỉnh hệ số trực tiếp; với Hình thức biểu hiện và Mức độ biến đổi hệ số lấy từ màn hình quản lý riêng.
              </p>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`create-physical-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10"
                :disabled="isSubmitting"
                @click="addPriceModifierGroup(group.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="group.kind === 'flag'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`create-physical-active-group-${group.id}`"
                class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  <div v-if="group.kind === 'flag'" class="text-sm text-slate-500 dark:text-slate-400">
                    Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                  </div>
                  <div v-else>
                    <div
                      v-for="item in group.items"
                      :key="`create-physical-modifier-${item.key}`"
                      class="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <div class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ item.label }}</div>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        :class="fieldClass"
                        :disabled="isSubmitting"
                        :value="getPriceModifierMultiplier(item.key)"
                        @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ props.resource === 'expression' ? 'Tên hình thức biểu hiện' : 'Tên mức độ biến đổi' }}
            </span>
            <input v-model="form.name" :class="fieldClass" :placeholder="props.resource === 'expression' ? 'Nhạc nền Vlog' : 'Cải biên phối khí'" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá</span>
            <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <div class="space-y-3 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{{ permissionsLabel }}</span>
          <div v-if="supportsPermissionPicker" class="space-y-3">
            <div
              v-if="isPermissionOptionsLoading || mergedPermissionOptions.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div v-if="isPermissionOptionsLoading" class="space-y-3">
                <div class="h-4 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                <div class="grid gap-2">
                  <div
                    v-for="placeholderIndex in 3"
                    :key="`create-permission-loading-${placeholderIndex}`"
                    class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div class="h-4 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div class="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500 dark:text-slate-400">
                {{ permissionOptionsEmptyMessage }}
              </div>
              <div v-if="isPermissionOptionsLoading" class="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {{ permissionOptionsLoadingMessage }}
              </div>
            </div>
            <div v-else class="grid gap-2">
              <button
                v-for="permission in mergedPermissionOptions"
                :key="permission.id"
                type="button"
                class="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition"
                :class="form.referencedPermissionIds.includes(permission.id)
                  ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200'"
                :disabled="isPermissionSubmitDisabled"
                @click="toggleReferencedPermission(permission.id)"
              >
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px]"
                  :class="form.referencedPermissionIds.includes(permission.id)
                    ? 'border-violet-400 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-500'
                    : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-950'"
                >
                  <i class="pi pi-check" />
                </span>
                <span class="min-w-0">
                  <span class="block font-semibold">{{ permission.name }}</span>
                  <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</span>
                </span>
              </button>
            </div>
          </div>
          <select v-else v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.name }} - {{ permission.lawReference }}
            </option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isSubmitting" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isPermissionSubmitDisabled" @click="submitCreate">{{ createActionLabel }}</button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="editDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(860px,96vw)]"
      :header="editDialogTitle"
      :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <template v-if="props.resource === 'digital'">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Nền tảng áp dụng</span>
            <div class="relative">
              <select v-model="form.targetPlatform" :class="selectFieldClass" :disabled="isSubmitting">
                <option value="YOUTUBE">YOUTUBE</option>
                <option value="TIKTOK">TIKTOK</option>
                <option value="FACEBOOK">FACEBOOK</option>
              </select>
              <i class="pi pi-chevron-down" :class="selectChevronClass" />
            </div>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thời hạn áp dụng</span>
            <div class="relative">
              <select v-model="form.durationType" :class="selectFieldClass" :disabled="isSubmitting">
                <option value="ONE_YEAR">1 năm</option>
                <option value="PERPETUAL">Vĩnh viễn</option>
              </select>
              <i class="pi pi-chevron-down" :class="selectChevronClass" />
            </div>
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá cơ sở</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <div class="space-y-4 sm:col-span-2">
            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Yếu tố phụ thuộc
              </span>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Chọn thuộc tính cần áp dụng cho gói. Với Đối tượng, Thời hạn, Phạm vi bạn chỉnh hệ số trực tiếp; với Hình thức biểu hiện và Mức độ biến đổi hệ số lấy từ màn hình quản lý riêng.
              </p>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`edit-digital-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10"
                :disabled="isSubmitting"
                @click="addPriceModifierGroup(group.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="group.kind === 'flag'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`edit-digital-active-group-${group.id}`"
                class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  <div v-if="group.kind === 'flag'" class="text-sm text-slate-500 dark:text-slate-400">
                    Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                  </div>
                  <div v-else>
                    <div
                      v-for="item in group.items"
                      :key="`edit-digital-modifier-${item.key}`"
                      class="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <div class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ item.label }}</div>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        :class="fieldClass"
                        :disabled="isSubmitting"
                        :value="getPriceModifierMultiplier(item.key)"
                        @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="props.resource === 'physical'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Bối cảnh / địa điểm sử dụng</span>
            <input v-model="form.venueUsageType" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá cơ sở</span>
            <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <div class="space-y-4 sm:col-span-2">
            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Yếu tố phụ thuộc
              </span>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Chọn thuộc tính cần áp dụng cho gói. Với Đối tượng, Thời hạn, Phạm vi bạn chỉnh hệ số trực tiếp; với Hình thức biểu hiện và Mức độ biến đổi hệ số lấy từ màn hình quản lý riêng.
              </p>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`edit-physical-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10"
                :disabled="isSubmitting"
                @click="addPriceModifierGroup(group.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="group.kind === 'flag'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`edit-physical-active-group-${group.id}`"
                class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  <div v-if="group.kind === 'flag'" class="text-sm text-slate-500 dark:text-slate-400">
                    Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                  </div>
                  <div v-else>
                    <div
                      v-for="item in group.items"
                      :key="`edit-physical-modifier-${item.key}`"
                      class="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <div class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ item.label }}</div>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        :class="fieldClass"
                        :disabled="isSubmitting"
                        :value="getPriceModifierMultiplier(item.key)"
                        @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ props.resource === 'expression' ? 'Tên hình thức biểu hiện' : 'Tên mức độ biến đổi' }}
            </span>
            <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hệ số giá</span>
            <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
          </label>
        </template>

        <div class="space-y-3 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{{ permissionsLabel }}</span>
          <div v-if="supportsPermissionPicker" class="space-y-3">
            <div
              v-if="isPermissionOptionsLoading || mergedPermissionOptions.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div v-if="isPermissionOptionsLoading" class="space-y-3">
                <div class="h-4 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                <div class="grid gap-2">
                  <div
                    v-for="placeholderIndex in 3"
                    :key="`edit-permission-loading-${placeholderIndex}`"
                    class="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div class="h-4 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div class="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500 dark:text-slate-400">
                {{ permissionOptionsEmptyMessage }}
              </div>
              <div v-if="isPermissionOptionsLoading" class="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {{ permissionOptionsLoadingMessage }}
              </div>
            </div>
            <div v-else class="grid gap-2">
              <button
                v-for="permission in mergedPermissionOptions"
                :key="permission.id"
                type="button"
                class="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition"
                :class="form.referencedPermissionIds.includes(permission.id)
                  ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200'"
                :disabled="isPermissionSubmitDisabled"
                @click="toggleReferencedPermission(permission.id)"
              >
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px]"
                  :class="form.referencedPermissionIds.includes(permission.id)
                    ? 'border-violet-400 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-500'
                    : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-950'"
                >
                  <i class="pi pi-check" />
                </span>
                <span class="min-w-0">
                  <span class="block font-semibold">{{ permission.name }}</span>
                  <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</span>
                </span>
              </button>
            </div>
          </div>
          <select v-else v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.name }} - {{ permission.lawReference }}
            </option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isSubmitting" @click="editDialogVisible = false">Huỷ</button>
          <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isPermissionSubmitDisabled" @click="submitEdit">Lưu</button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="permissionsDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(720px,96vw)]"
      :header="permissionsDialogTitle"
      :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-10rem)]' } }"
    >
      <div v-if="permissionsDialogPermissions.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        {{ permissionsDialogEmptyState }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="permission in permissionsDialogPermissions"
          :key="permission.id"
          class="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
        >
          <div class="font-semibold">{{ permission.name }}</div>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</div>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="permissionsDialogVisible = false">Đóng</button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="packageProductsDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(860px,96vw)]"
      :header="packageProductsDialogTitle"
      :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-10rem)]' } }"
    >
      <div v-if="packageProductsLoading" class="space-y-3">
        <div v-for="index in 3" :key="`package-product-loading-${index}`" class="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
      </div>
      <div v-else-if="packageProducts.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        Chưa có sản phẩm nào đang tham gia gói này.
      </div>
      <div v-else class="space-y-3">
        <article
          v-for="registration in packageProducts"
          :key="registration.registrationId"
          class="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="font-semibold text-slate-900 dark:text-white">{{ registration.productTitle }}</div>
              <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ registration.title }} · {{ registration.configType === 'DIGITAL' ? 'Digital package' : 'Physical package' }} · {{ registration.configStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng' }}
              </div>
            </div>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
              Đã đăng ký
            </span>
          </div>
        </article>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="packageProductsDialogVisible = false">Đóng</button>
        </div>
      </template>
    </Dialog>

    <LicensingConfigActionMenu
      :visible="Boolean(mobileActionItem)"
      :item="mobileActionItem"
      :resource="props.resource"
      :detail-text="mobileActionItem ? getDetailText(mobileActionItem) : ''"
      :status-label="mobileActionItem ? resolveMobileStatusLabel(mobileActionItem) : ''"
      :is-loading="currentIsLoading"
      :can-open-packages="isDigitalOrPhysicalResource"
      @close="closeMobileActionMenu"
      @edit="openEdit"
      @toggle="confirmToggleStatus"
      @permissions="openPermissionsDialog"
      @packages="openPackageProductsDialog"
      @remove="confirmRemoveOne"
    />
  </div>
</template>
