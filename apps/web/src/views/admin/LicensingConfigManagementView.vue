<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiClientError } from '../../api/axios'
import AdminFilterInput from '../../components/shared/admin/AdminFilterInput.vue'
import AdminFilterSelect from '../../components/shared/admin/AdminFilterSelect.vue'
import AdminPageHeader from '../../components/shared/admin/AdminPageHeader.vue'
import AdminPaginationBar from '../../components/shared/admin/AdminPaginationBar.vue'
import {
  getAdminDigitalPlatformDefaultTemplate,
  listAdminDigitalRightConfigProducts,
  listAdminPhysicalRightConfigProducts,
  updateAdminDigitalPlatformDefaultTemplate,
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
  DigitalPlatformDefaultTemplate,
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
type DigitalTemplateListItem = DigitalRightConfig

const props = defineProps<{
  resource: LicensingConfigResource
}>()

const confirm = useConfirm()

const fieldClass =
  'h-12 w-full min-w-0 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full min-w-0 appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] pl-4 pr-12 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const textAreaClass =
  'min-h-[140px] w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60'
const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-800)] disabled:opacity-60'
const selectChevronClass =
  'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--admin-text-muted)]'
const modalDialogClass = 'w-[calc(100vw-0.75rem)] sm:w-[min(1120px,98vw)] xl:w-[min(1240px,96vw)]'
const dialogContentProps = {
  content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto px-0 sm:max-h-[calc(100svh-5rem)]' },
}
const dialogSurfaceClass =
  'space-y-5 rounded-[30px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-3 sm:p-4'
const formSectionClass =
  'space-y-4 rounded-[26px] border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-5 sm:p-6'
const sectionHeadingClass = 'flex items-center gap-3'
const sectionTitleClass =
  'text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]'
const sectionDividerClass = 'h-px flex-1 bg-[color:rgb(var(--admin-primary-rgb)/0.14)]'
const modifierGroupCardClass =
  'overflow-hidden rounded-[24px] border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] shadow-sm'
const modifierGroupHeaderClass =
  'flex items-start justify-between gap-3 border-b [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4'
const modifierGroupBodyClass = 'space-y-3 px-4 py-4'
const modifierItemCardClass =
  'rounded-[20px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-4'
const modifierInputLabelClass =
  'mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]'
const dependencyHelpText =
  'Tất cả thuộc tính giá của nền tảng được chỉnh trực tiếp tại đây, bao gồm đối tượng, thời hạn, phạm vi, hình thức biểu hiện và mức độ biến đổi.'

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
    title: 'Quản lý nền tảng số',
    description:
      'Quản lý bảng cấu hình nền tảng số theo hướng đa nền tảng. Hiện tại YouTube dùng mẫu mặc định với đầy đủ thuộc tính giá và quyền cốt lõi.',
    createLabel: 'Mở cấu hình nền tảng',
    editLabel: 'Cập nhật cấu hình nền tảng',
    detailColumnLabel: 'Nền tảng',
    detailPlaceholder: 'Nền tảng thương mại áp dụng',
    priceLabel: 'Bộ hệ số giá',
    emptyState: 'Chưa có dữ liệu nền tảng số mặc định.',
    keywordPlaceholder: 'Tìm theo nền tảng hoặc mã cấu hình',
    permissionLabel: 'Quyền cốt lõi bắt buộc',
    emptyPermissionsText: 'Chưa chọn quyền cốt lõi bắt buộc',
    permissionLoadingMessage: 'Đang tải bộ quyền cốt lõi bắt buộc...',
    createSuccessMessage: 'Đã tạo bản nháp cấu hình nền tảng.',
    updateSuccessMessage: 'Đã cập nhật cấu hình nền tảng.',
    deleteSuccessMessage: 'Đã xoá cấu hình nền tảng.',
    permissionsDialogEmptyState: 'Chưa cấu hình quyền cốt lõi bắt buộc.',
    draftNotice: 'Nền tảng số hiện dùng mẫu mặc định. Bạn chỉnh trực tiếp đầy đủ quyền cốt lõi và các thuộc tính giá trong cùng một modal.',
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
const showAdvancedFilters = ref(false)

const pagination = reactive({ page: 1, pageSize: 20 })

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedItem = ref<AnyLicensingConfig | null>(null)
const mobileActionItem = ref<AnyLicensingConfig | null>(null)
const isSubmitting = ref(false)
const hasLoadedPermissionOptions = ref(false)
const hasLoadedDependencyConfigs = ref(false)
const permissionsDialogVisible = ref(false)
const permissionsDialogTitle = ref('Quyền tham khảo')
const permissionsDialogPermissions = ref<ReferencedPermissionSummary[]>([])
const packageProductsDialogVisible = ref(false)
const packageProductsDialogTitle = ref('')
const packageProductsLoading = ref(false)
const packageProducts = ref<ProductPackageRegistration[]>([])
const digitalDefaultTemplate = ref<DigitalPlatformDefaultTemplate | null>(null)
const digitalTemplateLoading = ref(false)

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
type PricingModifierGroup =
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

const pricingModifierGroups: PricingModifierGroup[] = [
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

const normalizePriceModifiers = (
  modifiers: PriceModifier[],
) =>
  Array.from(
    new Map(
      modifiers
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => [item.key, { key: item.key, multiplier: Number(item.multiplier) }]),
    ).values(),
  )

const selectablePricingModifierGroups = computed(() => pricingModifierGroups)

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
  const group = selectablePricingModifierGroups.value.find((item) => item.id === groupId)
  if (!group) return false

  if (group.kind === 'flag') {
    return form.priceModifiers.some((modifier) => modifier.key === group.flagKey)
  }

  return group.items.some((item) => form.priceModifiers.some((modifier) => modifier.key === item.key))
}

const addPriceModifierGroup = (groupId: PricingModifierGroupId) => {
  if (!isDigitalOrPhysical.value) return
  const group = selectablePricingModifierGroups.value.find((item) => item.id === groupId)
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
  const group = selectablePricingModifierGroups.value.find((item) => item.id === groupId)
  if (!group) return

  const removeKeys = new Set(
    group.kind === 'flag' ? [group.flagKey] : group.items.map((item) => item.key),
  )
  const remaining = form.priceModifiers.filter((item) => !removeKeys.has(item.key))
  form.priceModifiers.splice(0, form.priceModifiers.length, ...remaining)
}

const activePricingModifierGroups = computed(() =>
  selectablePricingModifierGroups.value.filter((group) => hasPriceModifierGroup(group.id)),
)

const availablePricingModifierGroups = computed(() =>
  props.resource === 'digital'
    ? []
    : selectablePricingModifierGroups.value.filter((group) => !hasPriceModifierGroup(group.id)),
)

const getPricingModifierGroupDescription = (
  group: PricingModifierGroup,
) => {
  if (group.kind === 'flag') {
    return 'Bật thuộc tính để công thức sử dụng hệ số từ màn hình quản lý riêng.'
  }

  return `Thêm toàn bộ ${group.items.length} giá trị của thuộc tính này để chỉnh hệ số trực tiếp tại đây.`
}

const getPricingModifierGroupBadgeLabel = (
  group: PricingModifierGroup,
) => (group.kind === 'flag' ? 'Lấy hệ số riêng' : 'Chỉnh tại đây')

const getPricingModifierGroupIcon = (
  group: PricingModifierGroup,
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
  group: PricingModifierGroup,
) => {
  switch (group.id) {
    case 'SUBJECT':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
    case 'DURATION':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
    case 'SCOPE':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    case 'EXPRESSION':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
    case 'MODIFICATION':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
  }
}

const getPricingModifierGroupBadgeClass = (
  group: PricingModifierGroup,
) => {
  switch (group.id) {
    case 'SUBJECT':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
    case 'DURATION':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
    case 'SCOPE':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    case 'EXPRESSION':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
    case 'MODIFICATION':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
  }
}

const getPricingModifierItemDescription = (key: VariantPricingModifierKey) => {
  switch (key) {
    case 'SUBJECT_INDIVIDUAL':
      return 'Áp dụng cho khách hàng cá nhân.'
    case 'SUBJECT_ORGANIZATION':
      return 'Áp dụng cho khách hàng tổ chức.'
    case 'DURATION_ONE_YEAR':
      return 'Áp dụng cho gói thời hạn 1 năm.'
    case 'DURATION_PERPETUAL':
      return 'Áp dụng cho gói vĩnh viễn.'
    case 'SCOPE_SINGLE_CHANNEL':
      return 'Áp dụng cho phạm vi 1 kênh.'
    case 'SCOPE_MULTI_CHANNEL':
      return 'Áp dụng cho phạm vi đa kênh.'
    case 'EXPRESSION':
      return 'Áp dụng hệ số cho nhóm hình thức biểu hiện.'
    case 'MODIFICATION':
      return 'Áp dụng hệ số cho nhóm mức độ biến đổi.'
  }
}

const buildDefaultDigitalPriceModifiers = (): PriceModifier[] =>
  pricingModifierGroups.flatMap((group) =>
    group.kind === 'flag'
      ? [{ key: group.flagKey, multiplier: 1 }]
      : group.items.map((item) => ({ key: item.key, multiplier: 1 })),
  )

const mapDigitalDefaultTemplateToListItem = (
  template: DigitalPlatformDefaultTemplate,
): DigitalTemplateListItem => ({
  id: template.id,
  status: 'ACTIVE',
  targetPlatform: template.platformKey,
  durationType: 'ONE_YEAR',
  basePriceMultiplier: template.modifiers.length,
  priceModifiers: normalizePriceModifiers(template.modifiers),
  referencedPermissionIds: [...template.referencedPermissionIds],
  referencedPermissions: [...template.referencedPermissions],
  effectiveReferencedPermissionIds: [...template.referencedPermissionIds],
  effectiveReferencedPermissions: [...template.referencedPermissions],
  createdAt: template.updatedAt ?? new Date().toISOString(),
  updatedAt: template.updatedAt ?? new Date().toISOString(),
})

const isReferencedPermissionSelected = (permissionId: string) =>
  form.referencedPermissionIds.includes(permissionId)

const getReferencedPermissionCardClass = (permissionId: string) =>
  isReferencedPermissionSelected(permissionId)
    ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-[0_12px_32px_-24px_rgba(16,185,129,0.9)] hover:border-emerald-300 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-50'
    : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:-translate-y-0.5 hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:bg-[color:var(--admin-surface-1)]'

const getReferencedPermissionCheckboxClass = (permissionId: string) =>
  isReferencedPermissionSelected(permissionId)
    ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400'
    : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-transparent'

const getReferencedPermissionChipClass = (permissionId: string) =>
  isReferencedPermissionSelected(permissionId)
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    : 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)]'
const isNameValid = computed(() => {
  if (!isExpressionOrModification.value) return true
  return form.name.trim().length > 0
})

const currentItems = computed<AnyLicensingConfig[]>(() => {
  switch (props.resource) {
    case 'digital':
      return digitalDefaultTemplate.value
        ? [mapDigitalDefaultTemplateToListItem(digitalDefaultTemplate.value)]
        : []
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
      return {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: currentItems.value.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
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
      return digitalTemplateLoading.value
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
      return currentItems.value.length
    case 'physical':
      return physicalStore.totalItems
    case 'expression':
      return expressionStore.totalItems
    case 'modification':
      return modificationStore.totalItems
  }
})

const totalPages = computed(() => currentMeta.value?.pagination.totalPages ?? 1)
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
const keywordPlaceholder = computed(() => currentResource.value.keywordPlaceholder)
const statusFieldLabel = computed(() => 'Trạng thái')
const permissionsLabel = computed(() => currentResource.value.permissionLabel)
const actionsLabel = computed(() => 'Thao tác')
const emptyPermissionsText = computed(() => currentResource.value.emptyPermissionsText)
const statusFilterOptions = computed(() => [
  { label: 'Tất cả', value: '' as LicensingConfigStatus | '' },
  { label: isDigitalOrPhysicalResource.value ? formatStatusLabel('ACTIVE') : 'ACTIVE', value: 'ACTIVE' as LicensingConfigStatus },
  { label: isDigitalOrPhysicalResource.value ? formatStatusLabel('INACTIVE') : 'INACTIVE', value: 'INACTIVE' as LicensingConfigStatus },
])
const platformFilterOptions = [
  { label: 'Tất cả', value: '' as DigitalPlatform | '' },
  { label: 'YouTube', value: 'YOUTUBE' as DigitalPlatform },
  { label: 'TikTok', value: 'TIKTOK' as DigitalPlatform },
  { label: 'Facebook', value: 'FACEBOOK' as DigitalPlatform },
]
const durationFilterOptions = [
  { label: 'Tất cả', value: '' as DigitalDurationType | '' },
  { label: '1 năm', value: 'ONE_YEAR' as DigitalDurationType },
  { label: 'Vĩnh viễn', value: 'PERPETUAL' as DigitalDurationType },
]
const editDialogTitle = computed(() => currentResource.value.editLabel)
const draftNotice = computed(() => currentResource.value.draftNotice ?? null)
const isPermissionOptionsLoading = computed(
  () => supportsPermissionPicker.value && (!hasLoadedPermissionOptions.value || corePermissionsStore.isLoading),
)
const activeExpressionConfigs = computed(() =>
  expressionStore.items.filter((item) => item.status === 'ACTIVE'),
)
const activeModificationConfigs = computed(() =>
  modificationStore.items.filter((item) => item.status === 'ACTIVE'),
)
const isDependencyConfigOptionsLoading = computed(
  () =>
    isDigitalOrPhysicalResource.value
    && (!hasLoadedDependencyConfigs.value || expressionStore.isLoading || modificationStore.isLoading),
)
const isPermissionSubmitDisabled = computed(
  () => isSubmitting.value || isPermissionOptionsLoading.value || !isNameValid.value,
)
const permissionOptionsLoadingMessage = computed(() => currentResource.value.permissionLoadingMessage)
const permissionOptionsEmptyMessage = computed(() => 'Hiện chưa có quyền cốt lõi đang hoạt động để lựa chọn.')
const permissionsDialogEmptyState = computed(() => currentResource.value.permissionsDialogEmptyState)
const createActionLabel = computed(() =>
  props.resource === 'digital'
    ? 'Lưu cấu hình'
    : isDraftManagedResource.value
      ? 'Tạo bản nháp'
      : 'Tạo',
)

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

const getDependencyConfigsForGroup = (group: PricingModifierGroup) => {
  if (group.id === 'EXPRESSION') return activeExpressionConfigs.value
  if (group.id === 'MODIFICATION') return activeModificationConfigs.value
  return []
}

const getDisplayReferencedPermissions = (
  item: AnyLicensingConfig,
): ReferencedPermissionSummary[] => {
  if (props.resource === 'digital') {
    return (item as DigitalRightConfig).effectiveReferencedPermissions
  }

  if (props.resource === 'physical') {
    return (item as PhysicalRightConfig).effectiveReferencedPermissions
  }

  return item.referencedPermissions
}

const getPermissionCount = (item: AnyLicensingConfig) =>
  getDisplayReferencedPermissions(item).length

const canOpenPackages = computed(
  () => isDigitalOrPhysicalResource.value && props.resource !== 'digital',
)

const canManageLifecycle = computed(() => props.resource !== 'digital')

const canRemoveConfig = computed(() => props.resource !== 'digital')

const toggleReferencedPermission = (permissionId: string) => {
  form.referencedPermissionIds = form.referencedPermissionIds.includes(permissionId)
    ? form.referencedPermissionIds.filter((item) => item !== permissionId)
    : [...form.referencedPermissionIds, permissionId]
}

const openPermissionsDialog = (item: AnyLicensingConfig) => {
  closeMobileActionMenu()
  permissionsDialogTitle.value = `${getItemDisplayTitle(item)} - Quyền cần thiết`
  permissionsDialogPermissions.value = getDisplayReferencedPermissions(item)
  permissionsDialogVisible.value = true
}

const openPackageProductsDialog = async (item: AnyLicensingConfig) => {
  if (!isDigitalOrPhysicalResource.value) return
  closeMobileActionMenu()

  packageProductsDialogTitle.value = `Sản phẩm đã tham gia - ${getItemDisplayTitle(item)}`
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
    return status === 'ACTIVE' ? 'Đã xuất bản' : 'Bản nháp'
  }

  return status === 'ACTIVE' ? 'Hoạt động' : 'Tắt'
}

const getDigitalPlatformMeta = (platform: DigitalPlatform) => {
  if (platform === 'YOUTUBE') {
    return {
      label: 'YouTube',
      dotClass: 'bg-[color:#ff3b30]',
    }
  }
  if (platform === 'TIKTOK') {
    return {
      label: 'TikTok',
      dotClass: 'bg-[color:#111827]',
    }
  }
  return {
    label: 'Facebook',
    dotClass: 'bg-[color:#1877f2]',
  }
}

const fetchDependencyConfigOptions = async () => {
  if (!isDigitalOrPhysicalResource.value) {
    hasLoadedDependencyConfigs.value = true
    return
  }

  hasLoadedDependencyConfigs.value = false

  try {
    await Promise.all([
      expressionStore.fetchItems({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      modificationStore.fetchItems({ page: 1, pageSize: 100, status: 'ACTIVE' }),
    ])
  } catch (error) {
    setError(error)
  } finally {
    hasLoadedDependencyConfigs.value = true
  }
}

const getItemDisplayTitle = (item: AnyLicensingConfig) =>
  isDigitalResource.value ? `${getDetailText(item)} · #${getConfigReferenceCode(item)}` : getDetailText(item)

const formatDigitalPlatformLabel = (platform: DigitalPlatform) => getDigitalPlatformMeta(platform).label

const formatDurationTypeLabel = (durationType: DigitalDurationType) =>
  durationType === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'

const getDigitalPlatform = (item: AnyLicensingConfig) =>
  props.resource === 'digital' ? (item as DigitalRightConfig).targetPlatform : null

const getDigitalDurationType = (item: AnyLicensingConfig) =>
  props.resource === 'digital' ? (item as DigitalRightConfig).durationType : null

const getConfigReferenceCode = (item: AnyLicensingConfig) => item.id.slice(0, 8).toUpperCase()

const activeAdvancedFilterCount = computed(
  () => [filters.targetPlatform, filters.durationType].filter((value) => Boolean(value)).length,
)

const toggleAdvancedFilters = () => {
  if (!currentResource.value.supportsDigitalFilters) return
  showAdvancedFilters.value = !showAdvancedFilters.value
}

const resetForm = () => {
  form.targetPlatform = 'YOUTUBE'
  form.durationType = 'ONE_YEAR'
  form.basePriceMultiplier = 1
  form.venueUsageType = ''
  form.name = ''
  form.priceMultiplier = 1
  form.referencedPermissionIds = []
  form.priceModifiers = isDigitalResource.value ? buildDefaultDigitalPriceModifiers() : []
}

const fillFormFromItem = (item: AnyLicensingConfig) => {
  resetForm()
  form.referencedPermissionIds = [...item.referencedPermissionIds]

  switch (props.resource) {
    case 'digital': {
      const digitalItem = item as DigitalRightConfig
      form.targetPlatform = digitalItem.targetPlatform
      form.basePriceMultiplier = 1
      form.priceModifiers = normalizePriceModifiers(
        digitalItem.priceModifiers?.length
          ? digitalItem.priceModifiers
          : buildDefaultDigitalPriceModifiers(),
      )
      break
    }
    case 'physical': {
      const physicalItem = item as PhysicalRightConfig
      form.venueUsageType = physicalItem.venueUsageType
      form.basePriceMultiplier = physicalItem.basePriceMultiplier
      form.priceModifiers = normalizePriceModifiers(physicalItem.priceModifiers ?? [])
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
    case 'digital': {
      digitalTemplateLoading.value = true
      try {
        const { data } = await getAdminDigitalPlatformDefaultTemplate()
        const matchesKeyword = !keyword || [
          data.platformLabel,
          data.name,
          data.id,
        ].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))
        const matchesPlatform = !filters.targetPlatform || data.platformKey === filters.targetPlatform

        digitalDefaultTemplate.value = matchesKeyword && matchesPlatform ? data : null
      } finally {
        digitalTemplateLoading.value = false
      }
      break
    }
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
  selectedItem.value =
    props.resource === 'digital' && digitalDefaultTemplate.value
      ? mapDigitalDefaultTemplateToListItem(digitalDefaultTemplate.value)
      : null
  resetForm()
  if (props.resource === 'digital' && digitalDefaultTemplate.value) {
    fillFormFromItem(mapDigitalDefaultTemplateToListItem(digitalDefaultTemplate.value))
  }
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
    ? normalizePriceModifiers(form.priceModifiers)
    : []

  switch (props.resource) {
    case 'digital':
      return {
        referencedPermissionIds,
        modifiers: priceModifiers,
      }
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
    ? normalizePriceModifiers(form.priceModifiers)
    : []

  switch (props.resource) {
    case 'digital':
      return {
        referencedPermissionIds,
        modifiers: priceModifiers,
      }
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
        await updateAdminDigitalPlatformDefaultTemplate(buildCreatePayload() as {
          referencedPermissionIds?: string[]
          modifiers: PriceModifier[]
        })
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
        await updateAdminDigitalPlatformDefaultTemplate(buildUpdatePayload() as {
          referencedPermissionIds?: string[]
          modifiers: PriceModifier[]
        })
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
  if (props.resource === 'digital') return
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
        ? 'Đã xuất bản cấu hình.'
        : 'Đã chuyển cấu hình về bản nháp.'
      : 'Đã cập nhật trạng thái.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const performRemoveOne = async (item: AnyLicensingConfig) => {
  if (props.resource === 'digital') return
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

const handlePageChange = async (page: number) => {
  await goToPage(page)
}

const handlePageSizeChange = async (pageSize: number) => {
  if (pageSize === pagination.pageSize) return
  pagination.pageSize = pageSize
  pagination.page = 1
  await fetchList()
}

const getDetailText = (item: AnyLicensingConfig) => {
  switch (props.resource) {
    case 'digital': {
      const digitalItem = item as DigitalRightConfig
      return `${formatDigitalPlatformLabel(digitalItem.targetPlatform)} · Mẫu mặc định`
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
    ? 'border bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)] [border-color:rgb(var(--admin-success-rgb)/0.28)]'
    : 'border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]'

const resolveMobileStatusLabel = (item: AnyLicensingConfig) =>
  isDigitalOrPhysicalResource.value ? formatStatusLabel(item.status) : item.status

const resolveMobileStatusClass = (item: AnyLicensingConfig) => getStatusClass(item.status)

const resolveMobilePriceValue = (item: AnyLicensingConfig) => String(getPriceValue(item))

const resolveMobilePermissionCountLabel = (item: AnyLicensingConfig) =>
  getPermissionCount(item) === 0 ? emptyPermissionsText.value : `${getPermissionCount(item)} quyền`

const openMobileActionMenu = (item: AnyLicensingConfig) => {
  mobileActionItem.value = item
}

const closeMobileActionMenu = () => {
  mobileActionItem.value = null
}

const confirmToggleStatus = (item: AnyLicensingConfig) => {
  if (props.resource === 'digital') return
  closeMobileActionMenu()
  const nextStatus: LicensingConfigStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const title = getItemDisplayTitle(item)

  if (isDraftManagedResource.value) {
    const header = nextStatus === 'ACTIVE' ? 'Xác nhận xuất bản' : 'Xác nhận chuyển bản nháp'
    const message =
      nextStatus === 'ACTIVE'
        ? `Bạn có chắc muốn xuất bản "${title}" để mở cấu hình này cho đăng ký không?`
        : `Bạn có chắc muốn chuyển "${title}" về trạng thái bản nháp không?`
    const acceptLabel = nextStatus === 'ACTIVE' ? 'Xuất bản' : 'Chuyển nháp'

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
  if (props.resource === 'digital') return
  closeMobileActionMenu()
  const title = getItemDisplayTitle(item)

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
      return `${(item as DigitalRightConfig).priceModifiers.length} thuộc tính`
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
    showAdvancedFilters.value = false
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
    void fetchDependencyConfigOptions()
    void fetchListSafely()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
})

onMounted(() => {
  void fetchPermissionOptions()
  void fetchDependencyConfigOptions()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <AdminPageHeader
      kicker="Cấu hình"
      :title="currentResource.title"
      :description="currentResource.description"
      icon-class="pi pi-sitemap"
    >
      <template #actions>
        <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="currentIsLoading" @click="openCreate">
          <i class="pi pi-plus mr-2" />
          {{ currentResource.createLabel }}
        </button>
      </template>
    </AdminPageHeader>

    <section class="rounded-[32px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px] xl:grid-cols-[minmax(0,1.7fr)_220px_auto] xl:items-center">
        <div>
          <AdminFilterInput
            v-model="filters.keyword"
            icon-class="pi pi-search"
            :placeholder="keywordPlaceholder"
            :disabled="currentIsLoading"
          />
        </div>
        <AdminFilterSelect
          v-model="filters.status"
          icon-class="pi pi-tag"
          :options="statusFilterOptions"
          :disabled="currentIsLoading"
        />
        <button
          v-if="currentResource.supportsDigitalFilters"
          type="button"
          :class="[secondaryButtonClass, 'w-full gap-2 xl:w-auto']"
          :disabled="currentIsLoading"
          @click="toggleAdvancedFilters"
        >
          <i class="pi pi-sliders-h text-sm" />
          Bộ lọc nâng cao
          <span
            v-if="activeAdvancedFilterCount > 0"
            class="inline-flex min-w-6 items-center justify-center rounded-full bg-[color:var(--admin-primary-50)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--admin-primary-800)]"
          >
            {{ activeAdvancedFilterCount }}
          </span>
        </button>
      </div>

      <div
        v-if="currentResource.supportsDigitalFilters && showAdvancedFilters"
        class="mt-3 grid grid-cols-1 gap-3 rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 md:grid-cols-2 [border-color:var(--admin-border)]"
      >
        <AdminFilterSelect
          v-model="filters.targetPlatform"
          icon-class="pi pi-desktop"
          :options="platformFilterOptions"
          :disabled="currentIsLoading"
        />
        <div v-if="props.resource !== 'digital'">
          <AdminFilterSelect
            v-model="filters.durationType"
            icon-class="pi pi-clock"
            :options="durationFilterOptions"
            :disabled="currentIsLoading"
          />
        </div>
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
        :resolve-platform-label="(item) => isDigitalResource ? formatDigitalPlatformLabel(getDigitalPlatform(item)!) : null"
        :resolve-platform-dot-class="(item) => isDigitalResource ? getDigitalPlatformMeta(getDigitalPlatform(item)!).dotClass : null"
        :resolve-duration-label="() => isDigitalResource ? 'Tất cả thuộc tính' : null"
        :resolve-reference-code="(item) => isDigitalResource ? getConfigReferenceCode(item) : null"
        :resolve-price-value="resolveMobilePriceValue"
        :resolve-permission-count-label="resolveMobilePermissionCountLabel"
        :resolve-status-label="resolveMobileStatusLabel"
        :resolve-status-class="resolveMobileStatusClass"
        :can-open-packages="canOpenPackages"
        @edit="openEdit"
        @toggle="confirmToggleStatus"
        @permissions="openPermissionsDialog"
        @packages="openPackageProductsDialog"
        @more="openMobileActionMenu"
      />

      <div class="mt-6 hidden overflow-hidden rounded-[28px] border border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)] sm:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-[linear-gradient(180deg,var(--admin-surface-3),var(--admin-surface-2))] text-xs uppercase tracking-[0.18em] text-[color:var(--admin-text)]">
              <tr>
                <th v-if="isDigitalResource" class="px-4 py-4 font-semibold">Nền tảng</th>
                <th v-if="isDigitalResource" class="px-4 py-4 font-semibold">Thuộc tính</th>
                <th v-else class="px-4 py-4 font-semibold">{{ currentResource.detailColumnLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ currentResource.priceLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ permissionsLabel }}</th>
                <th class="px-4 py-4 font-semibold">{{ statusFieldLabel }}</th>
                <th class="px-4 py-4 text-right font-semibold">{{ actionsLabel }}</th>
              </tr>
            </thead>
            <tbody class="divide-y [--tw-divide-opacity:1] [border-color:var(--admin-border)] divide-y-[color:var(--admin-border)]">
              <tr
                v-for="(item, index) in currentItems"
                :key="item.id"
                class="transition"
                :class="index % 2 === 0
                  ? 'bg-[color:var(--admin-surface-0)] hover:bg-[color:var(--admin-surface-2)]'
                  : 'bg-[color:var(--admin-surface-1)] hover:bg-[color:var(--admin-surface-2)]'"
              >
                <td v-if="isDigitalResource" class="px-4 py-4">
                  <div class="flex items-center gap-3">
                    <span
                      class="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                      :class="getDigitalPlatformMeta(getDigitalPlatform(item)!).dotClass"
                    />
                    <div class="min-w-0">
                      <div class="font-semibold text-[color:var(--admin-text)]">
                        {{ formatDigitalPlatformLabel(getDigitalPlatform(item)!) }}
                      </div>
                      <div class="mt-1 font-mono text-[11px] text-[color:var(--admin-text-muted)]">
                        #{{ getConfigReferenceCode(item) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td v-if="isDigitalResource" class="px-4 py-4">
                  <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                    Tất cả thuộc tính
                  </span>
                </td>
                <td v-else class="px-4 py-4">
                  <div
                    class="max-w-[240px] truncate font-semibold text-[color:var(--admin-text)] md:max-w-[360px] lg:max-w-[480px]"
                    :title="getDetailText(item)"
                  >
                    {{ getDetailText(item) }}
                  </div>
                  <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                    {{ currentResource.detailPlaceholder }}
                  </div>
                </td>
                <td class="px-4 py-4 text-[color:var(--admin-text-muted)]">{{ getPriceValue(item) }}</td>
                <td class="px-4 py-4">
                  <div v-if="getPermissionCount(item) === 0" class="text-[color:var(--admin-text-muted)]">{{ emptyPermissionsText }}</div>
                  <div v-else class="flex items-center gap-3">
                    <button type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="openPermissionsDialog(item)">
                      <i class="pi pi-eye" />
                    </button>
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                      {{ getPermissionCount(item) }} quyền
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    :class="getStatusClass(item.status)"
                  >
                    {{ isDigitalOrPhysicalResource ? formatStatusLabel(item.status) : item.status }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      v-if="canOpenPackages"
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
                    <button v-if="canManageLifecycle" type="button" :class="iconButtonClass" :disabled="currentIsLoading" @click="confirmToggleStatus(item)">
                      <i :class="item.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
                    </button>
                    <button
                      v-if="canRemoveConfig"
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-rose-600 transition [border-color:var(--admin-border)] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 dark:hover:bg-rose-500/10"
                      :disabled="currentIsLoading"
                    @click="confirmRemoveOne(item)"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!currentIsLoading && currentItems.length === 0">
                <td :colspan="isDigitalResource ? 6 : 5" class="px-6 py-12 text-center text-sm text-[color:var(--admin-text-muted)]">
                  {{ currentResource.emptyState }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6">
        <AdminPaginationBar
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="currentTotalItems"
          :disabled="currentIsLoading"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </section>

    <Dialog
      v-model:visible="createDialogVisible"
      modal
      :class="modalDialogClass"
      :header="currentResource.createLabel"
      :pt="dialogContentProps"
    >
      <div :class="dialogSurfaceClass">
        <template v-if="props.resource === 'digital'">
          <div v-if="draftNotice">
            <Message severity="info">{{ draftNotice }}</Message>
          </div>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Nền tảng áp dụng</span>
                <input :value="formatDigitalPlatformLabel(form.targetPlatform)" :class="fieldClass" disabled />
              </label>
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Phạm vi cấu hình</span>
                <input value="Mặc định toàn bộ thuộc tính" :class="fieldClass" disabled />
              </label>
            </div>
          </section>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <div class="flex items-center gap-2">
                <span :class="sectionTitleClass">Yếu tố phụ thuộc</span>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:text-[color:var(--admin-primary-700)]"
                  :title="dependencyHelpText"
                  :aria-label="dependencyHelpText"
                >
                  <i class="pi pi-question-circle text-xs" />
                </button>
              </div>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-3 xl:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`create-digital-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
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
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="getPricingModifierGroupBadgeClass(group)"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--admin-primary-700)] dark:text-[color:var(--admin-primary-700)]">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm text-[color:var(--admin-text-muted)]">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-[color:var(--admin-text-muted)]">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="grid gap-3 xl:grid-cols-2">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`create-digital-active-group-${group.id}`"
                :class="modifierGroupCardClass"
              >
                <div :class="modifierGroupHeaderClass">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button v-if="props.resource !== 'digital'" type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div :class="modifierGroupBodyClass">
                  <div v-if="group.kind === 'flag'" class="text-sm text-[color:var(--admin-text-muted)]">
                    <div class="text-sm text-[color:var(--admin-text-muted)]">
                      Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                    </div>
                    <div class="mt-3">
                      <div
                        v-if="isDependencyConfigOptionsLoading"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Đang tải danh sách {{ group.label.toLowerCase() }}...
                      </div>
                      <div
                        v-else-if="getDependencyConfigsForGroup(group).length === 0"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Chưa có {{ group.label.toLowerCase() }} nào đang hoạt động.
                      </div>
                      <div v-else class="space-y-2">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Danh sách đang áp dụng
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="dependencyItem in getDependencyConfigsForGroup(group)"
                            :key="dependencyItem.id"
                            class="flex items-start justify-between gap-3 rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-3"
                          >
                            <div class="min-w-0">
                              <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                                {{ dependencyItem.name }}
                              </div>
                              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                                {{ dependencyItem.referencedPermissions.length }} quyền tham chiếu
                              </div>
                            </div>
                            <span class="inline-flex shrink-0 rounded-full bg-[color:var(--admin-surface-0)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--admin-text-muted)]">
                              x{{ dependencyItem.priceMultiplier }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="item in group.items"
                      :key="`create-digital-modifier-${item.key}`"
                      :class="modifierItemCardClass"
                    >
                      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                        <div class="min-w-0 lg:max-w-[240px]">
                          <div class="inline-flex items-center rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-sm font-semibold text-[color:var(--admin-text)]">
                            {{ item.label }}
                          </div>
                          <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                            {{ getPricingModifierItemDescription(item.key) }}
                          </div>
                        </div>
                        <label class="block w-full lg:max-w-[240px]">
                          <span :class="modifierInputLabelClass">Hệ số áp dụng</span>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            :class="fieldClass"
                            :disabled="isSubmitting"
                            :value="getPriceModifierMultiplier(item.key)"
                            @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-if="props.resource === 'physical'">
          <div v-if="draftNotice">
            <Message severity="info">{{ draftNotice }}</Message>
          </div>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-2 sm:col-span-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Bối cảnh / địa điểm sử dụng</span>
                <input v-model="form.venueUsageType" :class="fieldClass" placeholder="PHÒNG TRÀ / HỘI CHỢ / QUÁN CAFE" :disabled="isSubmitting" />
              </label>
              <label class="space-y-2 sm:col-span-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Hệ số giá cơ sở</span>
                <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
              </label>
            </div>
          </section>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <div class="flex items-center gap-2">
                <span :class="sectionTitleClass">Yếu tố phụ thuộc</span>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:text-[color:var(--admin-primary-700)]"
                  :title="dependencyHelpText"
                  :aria-label="dependencyHelpText"
                >
                  <i class="pi pi-question-circle text-xs" />
                </button>
              </div>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-3 xl:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`create-physical-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
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
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="getPricingModifierGroupBadgeClass(group)"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--admin-primary-700)] dark:text-[color:var(--admin-primary-700)]">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm text-[color:var(--admin-text-muted)]">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-[color:var(--admin-text-muted)]">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="grid gap-3 xl:grid-cols-2">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`create-physical-active-group-${group.id}`"
                :class="modifierGroupCardClass"
              >
                <div :class="modifierGroupHeaderClass">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div :class="modifierGroupBodyClass">
                  <div v-if="group.kind === 'flag'" class="text-sm text-[color:var(--admin-text-muted)]">
                    <div class="text-sm text-[color:var(--admin-text-muted)]">
                      Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                    </div>
                    <div class="mt-3">
                      <div
                        v-if="isDependencyConfigOptionsLoading"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Đang tải danh sách {{ group.label.toLowerCase() }}...
                      </div>
                      <div
                        v-else-if="getDependencyConfigsForGroup(group).length === 0"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Chưa có {{ group.label.toLowerCase() }} nào đang hoạt động.
                      </div>
                      <div v-else class="space-y-2">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Danh sách đang áp dụng
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="dependencyItem in getDependencyConfigsForGroup(group)"
                            :key="dependencyItem.id"
                            class="flex items-start justify-between gap-3 rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-3"
                          >
                            <div class="min-w-0">
                              <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                                {{ dependencyItem.name }}
                              </div>
                              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                                {{ dependencyItem.referencedPermissions.length }} quyền tham chiếu
                              </div>
                            </div>
                            <span class="inline-flex shrink-0 rounded-full bg-[color:var(--admin-surface-0)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--admin-text-muted)]">
                              x{{ dependencyItem.priceMultiplier }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="item in group.items"
                      :key="`create-physical-modifier-${item.key}`"
                      :class="modifierItemCardClass"
                    >
                      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                        <div class="min-w-0 lg:max-w-[240px]">
                          <div class="inline-flex items-center rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-sm font-semibold text-[color:var(--admin-text)]">
                            {{ item.label }}
                          </div>
                          <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                            {{ getPricingModifierItemDescription(item.key) }}
                          </div>
                        </div>
                        <label class="block w-full lg:max-w-[240px]">
                          <span :class="modifierInputLabelClass">Hệ số áp dụng</span>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            :class="fieldClass"
                            :disabled="isSubmitting"
                            :value="getPriceModifierMultiplier(item.key)"
                            @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4">
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                  {{ props.resource === 'expression' ? 'Tên hình thức biểu hiện' : 'Tên mức độ biến đổi' }}
                </span>
                <input v-model="form.name" :class="fieldClass" :placeholder="props.resource === 'expression' ? 'Nhạc nền Vlog' : 'Cải biên phối khí'" :disabled="isSubmitting" />
              </label>
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Hệ số giá</span>
                <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
              </label>
            </div>
          </section>
        </template>

        <section :class="formSectionClass">
          <div :class="sectionHeadingClass">
            <span :class="sectionTitleClass">{{ permissionsLabel }}</span>
            <div :class="sectionDividerClass" />
          </div>
          <div v-if="supportsPermissionPicker" class="space-y-3">
            <div
              v-if="isPermissionOptionsLoading || mergedPermissionOptions.length === 0"
              class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4"
            >
              <div v-if="isPermissionOptionsLoading" class="space-y-3">
                <div class="h-4 w-40 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                <div class="grid gap-2">
                  <div
                    v-for="placeholderIndex in 3"
                    :key="`create-permission-loading-${placeholderIndex}`"
                    class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-4 py-4"
                  >
                    <div class="h-4 w-3/4 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                    <div class="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-[color:var(--admin-text-muted)]">
                {{ permissionOptionsEmptyMessage }}
              </div>
              <div v-if="isPermissionOptionsLoading" class="mt-3 text-xs text-[color:var(--admin-text-muted)]">
                {{ permissionOptionsLoadingMessage }}
              </div>
            </div>
            <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="permission in mergedPermissionOptions"
                :key="permission.id"
                type="button"
                class="flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--admin-ring)]"
                :class="getReferencedPermissionCardClass(permission.id)"
                :disabled="isPermissionSubmitDisabled"
                :aria-pressed="isReferencedPermissionSelected(permission.id)"
                @click="toggleReferencedPermission(permission.id)"
              >
                <span class="flex min-w-0 items-start gap-3">
                  <span
                    class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px]"
                    :class="getReferencedPermissionCheckboxClass(permission.id)"
                  >
                    <i class="pi pi-check" />
                  </span>
                  <span class="min-w-0">
                    <span class="block font-semibold">{{ permission.name }}</span>
                    <span class="mt-1 block text-xs text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</span>
                  </span>
                </span>
                <span
                  class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="getReferencedPermissionChipClass(permission.id)"
                >
                  {{ isReferencedPermissionSelected(permission.id) ? 'Đã chọn' : 'Chọn' }}
                </span>
              </button>
            </div>
          </div>
          <select v-else v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.name }} - {{ permission.lawReference }}
            </option>
          </select>
        </section>
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
      :class="modalDialogClass"
      :header="editDialogTitle"
      :pt="dialogContentProps"
    >
      <div :class="dialogSurfaceClass">
        <template v-if="props.resource === 'digital'">
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Nền tảng áp dụng</span>
                <input :value="formatDigitalPlatformLabel(form.targetPlatform)" :class="fieldClass" disabled />
              </label>
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Phạm vi cấu hình</span>
                <input value="Mặc định toàn bộ thuộc tính" :class="fieldClass" disabled />
              </label>
            </div>
          </section>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <div class="flex items-center gap-2">
                <span :class="sectionTitleClass">Yếu tố phụ thuộc</span>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:text-[color:var(--admin-primary-700)]"
                  :title="dependencyHelpText"
                  :aria-label="dependencyHelpText"
                >
                  <i class="pi pi-question-circle text-xs" />
                </button>
              </div>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-3 xl:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`edit-digital-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
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
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="getPricingModifierGroupBadgeClass(group)"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--admin-primary-700)] dark:text-[color:var(--admin-primary-700)]">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm text-[color:var(--admin-text-muted)]">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-[color:var(--admin-text-muted)]">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="grid gap-3 xl:grid-cols-2">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`edit-digital-active-group-${group.id}`"
                :class="modifierGroupCardClass"
              >
                <div :class="modifierGroupHeaderClass">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button v-if="props.resource !== 'digital'" type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div :class="modifierGroupBodyClass">
                  <div v-if="group.kind === 'flag'" class="text-sm text-[color:var(--admin-text-muted)]">
                    <div class="text-sm text-[color:var(--admin-text-muted)]">
                      Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                    </div>
                    <div class="mt-3">
                      <div
                        v-if="isDependencyConfigOptionsLoading"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Đang tải danh sách {{ group.label.toLowerCase() }}...
                      </div>
                      <div
                        v-else-if="getDependencyConfigsForGroup(group).length === 0"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Chưa có {{ group.label.toLowerCase() }} nào đang hoạt động.
                      </div>
                      <div v-else class="space-y-2">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Danh sách đang áp dụng
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="dependencyItem in getDependencyConfigsForGroup(group)"
                            :key="dependencyItem.id"
                            class="flex items-start justify-between gap-3 rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-3"
                          >
                            <div class="min-w-0">
                              <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                                {{ dependencyItem.name }}
                              </div>
                              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                                {{ dependencyItem.referencedPermissions.length }} quyền tham chiếu
                              </div>
                            </div>
                            <span class="inline-flex shrink-0 rounded-full bg-[color:var(--admin-surface-0)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--admin-text-muted)]">
                              x{{ dependencyItem.priceMultiplier }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="item in group.items"
                      :key="`edit-digital-modifier-${item.key}`"
                      :class="modifierItemCardClass"
                    >
                      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                        <div class="min-w-0 lg:max-w-[240px]">
                          <div class="inline-flex items-center rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-sm font-semibold text-[color:var(--admin-text)]">
                            {{ item.label }}
                          </div>
                          <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                            {{ getPricingModifierItemDescription(item.key) }}
                          </div>
                        </div>
                        <label class="block w-full lg:max-w-[240px]">
                          <span :class="modifierInputLabelClass">Hệ số áp dụng</span>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            :class="fieldClass"
                            :disabled="isSubmitting"
                            :value="getPriceModifierMultiplier(item.key)"
                            @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-if="props.resource === 'physical'">
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-2 sm:col-span-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Bối cảnh / địa điểm sử dụng</span>
                <input v-model="form.venueUsageType" :class="fieldClass" :disabled="isSubmitting" />
              </label>
              <label class="space-y-2 sm:col-span-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Hệ số giá cơ sở</span>
                <input v-model.number="form.basePriceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
              </label>
            </div>
          </section>
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <div class="flex items-center gap-2">
                <span :class="sectionTitleClass">Yếu tố phụ thuộc</span>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:text-[color:var(--admin-primary-700)]"
                  :title="dependencyHelpText"
                  :aria-label="dependencyHelpText"
                >
                  <i class="pi pi-question-circle text-xs" />
                </button>
              </div>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-3 xl:grid-cols-2">
              <button
                v-for="group in availablePricingModifierGroups"
                :key="`edit-physical-available-group-${group.id}`"
                type="button"
                class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
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
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="getPricingModifierGroupBadgeClass(group)"
                  >
                    {{ getPricingModifierGroupBadgeLabel(group) }}
                  </span>
                </div>
                <div class="mt-4">
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--admin-primary-700)] dark:text-[color:var(--admin-primary-700)]">
                    <i class="pi pi-plus-circle text-xs" />
                    Thêm thuộc tính
                  </span>
                </div>
              </button>
            </div>
            <div v-if="availablePricingModifierGroups.length === 0" class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm text-[color:var(--admin-text-muted)]">
              Tất cả thuộc tính hiện có đã được thêm vào gói này.
            </div>
            <div v-if="activePricingModifierGroups.length === 0" class="text-sm text-[color:var(--admin-text-muted)]">
              Chưa cấu hình yếu tố phụ thuộc.
            </div>
            <div v-else class="grid gap-3 xl:grid-cols-2">
              <div
                v-for="group in activePricingModifierGroups"
                :key="`edit-physical-active-group-${group.id}`"
                :class="modifierGroupCardClass"
              >
                <div :class="modifierGroupHeaderClass">
                  <div class="flex min-w-0 items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      :class="getPricingModifierGroupIconClass(group)"
                    >
                      <i class="pi text-sm" :class="getPricingModifierGroupIcon(group)" />
                    </span>
                    <div>
                      <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ group.label }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ getPricingModifierGroupDescription(group) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="iconButtonClass" :disabled="isSubmitting" @click="removePriceModifierGroup(group.id)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <div :class="modifierGroupBodyClass">
                  <div v-if="group.kind === 'flag'" class="text-sm text-[color:var(--admin-text-muted)]">
                    <div class="text-sm text-[color:var(--admin-text-muted)]">
                      Hệ số được quản lý ở màn hình riêng. Chỉ cần bật thuộc tính này để áp dụng vào công thức tính giá.
                    </div>
                    <div class="mt-3">
                      <div
                        v-if="isDependencyConfigOptionsLoading"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Đang tải danh sách {{ group.label.toLowerCase() }}...
                      </div>
                      <div
                        v-else-if="getDependencyConfigsForGroup(group).length === 0"
                        class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm"
                      >
                        Chưa có {{ group.label.toLowerCase() }} nào đang hoạt động.
                      </div>
                      <div v-else class="space-y-2">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Danh sách đang áp dụng
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="dependencyItem in getDependencyConfigsForGroup(group)"
                            :key="dependencyItem.id"
                            class="flex items-start justify-between gap-3 rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-3"
                          >
                            <div class="min-w-0">
                              <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                                {{ dependencyItem.name }}
                              </div>
                              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                                {{ dependencyItem.referencedPermissions.length }} quyền tham chiếu
                              </div>
                            </div>
                            <span class="inline-flex shrink-0 rounded-full bg-[color:var(--admin-surface-0)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--admin-text-muted)]">
                              x{{ dependencyItem.priceMultiplier }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="item in group.items"
                      :key="`edit-physical-modifier-${item.key}`"
                      :class="modifierItemCardClass"
                    >
                      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                        <div class="min-w-0 lg:max-w-[240px]">
                          <div class="inline-flex items-center rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-sm font-semibold text-[color:var(--admin-text)]">
                            {{ item.label }}
                          </div>
                          <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                            {{ getPricingModifierItemDescription(item.key) }}
                          </div>
                        </div>
                        <label class="block w-full lg:max-w-[240px]">
                          <span :class="modifierInputLabelClass">Hệ số áp dụng</span>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            :class="fieldClass"
                            :disabled="isSubmitting"
                            :value="getPriceModifierMultiplier(item.key)"
                            @input="setPriceModifierMultiplier(item.key, Number(($event.target as HTMLInputElement).value))"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-if="props.resource === 'expression' || props.resource === 'modification'">
          <section :class="formSectionClass">
            <div :class="sectionHeadingClass">
              <span :class="sectionTitleClass">Thông tin cơ bản</span>
              <div :class="sectionDividerClass" />
            </div>
            <div class="grid gap-4">
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                  {{ props.resource === 'expression' ? 'Tên hình thức biểu hiện' : 'Tên mức độ biến đổi' }}
                </span>
                <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
              </label>
              <label class="space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Hệ số giá</span>
                <input v-model.number="form.priceMultiplier" type="number" min="1" step="0.01" :class="fieldClass" :disabled="isSubmitting" />
              </label>
            </div>
          </section>
        </template>

        <section :class="formSectionClass">
          <div :class="sectionHeadingClass">
            <span :class="sectionTitleClass">{{ permissionsLabel }}</span>
            <div :class="sectionDividerClass" />
          </div>
          <div v-if="supportsPermissionPicker" class="space-y-3">
            <div
              v-if="isPermissionOptionsLoading || mergedPermissionOptions.length === 0"
              class="rounded-2xl border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4"
            >
              <div v-if="isPermissionOptionsLoading" class="space-y-3">
                <div class="h-4 w-40 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                <div class="grid gap-2">
                  <div
                    v-for="placeholderIndex in 3"
                    :key="`edit-permission-loading-${placeholderIndex}`"
                    class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-4 py-4"
                  >
                    <div class="h-4 w-3/4 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                    <div class="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-[color:var(--admin-surface-1)]" />
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-[color:var(--admin-text-muted)]">
                {{ permissionOptionsEmptyMessage }}
              </div>
              <div v-if="isPermissionOptionsLoading" class="mt-3 text-xs text-[color:var(--admin-text-muted)]">
                {{ permissionOptionsLoadingMessage }}
              </div>
            </div>
            <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="permission in mergedPermissionOptions"
                :key="permission.id"
                type="button"
                class="flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--admin-ring)]"
                :class="getReferencedPermissionCardClass(permission.id)"
                :disabled="isPermissionSubmitDisabled"
                :aria-pressed="isReferencedPermissionSelected(permission.id)"
                @click="toggleReferencedPermission(permission.id)"
              >
                <span class="flex min-w-0 items-start gap-3">
                  <span
                    class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px]"
                    :class="getReferencedPermissionCheckboxClass(permission.id)"
                  >
                    <i class="pi pi-check" />
                  </span>
                  <span class="min-w-0">
                    <span class="block font-semibold">{{ permission.name }}</span>
                    <span class="mt-1 block text-xs text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</span>
                  </span>
                </span>
                <span
                  class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="getReferencedPermissionChipClass(permission.id)"
                >
                  {{ isReferencedPermissionSelected(permission.id) ? 'Đã chọn' : 'Chọn' }}
                </span>
              </button>
            </div>
          </div>
          <select v-else v-model="form.referencedPermissionIds" multiple :class="textAreaClass" :disabled="isSubmitting">
            <option v-for="permission in mergedPermissionOptions" :key="permission.id" :value="permission.id">
              {{ permission.name }} - {{ permission.lawReference }}
            </option>
          </select>
        </section>
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
      <div v-if="permissionsDialogPermissions.length === 0" class="rounded-[24px] border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-5 py-6 text-sm text-[color:var(--admin-text-muted)]">
        {{ permissionsDialogEmptyState }}
      </div>
      <div v-else class="space-y-4">
        <section class="rounded-[24px] border [border-color:var(--admin-border)] bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] px-5 py-4 shadow-sm dark:bg-[color:var(--admin-primary-50)]">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--admin-surface-0)] text-[color:var(--admin-primary-700)] shadow-sm">
                <i class="pi pi-shield text-base" />
              </span>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                  Bộ quyền cần có để cấu hình này hoạt động đúng
                </div>
                <div class="mt-1 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                  Danh sách đã bao gồm quyền gốc và quyền phát sinh từ các thuộc tính phụ thuộc đang bật.
                </div>
              </div>
            </div>
            <span class="inline-flex shrink-0 items-center rounded-full bg-[color:var(--admin-surface-0)] px-3 py-1.5 text-xs font-semibold text-[color:var(--admin-primary-800)] shadow-sm">
              {{ permissionsDialogPermissions.length }} quyền
            </span>
          </div>
        </section>
        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="permission in permissionsDialogPermissions"
            :key="permission.id"
            class="group rounded-[24px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] px-4 py-4 text-sm text-[color:var(--admin-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.45)]"
          >
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--admin-surface-0)] text-[color:var(--admin-primary-700)] shadow-sm">
                <i class="pi pi-book text-sm" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-semibold leading-6 text-[color:var(--admin-text)]">
                  {{ permission.name }}
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center rounded-full bg-[color:var(--admin-surface-0)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">
                    Căn cứ pháp lý
                  </span>
                  <span class="text-xs leading-5 text-[color:var(--admin-text-muted)]">
                    {{ permission.lawReference }}
                  </span>
                </div>
              </div>
            </div>
          </article>
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
        <div v-for="index in 3" :key="`package-product-loading-${index}`" class="h-20 animate-pulse rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)]" />
      </div>
      <div v-else-if="packageProducts.length === 0" class="text-sm text-[color:var(--admin-text-muted)]">
        Chưa có sản phẩm nào đang tham gia gói này.
      </div>
      <div v-else class="space-y-3">
        <article
          v-for="registration in packageProducts"
          :key="registration.registrationId"
          class="rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-4 py-4 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="font-semibold text-[color:var(--admin-text)]">{{ registration.productTitle }}</div>
              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                {{ registration.title }} · {{ registration.configType === 'DIGITAL' ? 'Digital package' : 'Physical package' }} · {{ registration.configStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng' }}
              </div>
            </div>
            <span class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] text-[color:var(--admin-primary-800)] dark:bg-[color:var(--admin-primary-50)] dark:text-[color:var(--admin-primary-800)]">
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
      :can-open-packages="canOpenPackages"
      :can-manage-lifecycle="canManageLifecycle"
      :can-remove="canRemoveConfig"
      @close="closeMobileActionMenu"
      @edit="openEdit"
      @toggle="confirmToggleStatus"
      @permissions="openPermissionsDialog"
      @packages="openPackageProductsDialog"
      @remove="confirmRemoveOne"
    />
  </div>
</template>
