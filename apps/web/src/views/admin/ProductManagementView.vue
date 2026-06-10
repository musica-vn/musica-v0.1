<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiClientError } from '../../api/axios'
import { useDebouncedWatch } from '../../composables/useDebouncedWatch'
import type { ComplianceDetail } from '../../types/compliance.types'
import { getAdminComplianceDetail } from '../../services/compliance.service'
import { listManagedUsers } from '../../services/managed-users.service'
import type { ManagedUser } from '../../types/managed-users.types'
import type {
  Product,
  ProductLicensingEligibilityConfig,
  ProductSortValue,
  ProductStatus,
  ProductThumbnailExtension,
} from '../../types/products.types'
import {
  PRODUCT_GENRE_OPTIONS,
  PRODUCT_USE_CASE_OPTIONS,
  resolveProductGenreLabel,
  resolveProductUseCaseLabel,
  type ProductGenre,
  type ProductUseCase,
} from '../../constants/products.enums'
import {
  createAdminDigitalRightRegistration,
  createAdminPhysicalRightRegistration,
  confirmAdminProductAudioUpload,
  confirmAdminProductSheetMusicUpload,
  confirmAdminProductThumbnailUpload,
  createAdminProduct,
  getAdminProductsSummary,
  getSheetMusicUploadUrl,
  getSheetMusicUrl,
  getThumbnailUploadUrl,
  getOriginalUploadUrl,
  getOriginalPlaybackUrl,
  getProductThumbnailUrl,
  hideAdminProduct,
  listAdminProducts,
  publishAdminProduct,
  removeAdminDigitalRightRegistration,
  removeAdminPhysicalRightRegistration,
  replaceAdminProductAllowedPermissions,
  updateAdminProduct,
} from '../../services/products.service'
import ProductWavePreview from '../../components/features/products/ProductWavePreview.vue'
import AdminProductUpsertDialog from '../../components/features/products/AdminProductUpsertDialog.vue'
import ProductManagementActionMenu from '../../components/features/admin-shell/ProductManagementActionMenu.vue'
import ProductManagementMobileCardList from '../../components/features/admin-shell/ProductManagementMobileCardList.vue'
import AdminStatCard from '../../components/features/admin-shell/AdminStatCard.vue'
import AdminButton from '../../components/shared/admin/AdminButton.vue'
import AdminFilterInput from '../../components/shared/admin/AdminFilterInput.vue'
import AdminFilterSelect from '../../components/shared/admin/AdminFilterSelect.vue'
import AdminPageHeader from '../../components/shared/admin/AdminPageHeader.vue'
import AdminPanel from '../../components/shared/admin/AdminPanel.vue'
import AdminPaginationBar from '../../components/shared/admin/AdminPaginationBar.vue'

type ProductForm = {
  title: string
  artistId: string
  genres: ProductGenre[]
  useCases: ProductUseCase[]
  description: string
  duration: string
}

const defaultSort: ProductSortValue = 'updatedAt:desc'
const fieldClass =
  'h-12 w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const fileInputClass =
  'block w-full text-sm text-[color:var(--admin-text-muted)] file:mr-4 file:rounded-2xl file:border-0 file:bg-[color:var(--admin-primary-50)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[color:var(--admin-text)] hover:file:bg-[color:var(--admin-surface-2)]'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-500)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-contrast)] transition hover:bg-[color:var(--admin-primary-600)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:cursor-not-allowed disabled:opacity-60'
const detailDialogClass = 'w-[calc(100vw-0.75rem)] sm:w-[min(1180px,96vw)] lg:w-[min(1280px,96vw)]'

const confirm = useConfirm()
const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const createDialogErrorMessage = ref<string | null>(null)
const editDialogErrorMessage = ref<string | null>(null)

const rows = ref<Product[]>([])
const totalItems = ref(0)
const summaryCounts = reactive({
  total: 0,
  published: 0,
  hidden: 0,
  pending: 0,
})

const maxPageSize = 10
const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const filters = reactive<{
  keyword: string
  sort: ProductSortValue
  status: ProductStatus | ''
  genre: string
}>({
  keyword: '',
  sort: defaultSort,
  status: '',
  genre: '',
})

const sortOptions: Array<{ label: string; value: ProductSortValue }> = [
  { label: 'Mới nhất', value: 'createdAt:desc' },
  { label: 'Cũ nhất', value: 'createdAt:asc' },
  { label: 'Cập nhật gần đây', value: 'updatedAt:desc' },
  { label: 'Lâu chưa cập nhật', value: 'updatedAt:asc' },
  { label: 'Tên A-Z', value: 'title:asc' },
  { label: 'Tên Z-A', value: 'title:desc' },
  { label: 'Trạng thái A-Z', value: 'status:asc' },
  { label: 'Trạng thái Z-A', value: 'status:desc' },
  { label: 'Thể loại A-Z', value: 'genre:asc' },
  { label: 'Thể loại Z-A', value: 'genre:desc' },
]

const statusOptions: Array<{ label: string; value: ProductStatus | '' }> = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ kiểm duyệt', value: 'PENDING' },
  { label: 'Đang phát hành', value: 'PUBLISHED' },
  { label: 'Đang ẩn', value: 'HIDDEN' },
]

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const approvedPermissionsDialogVisible = ref(false)
const approvedPermissionsLoading = ref(false)
const approvedPermissionsSaving = ref(false)
const packageActionTarget = ref<string | null>(null)
const detailActiveTab = ref<'info' | 'licensing'>('info')

const detailTabs = [
  { key: 'info' as const, label: 'Thông tin chung', icon: 'pi pi-file-edit' },
  { key: 'licensing' as const, label: 'Quyền & Licensing', icon: 'pi pi-book' },
]

const selectedTrack = ref<Product | null>(null)
const approvedPermissionsTrack = ref<Product | null>(null)
const approvedPermissionsDetail = ref<ComplianceDetail | null>(null)
const selectedAllowedPermissionIds = ref<string[]>([])
const mobileActionTrack = ref<Product | null>(null)

type ApprovedPermissionOption = {
  id: string
  name: string
  lawReference: string
}
type ArtistOption = {
  value: string
  label: string
  email: string
}
const createForm = reactive<ProductForm>({
  title: '',
  artistId: '',
  genres: [],
  useCases: [],
  description: '',
  duration: '',
})
const editForm = reactive<ProductForm>({
  title: '',
  artistId: '',
  genres: [],
  useCases: [],
  description: '',
  duration: '',
})

const createOriginalFile = ref<File | null>(null)
const editOriginalFile = ref<File | null>(null)
const createSheetMusicFile = ref<File | null>(null)
const editSheetMusicFile = ref<File | null>(null)
const createThumbnailFile = ref<File | null>(null)
const editThumbnailFile = ref<File | null>(null)
const createOriginalAudioUrl = ref<string | null>(null)
const createThumbnailUrl = ref<string | null>(null)
const editThumbnailUrl = ref<string | null>(null)

const uploadFile = ref<File | null>(null)
const uploadStatus = ref<'idle' | 'requesting' | 'uploading' | 'done' | 'error'>('idle')
const uploadResult = ref<{ fileKey: string; uploadUrl: string } | null>(null)
const uploadError = ref<string | null>(null)
const originalAudioUrls = ref<Record<string, string>>({})
const originalAudioLoading = ref<Record<string, boolean>>({})
const thumbnailUrls = ref<Record<string, string>>({})
const thumbnailLoading = ref<Record<string, boolean>>({})
const artistOptions = ref<ArtistOption[]>([])
const isArtistsLoading = ref(false)
const hasLoadedArtists = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pagination.pageSize)))
const pageStart = computed(() => (totalItems.value === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, totalItems.value))
const pendingProductsDescription = computed(() =>
  summaryCounts.pending === 0
    ? 'Khong co gi can duyet - tuyet voi!'
    : `${summaryCounts.pending} sản phẩm mới hoặc chưa duyệt`,
)
const summaryCards = computed(() => [
  {
    title: 'Tổng số sản phẩm',
    value: summaryCounts.total,
    description: 'Toàn bộ dữ liệu theo bộ lọc',
    icon: 'pi pi-wave-pulse',
    tone: 'slate' as const,
  },
  {
    title: 'Chờ kiểm duyệt',
    value: summaryCounts.pending,
    description: pendingProductsDescription.value,
    icon: 'pi pi-clock',
    tone: 'amber' as const,
  },
  {
    title: 'Đang phát hành',
    value: summaryCounts.published,
    description: 'Tổng số track đang hiển thị',
    icon: 'pi pi-check-circle',
    tone: 'emerald' as const,
  },
  {
    title: 'Đang ẩn',
    value: summaryCounts.hidden,
    description: 'Tổng số track đang ẩn',
    icon: 'pi pi-eye-slash',
    tone: 'sky' as const,
  },
])
const activeFilterChips = computed(() => {
  const chips: string[] = []
  const keyword = filters.keyword.trim()
  const genre = filters.genre.trim()

  if (keyword.length > 0) chips.push(`Từ khoá: ${keyword}`)
  if (genre.length > 0) chips.push(`Thể loại: ${genre}`)
  if (filters.status) {
    const statusLabel = statusOptions.find((option) => option.value === filters.status)?.label
    if (statusLabel) chips.push(`Trạng thái: ${statusLabel}`)
  }
  if (filters.sort !== defaultSort) {
    const sortLabel = sortOptions.find((option) => option.value === filters.sort)?.label
    if (sortLabel) chips.push(`Sắp xếp: ${sortLabel}`)
  }

  return chips
})
const getEligibilityTotal = (track: Product, type: 'digital' | 'physical') =>
  type === 'digital'
    ? track.licensingEligibility.summary.eligibleDigitalCount + track.licensingEligibility.summary.ineligibleDigitalCount
    : track.licensingEligibility.summary.eligiblePhysicalCount + track.licensingEligibility.summary.ineligiblePhysicalCount
const formatEligibilityStatusLabel = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Không đủ điều kiện'
const getEligibilityStatusClass = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE'
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200'
const getEligibilitySectionClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-[24px] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(14,165,233,0.07),var(--admin-surface-1))] p-4 shadow-sm dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.08),var(--admin-surface-1))]'
    : 'rounded-[24px] border border-violet-200/80 bg-[linear-gradient(180deg,rgba(139,92,246,0.07),var(--admin-surface-1))] p-4 shadow-sm dark:border-violet-400/20 dark:bg-[linear-gradient(180deg,rgba(167,139,250,0.08),var(--admin-surface-1))]'
const getEligibilitySectionIconClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'text-sky-700 dark:text-sky-300'
    : 'text-violet-700 dark:text-violet-300'
const getEligibilitySectionCountClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200'
    : 'rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200'
const getEligibilityConfigCardClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-2xl border border-sky-100 bg-[color:var(--admin-surface-0)] p-4 shadow-sm dark:border-sky-400/10'
    : 'rounded-2xl border border-violet-100 bg-[color:var(--admin-surface-0)] p-4 shadow-sm dark:border-violet-400/10'
const isConfigJoined = (config: ProductLicensingEligibilityConfig) => config.registrationStatus === 'JOINED'
const getRegistrationStatusLabel = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config) ? 'Đã đăng ký' : 'Chưa đăng ký'
const getRegistrationStatusClass = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config)
    ? 'border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200'
    : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-200'
const getMissingPermissionsSummaryClass = () =>
  'rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100'
const getMissingPermissionItemClass = () =>
  'rounded-2xl border border-amber-200/80 bg-[color:var(--admin-surface-0)] px-3 py-3 text-sm text-[color:var(--admin-text)] shadow-sm dark:border-amber-400/20 dark:bg-[color:var(--admin-surface-0)]'
const getPackageActionKey = (trackId: string, configId: string) => `${trackId}:${configId}`
const isPackageActionLoading = (trackId: string, configId: string) =>
  packageActionTarget.value === getPackageActionKey(trackId, configId)
const refreshTrackAfterPackageAction = async (trackId: string) => {
  await refreshTrackDashboard()
  const refreshed = rows.value.find((item) => item.id === trackId) ?? null
  if (refreshed) {
    selectedTrack.value = refreshed
  }
}
const doSubmitPackageRegistration = async (
  track: Product,
  config: ProductLicensingEligibilityConfig,
) => {
  packageActionTarget.value = getPackageActionKey(track.id, config.configId)
  clearMessages()

  try {
    if (config.configType === 'DIGITAL') {
      if (config.registrationStatus === 'JOINED' && config.registrationId) {
        await removeAdminDigitalRightRegistration(track.id, config.registrationId)
        successMessage.value = `Đã gỡ sản phẩm khỏi gói ${config.title}`
      } else {
        await createAdminDigitalRightRegistration(track.id, { configId: config.configId })
        successMessage.value = `Đã đăng ký sản phẩm vào gói ${config.title}`
      }
    } else if (config.registrationStatus === 'JOINED' && config.registrationId) {
      await removeAdminPhysicalRightRegistration(track.id, config.registrationId)
      successMessage.value = `Đã gỡ sản phẩm khỏi gói ${config.title}`
    } else {
      await createAdminPhysicalRightRegistration(track.id, { configId: config.configId })
      successMessage.value = `Đã đăng ký sản phẩm vào gói ${config.title}`
    }

    await refreshTrackAfterPackageAction(track.id)
  } catch (error) {
    setError(error)
  } finally {
    packageActionTarget.value = null
  }
}

const submitPackageRegistration = (
  track: Product,
  config: ProductLicensingEligibilityConfig,
) => {
  const isJoined = config.registrationStatus === 'JOINED'
  const actionLabel = isJoined ? 'Gỡ khỏi gói' : 'Đăng ký tham gia'
  confirm.require({
    header: `${actionLabel} — ${config.title}`,
    message: isJoined
      ? `Xác nhận gỡ "${track.title}" khỏi gói "${config.title}"?`
      : `Xác nhận đăng ký "${track.title}" vào gói "${config.title}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: actionLabel,
    rejectLabel: 'Huỷ',
    accept: () => void doSubmitPackageRegistration(track, config),
  })
}
const hasSelectedTrackEligibility = computed(() => {
  if (!selectedTrack.value) return false

  return (
    getEligibilityTotal(selectedTrack.value, 'digital') > 0 ||
    getEligibilityTotal(selectedTrack.value, 'physical') > 0
  )
})
const createDurationDisplay = computed(() => {
  const parsed = parseDuration(createForm.duration)
  return parsed === undefined ? null : formatDuration(Math.max(0, Math.round(parsed)))
})
const editDurationDisplay = computed(() => {
  const parsed = parseDuration(editForm.duration)
  return parsed === undefined ? null : formatDuration(Math.max(0, Math.round(parsed)))
})
type TrackAttributeItem = { label: string; value: string; mono?: boolean }
const selectedTrackAttributeItems = computed<TrackAttributeItem[]>(() => {
  if (!selectedTrack.value) return []

  const track = selectedTrack.value

  return [
    {
      label: 'Thời lượng',
      value: formatDuration(track.duration),
    },
    {
      label: 'Use-case',
      value: formatTrackUseCasesDisplay(track),
    },
    {
      label: 'Mã sản phẩm',
      value: track.id,
      mono: true,
    },
  ]
})

const formatProductStatusLabel = (value: ProductStatus) => {
  if (value === 'PUBLISHED') return 'Đang phát hành'
  if (value === 'PENDING') return 'Chờ kiểm duyệt'
  return 'Đang ẩn'
}
const getProductStatusClass = (value: ProductStatus) => {
  if (value === 'PUBLISHED') {
    return 'border-[color:rgb(var(--admin-success-rgb)/0.24)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
  }
  if (value === 'PENDING') {
    return 'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)]'
  }
  return 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)]'
}
const formatComplianceLegalStatusLabel = (value: Product['complianceLegalStatus']) => {
  if (value === 'SUFFICIENT') return 'Đã duyệt'
  if (value === 'INSUFFICIENT') return 'Thiếu hồ sơ'
  return 'Chờ pháp lý'
}
const formatUploadStatusLabel = (value: 'idle' | 'requesting' | 'uploading' | 'done' | 'error') => {
  if (value === 'requesting') return 'Đang xin URL'
  if (value === 'uploading') return 'Đang tải lên'
  if (value === 'done') return 'Hoàn tất'
  if (value === 'error') return 'Thất bại'
  return 'Chưa bắt đầu'
}

const formatDuration = (duration: number | null) => {
  if (typeof duration !== 'number' || Number.isNaN(duration)) return 'Chưa có'
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const parseDuration = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : undefined
}

const formatArtistOptionLabel = (artist: ManagedUser) => `${artist.fullName} · ${artist.email}`
const ARTIST_OPTIONS_PAGE_SIZE = 100

const resolveArtistDisplay = (artistId: string) =>
  artistOptions.value.find((option) => option.value === artistId)?.label ?? artistId

const fetchArtistOptions = async () => {
  isArtistsLoading.value = true

  try {
    let currentPage = 1
    let hasNextPage = true
    const artists: ManagedUser[] = []

    while (hasNextPage) {
      const response = await listManagedUsers({
        page: currentPage,
        pageSize: ARTIST_OPTIONS_PAGE_SIZE,
        roleName: 'Artist',
        status: 'ACTIVE',
      })

      artists.push(...response.data.items)
      hasNextPage = response.meta.pagination.hasNextPage
      currentPage += 1
    }

    artistOptions.value = [...artists]
      .sort((left, right) => left.fullName.localeCompare(right.fullName, undefined, { sensitivity: 'base' }))
      .map((artist) => ({
        value: artist.id,
        label: formatArtistOptionLabel(artist),
        email: artist.email,
      }))
    hasLoadedArtists.value = true
  } catch (error) {
    setError(error)
  } finally {
    isArtistsLoading.value = false
  }
}

const exportCurrentTracksCsv = () => {
  const headers = [
    'title',
    'id',
    'genres',
    'duration',
    'status',
    'originalAudioKey',
    'createdAt',
    'updatedAt',
  ]

  const escapeCsv = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return `"${text.replaceAll('"', '""')}"`
  }

  const lines = [
    headers.join(','),
    ...rows.value.map((track) =>
      [
        track.title,
        track.id,
        formatTrackGenresDisplay(track),
        track.duration ?? '',
        track.status,
        track.originalAudioKey ?? '',
        track.createdAt,
        track.updatedAt,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `products_page_${pagination.page}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const resetProductFilters = async () => {
  filters.keyword = ''
  filters.sort = defaultSort
  filters.status = ''
  filters.genre = ''
  pagination.page = 1
  await refreshTrackDashboard()
}

const extractValidationDetailsMessage = (details: unknown) => {
  if (typeof details !== 'object' || details === null || !('message' in details)) return null

  const detailMessage = (details as { message?: unknown }).message
  if (typeof detailMessage === 'string') return detailMessage
  if (Array.isArray(detailMessage)) {
    const messages = detailMessage.filter((item): item is string => typeof item === 'string')
    return messages.length > 0 ? messages.join(', ') : null
  }

  return null
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError) {
    if (error.message === 'PRODUCT_THUMBNAIL_REQUIRED') {
      return 'Cần upload thumbnail trước khi phát hành track'
    }
    if (error.message === 'PRODUCT_ALLOWED_PERMISSIONS_REQUIRED') {
      return 'Cần chọn ít nhất 1 quyền bán ở sản phẩm sau khi Pháp lý duyệt'
    }
    if (error.message === 'PRODUCT_ALLOWED_PERMISSIONS_LOCKED_UNTIL_COMPLIANCE_APPROVED') {
      return 'Chỉ được chọn quyền bán sau khi hồ sơ Pháp lý được duyệt thành công'
    }
    if (error.message === 'PERMISSION_NOT_APPROVED_FOR_PRODUCT') {
      return 'Có quyền bán không nằm trong danh sách Approved permissions của hồ sơ Pháp lý'
    }
    const validationMessage = extractValidationDetailsMessage(error.details)
    if (validationMessage) return validationMessage
    return `${error.code}: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Đã xảy ra lỗi không xác định'
}

const setError = (error: unknown) => {
  errorMessage.value = resolveErrorMessage(error)
}

const setCreateDialogError = (error: unknown) => {
  createDialogErrorMessage.value = resolveErrorMessage(error)
}

const setEditDialogError = (error: unknown) => {
  editDialogErrorMessage.value = resolveErrorMessage(error)
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const clearCreateDialogError = () => {
  createDialogErrorMessage.value = null
}

const clearEditDialogError = () => {
  editDialogErrorMessage.value = null
}

const isAnyDialogVisible = computed(
  () =>
    createDialogVisible.value ||
    editDialogVisible.value ||
    detailDialogVisible.value ||
    uploadDialogVisible.value ||
    approvedPermissionsDialogVisible.value,
)

const revokeObjectUrl = (url: string | null) => {
  if (url) URL.revokeObjectURL(url)
}

const getTrackGenreValues = (track: Product) =>
  track.genres && track.genres.length > 0 ? track.genres : track.genre ? [track.genre] : []

const getTrackUseCaseValues = (track: Product) =>
  track.useCases && track.useCases.length > 0 ? track.useCases : track.useCase ? [track.useCase] : []

const formatTrackGenresDisplay = (track: Product) => {
  const values = getTrackGenreValues(track)
  return values.length > 0 ? values.map(resolveProductGenreLabel).join(', ') : 'Chưa có thể loại'
}

const formatTrackUseCasesDisplay = (track: Product) => {
  const values = getTrackUseCaseValues(track)
  return values.length > 0 ? values.map(resolveProductUseCaseLabel).join(', ') : 'Chưa có'
}

const setCreateAudioUrl = (file: File | null) => {
  revokeObjectUrl(createOriginalAudioUrl.value)
  createOriginalAudioUrl.value = file ? URL.createObjectURL(file) : null
}

const ensureOriginalAudioUrl = async (track: Product) => {
  if (!track.originalAudioKey) return null
  if (originalAudioUrls.value[track.id]) return originalAudioUrls.value[track.id]
  if (originalAudioLoading.value[track.id]) return null

  originalAudioLoading.value = { ...originalAudioLoading.value, [track.id]: true }
  try {
    const { data } = await getOriginalPlaybackUrl(track.id)
    originalAudioUrls.value = {
      ...originalAudioUrls.value,
      [track.id]: data.playbackUrl,
    }
    return data.playbackUrl
  } catch (error) {
    setError(error)
    return null
  } finally {
    originalAudioLoading.value = { ...originalAudioLoading.value, [track.id]: false }
  }
}

const ensureThumbnailUrl = async (track: Product) => {
  if (!track.thumbnailKey) return null
  if (thumbnailUrls.value[track.id]) return thumbnailUrls.value[track.id]
  if (thumbnailLoading.value[track.id]) return null

  thumbnailLoading.value = { ...thumbnailLoading.value, [track.id]: true }
  try {
    const { data } = await getProductThumbnailUrl(track.id)
    thumbnailUrls.value = {
      ...thumbnailUrls.value,
      [track.id]: data.thumbnailUrl,
    }
    return data.thumbnailUrl
  } catch (error) {
    setError(error)
    return null
  } finally {
    thumbnailLoading.value = { ...thumbnailLoading.value, [track.id]: false }
  }
}

const openSheetMusicPdf = async (track: Product) => {
  clearMessages()
  try {
    const { data } = await getSheetMusicUrl(track.id)
    window.open(data.sheetMusicUrl, '_blank', 'noopener,noreferrer')
  } catch (error) {
    setError(error)
  }
}

const preloadTrackAssets = (track: Product) => {
  void ensureOriginalAudioUrl(track)
  void ensureThumbnailUrl(track)
}

const preloadPageAssets = async (tracks: Product[]) => {
  await Promise.allSettled([
    ...tracks.map((track) => ensureOriginalAudioUrl(track)),
    ...tracks.map((track) => ensureThumbnailUrl(track)),
  ])
}

const resolvePermissionCount = (track: Product) =>
  track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0

const resolveUpdatedAtLabel = (track: Product) => formatDateTime(track.updatedAt)

const resolveArtistLabel = (track: Product) => resolveArtistDisplay(track.artistId)

const resolveDurationLabel = (track: Product) => formatDuration(track.duration)

const resolvePublishStatusLabel = (track: Product) => formatProductStatusLabel(track.status)

const resolveComplianceLegalStatusLabel = (track: Product) =>
  formatComplianceLegalStatusLabel(track.complianceLegalStatus)

const resolvePublishStatusClass = (track: Product) => getProductStatusClass(track.status)

const resolveComplianceLegalStatusClass = (track: Product) =>
  getProductComplianceLegalStatusClassSafe(track.complianceLegalStatus)

const openMobileActionMenu = (track: Product) => {
  mobileActionTrack.value = track
}

const closeMobileActionMenu = () => {
  mobileActionTrack.value = null
}

const openApprovedPermissionsDialog = (track: Product) => {
  closeMobileActionMenu()
  approvedPermissionsTrack.value = track
  approvedPermissionsDialogVisible.value = true
  approvedPermissionsDetail.value = null
  selectedAllowedPermissionIds.value = [...track.allowedPermissionIds]
  approvedPermissionsLoading.value = true
  void getAdminComplianceDetail(track.id)
    .then(({ data }) => {
      approvedPermissionsDetail.value = data
      const approvedPermissionIdSet = new Set(data.approvedPermissionIds.filter((item) => item.length > 0))
      selectedAllowedPermissionIds.value = track.allowedPermissionIds.filter((item) => approvedPermissionIdSet.has(item))
    })
    .catch((error) => {
      setError(error)
    })
    .finally(() => {
      approvedPermissionsLoading.value = false
    })
}

const canChooseAllowedPermissions = computed(
  () =>
    approvedPermissionsDetail.value?.legalStatus === 'SUFFICIENT' &&
    approvedPermissionsDetail.value?.reviewStatus === 'APPROVED',
)

const approvedPermissionOptions = computed<ApprovedPermissionOption[]>(() => {
  if (!approvedPermissionsDetail.value) return []

  return approvedPermissionsDetail.value.approvedPermissions.flatMap((permission, index) => {
    const permissionId = approvedPermissionsDetail.value?.approvedPermissionIds[index] ?? ''
    if (permissionId.length === 0) return []

    return [{
      id: permissionId,
      name: permission.name,
      lawReference: permission.lawReference,
    }]
  })
})

const selectedApprovedPermissionCount = computed(
  () => approvedPermissionOptions.value.filter((permission) => selectedAllowedPermissionIds.value.includes(permission.id)).length,
)

const canSaveAllowedPermissions = computed(
  () =>
    !approvedPermissionsLoading.value &&
    !approvedPermissionsSaving.value &&
    canChooseAllowedPermissions.value &&
    approvedPermissionOptions.value.length > 0,
)

const formatApprovedPermissionSelectionState = (isSelected: boolean) => (isSelected ? 'Đã chọn' : 'Chưa chọn')

const formatProductComplianceReviewStatusLabel = (value: ComplianceDetail['reviewStatus']) => {
  if (value === 'APPROVED') return 'Đã duyệt'
  if (value === 'REJECTED') return 'Từ chối'
  return 'Chờ kiểm duyệt'
}

const getProductComplianceLegalStatusClass = (value: ComplianceDetail['legalStatus']) => {
  if (value === 'SUFFICIENT') {
    return 'border-[color:rgb(var(--admin-success-rgb)/0.24)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
  }
  if (value === 'INSUFFICIENT') {
    return 'border-[color:rgb(var(--admin-warning-rgb)/0.22)] bg-[color:var(--admin-warning-50)] text-[color:var(--admin-warning-700)]'
  }
  return 'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)]'
}

const getProductComplianceReviewStatusClass = (value: ComplianceDetail['reviewStatus']) => {
  if (value === 'APPROVED') {
    return 'border-[color:rgb(var(--admin-success-rgb)/0.24)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
  }
  if (value === 'REJECTED') {
    return 'border-[color:rgb(var(--admin-danger-rgb)/0.22)] bg-[color:var(--admin-danger-50)] text-[color:var(--admin-danger-700)]'
  }
  return 'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)]'
}

const getProductComplianceLegalStatusClassSafe = (value: Product['complianceLegalStatus']) =>
  getProductComplianceLegalStatusClass((value ?? 'PENDING') as ComplianceDetail['legalStatus'])

const getProductComplianceReviewStatusClassSafe = (value: Product['complianceReviewStatus']) =>
  getProductComplianceReviewStatusClass((value ?? 'PENDING') as ComplianceDetail['reviewStatus'])

const formatProductComplianceReviewStatusLabelSafe = (value: Product['complianceReviewStatus']) =>
  formatProductComplianceReviewStatusLabel((value ?? 'PENDING') as ComplianceDetail['reviewStatus'])

const toggleAllowedPermissionSelection = (permissionId: string) => {
  if (permissionId.length === 0 || approvedPermissionsSaving.value || !canChooseAllowedPermissions.value) return

  selectedAllowedPermissionIds.value = selectedAllowedPermissionIds.value.includes(permissionId)
    ? selectedAllowedPermissionIds.value.filter((item) => item !== permissionId)
    : [...selectedAllowedPermissionIds.value, permissionId]
}

const confirmSaveAllowedPermissions = () => {
  if (!approvedPermissionsTrack.value || !canSaveAllowedPermissions.value) return
  confirm.require({
    header: 'Xác nhận cập nhật quyền bán',
    message: `Lưu ${selectedAllowedPermissionIds.value.length} quyền bán đã chọn cho "${approvedPermissionsTrack.value.title}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Lưu quyền bán',
    rejectLabel: 'Huỷ',
    accept: () => void submitAllowedPermissions(),
  })
}

const submitAllowedPermissions = async () => {
  if (!approvedPermissionsTrack.value) return

  clearMessages()
  approvedPermissionsSaving.value = true
  try {
    const { data } = await replaceAdminProductAllowedPermissions(approvedPermissionsTrack.value.id, {
      permissionIds: selectedAllowedPermissionIds.value,
    })
    rows.value = rows.value.map((item) => (item.id === data.id ? data : item))
    if (selectedTrack.value?.id === data.id) selectedTrack.value = data
    approvedPermissionsTrack.value = data
    selectedAllowedPermissionIds.value = [...data.allowedPermissionIds]
    successMessage.value = 'Đã cập nhật quyền bán của sản phẩm'
    await refreshTrackDashboard()
  } catch (error) {
    setError(error)
  } finally {
    approvedPermissionsSaving.value = false
  }
}

const resetCreateForm = () => {
  createForm.title = ''
  createForm.artistId = ''
  createForm.genres = []
  createForm.useCases = []
  createForm.description = ''
  createForm.duration = ''
  revokeObjectUrl(createOriginalAudioUrl.value)
  revokeObjectUrl(createThumbnailUrl.value)
  createOriginalAudioUrl.value = null
  createOriginalFile.value = null
  createSheetMusicFile.value = null
  createThumbnailFile.value = null
  createThumbnailUrl.value = null
}

const isAllowedGenreValue = (value: string): value is ProductGenre =>
  PRODUCT_GENRE_OPTIONS.some((option) => option.value === value)

const isAllowedUseCaseValue = (value: string): value is ProductUseCase =>
  PRODUCT_USE_CASE_OPTIONS.some((option) => option.value === value)

const normalizeGenreValues = (values: Array<string | null | undefined>): ProductGenre[] =>
  values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).filter(isAllowedGenreValue)

const normalizeUseCaseValues = (values: Array<string | null | undefined>): ProductUseCase[] =>
  values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).filter(isAllowedUseCaseValue)

const resetEditForm = (track: Product) => {
  editForm.title = track.title
  editForm.artistId = track.artistId
  editForm.genres = normalizeGenreValues(track.genres && track.genres.length > 0 ? track.genres : track.genre ? [track.genre] : [])
  editForm.useCases = normalizeUseCaseValues(track.useCases && track.useCases.length > 0 ? track.useCases : track.useCase ? [track.useCase] : [])
  editForm.description = track.description ?? ''
  editForm.duration = track.duration === null ? '' : String(track.duration)
  editOriginalFile.value = null
  editSheetMusicFile.value = null
  revokeObjectUrl(editThumbnailUrl.value)
  editThumbnailFile.value = null
  editThumbnailUrl.value = null
}

const extractEventFile = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  return target?.files?.[0] ?? null
}

const ensureAudioFile = (file: File, label: string) => {
  const isAudioMime = file.type.startsWith('audio/')
  const isMp3Name = file.name.toLowerCase().endsWith('.mp3')

  if (isAudioMime || isMp3Name) return
  throw new Error(`${label} phải là file audio/mp3 hợp lệ`)
}

const ensurePdfFile = (file: File, label: string) => {
  const isPdfMime = file.type === 'application/pdf'
  const isPdfName = file.name.toLowerCase().endsWith('.pdf')
  if (isPdfMime || isPdfName) return
  throw new Error(`${label} phải là file PDF hợp lệ`)
}

const getFileExtension = (file: File): string | null => {
  const parts = file.name.split('.')
  if (parts.length < 2) return null
  const ext = parts.at(-1)?.trim().toLowerCase()
  return ext && ext.length > 0 ? ext : null
}

const ensureThumbnailFile = (file: File, label: string): ProductThumbnailExtension => {
  const extension = getFileExtension(file)
  const allowed: ProductThumbnailExtension[] = ['png', 'jpg', 'jpeg', 'webp']
  const isAllowed = !!extension && allowed.includes(extension as ProductThumbnailExtension)
  const isImageMime = file.type.startsWith('image/')

  if (isAllowed || isImageMime) {
    const normalized = (extension ?? (file.type.split('/')[1] ?? '')).toLowerCase()
    if (allowed.includes(normalized as ProductThumbnailExtension)) {
      return normalized as ProductThumbnailExtension
    }
    if (allowed.includes('jpg') && normalized === 'jpeg') return 'jpeg'
  }

  throw new Error(`${label} phải là file ảnh hợp lệ (png/jpg/jpeg/webp)`)
}

const readAudioDurationFromFile = async (file: File): Promise<number> => {
  const objectUrl = URL.createObjectURL(file)

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => resolve(audio.duration)
      audio.onerror = () => reject(new Error('Không thể đọc duration từ file audio đã chọn'))
      audio.src = objectUrl
    })

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Duration từ file audio không hợp lệ')
    }

    return Math.max(1, Math.round(duration))
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const validateTrackForm = (
  form: ProductForm,
  options: {
    requireOriginalFile: boolean
    originalFile: File | null
    requireThumbnailFile: boolean
    thumbnailFile: File | null
    existingThumbnailKey?: string | null
  },
) => {
  if (form.title.trim().length === 0) return 'Tên track là bắt buộc'
  if (form.artistId.trim().length === 0) return 'Vui lòng chọn nghệ sĩ'
  if (options.requireThumbnailFile && !options.thumbnailFile) return 'Cần chọn thumbnail cho track'
  if (
    !options.requireThumbnailFile &&
    !options.thumbnailFile &&
    (!options.existingThumbnailKey || options.existingThumbnailKey.trim().length === 0)
  ) {
    return 'Cần có thumbnail trước khi lưu track'
  }
  if (options.requireOriginalFile && !options.originalFile) return 'Cần chọn file MP3 gốc khi tạo track'
  if (options.requireOriginalFile && form.duration.trim().length === 0) {
    return 'Không đọc được thời lượng từ file audio gốc'
  }
  return null
}

const setCreateThumbnailPreviewUrl = (file: File | null) => {
  revokeObjectUrl(createThumbnailUrl.value)
  createThumbnailUrl.value = file ? URL.createObjectURL(file) : null
}

const setEditThumbnailPreviewUrl = (file: File | null) => {
  revokeObjectUrl(editThumbnailUrl.value)
  editThumbnailUrl.value = file ? URL.createObjectURL(file) : null
}

const handleCreateThumbnailFileChange = (event: Event) => {
  clearCreateDialogError()
  const file = extractEventFile(event)
  createThumbnailFile.value = file
  setCreateThumbnailPreviewUrl(file)

  if (!file) return

  try {
    ensureThumbnailFile(file, 'Thumbnail')
  } catch (error) {
    createThumbnailFile.value = null
    setCreateThumbnailPreviewUrl(null)
    setCreateDialogError(error)
  }
}

const handleEditThumbnailFileChange = (event: Event) => {
  clearEditDialogError()
  const file = extractEventFile(event)
  editThumbnailFile.value = file
  setEditThumbnailPreviewUrl(file)

  if (!file) return

  try {
    ensureThumbnailFile(file, 'Thumbnail')
  } catch (error) {
    editThumbnailFile.value = null
    setEditThumbnailPreviewUrl(null)
    setEditDialogError(error)
  }
}

const handleCreateAudioFileChange = async (event: Event) => {
  clearCreateDialogError()
  const file = extractEventFile(event)
  createOriginalFile.value = file
  setCreateAudioUrl(file)
  if (!file) {
    createForm.duration = ''
    return
  }

  try {
    ensureAudioFile(file, 'Audio gốc')
    createForm.duration = String(await readAudioDurationFromFile(file))
  } catch (error) {
    createOriginalFile.value = null
    createForm.duration = ''
    setCreateAudioUrl(null)
    setCreateDialogError(error)
  }
}

const handleEditAudioFileChange = async (event: Event) => {
  clearEditDialogError()
  const file = extractEventFile(event)
  editOriginalFile.value = file
  if (!file) {
    editForm.duration = selectedTrack.value?.duration === null || !selectedTrack.value ? '' : String(selectedTrack.value.duration)
    return
  }

  try {
    ensureAudioFile(file, 'Audio gốc')
    editForm.duration = String(await readAudioDurationFromFile(file))
  } catch (error) {
    editOriginalFile.value = null
    editForm.duration = selectedTrack.value?.duration === null || !selectedTrack.value ? '' : String(selectedTrack.value.duration)
    setEditDialogError(error)
  }
}

const handleCreateSheetMusicFileChange = (event: Event) => {
  clearCreateDialogError()
  const file = extractEventFile(event)
  createSheetMusicFile.value = file
  if (!file) return
  try {
    ensurePdfFile(file, 'Khuông nhạc')
  } catch (error) {
    createSheetMusicFile.value = null
    setCreateDialogError(error)
  }
}

const handleEditSheetMusicFileChange = (event: Event) => {
  clearEditDialogError()
  const file = extractEventFile(event)
  editSheetMusicFile.value = file
  if (!file) return
  try {
    ensurePdfFile(file, 'Khuông nhạc')
  } catch (error) {
    editSheetMusicFile.value = null
    setEditDialogError(error)
  }
}

const fetchTracks = async () => {
  clearMessages()
  isLoading.value = true

  try {
    const { data, meta } = await listAdminProducts({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      sort: filters.sort,
      status: filters.status || undefined,
      genre: filters.genre.trim().length > 0 ? filters.genre.trim() : undefined,
    })

    rows.value = data.items
    if (selectedTrack.value) {
      const refreshedSelected = data.items.find((item) => item.id === selectedTrack.value?.id)
      if (refreshedSelected) selectedTrack.value = refreshedSelected
    }
    totalItems.value = meta.pagination.totalItems
    void preloadPageAssets(data.items)
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const fetchSummaryCounts = async () => {
  try {
    const { data } = await getAdminProductsSummary({
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      genre: filters.genre.trim().length > 0 ? filters.genre.trim() : undefined,
    })

    summaryCounts.total = data.total
    summaryCounts.published = data.published
    summaryCounts.hidden = data.hidden
    summaryCounts.pending = data.pending
  } catch (error) {
    setError(error)
  }
}

const refreshTrackDashboard = async () => {
  await Promise.all([fetchTracks(), fetchSummaryCounts()])
}

const applyClientSort = () => {
  const [field, direction] = filters.sort.split(':') as [string, 'asc' | 'desc']
  const sign = direction === 'asc' ? 1 : -1

  const sorted = [...rows.value].sort((left, right) => {
    if (field === 'updatedAt' || field === 'createdAt') {
      const leftTime = new Date((left as any)[field] as string).getTime()
      const rightTime = new Date((right as any)[field] as string).getTime()
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0
      return (leftTime - rightTime) * sign
    }
    if (field === 'title') {
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' }) * sign
    }
    if (field === 'status') {
      return left.status.localeCompare(right.status) * sign
    }
    return 0
  })

  rows.value = sorted
}

const openCreateDialog = () => {
  clearMessages()
  closeMobileActionMenu()
  selectedTrack.value = null
  editDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = false
  clearCreateDialogError()
  resetCreateForm()
  if (!hasLoadedArtists.value && !isArtistsLoading.value) {
    void fetchArtistOptions()
  }
  createDialogVisible.value = true
}

const openEditDialog = (track: Product) => {
  clearMessages()
  closeMobileActionMenu()
  selectedTrack.value = track
  createDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = false
  clearEditDialogError()
  resetEditForm(track)
  if (!hasLoadedArtists.value && !isArtistsLoading.value) {
    void fetchArtistOptions()
  }
  editDialogVisible.value = true
  void ensureThumbnailUrl(track)
}

const openDetailDialog = (track: Product) => {
  clearMessages()
  closeMobileActionMenu()
  selectedTrack.value = track
  createDialogVisible.value = false
  editDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = true
  detailActiveTab.value = 'info'
  const nextOriginalUrls = { ...originalAudioUrls.value }
  delete nextOriginalUrls[track.id]
  originalAudioUrls.value = nextOriginalUrls
  void ensureOriginalAudioUrl(track)
  void ensureThumbnailUrl(track)
}

const openComplianceDashboard = (track: Product) => {
  closeMobileActionMenu()
  void router.push({ path: '/admin/compliance', query: { keyword: track.title } })
}

const uploadToSignedUrl = async (url: string, file: File) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  })

  if (response.ok) return

  const responseText = (await response.text().catch(() => '')).slice(0, 200)
  const detail = responseText.length > 0 ? `: ${responseText}` : ''
  throw new Error(`Tải file lên thất bại (${response.status} ${response.statusText})${detail}`)
}

const uploadTrackAudioFile = async (trackId: string, file: File) => {
  ensureAudioFile(file, 'Audio gốc')

  const { data } = await getOriginalUploadUrl(trackId)

  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminProductAudioUpload(trackId, { mode: 'original', fileKey: data.fileKey })
  rows.value = rows.value.map((item) => (item.id === trackId ? confirmed.data : item))
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  const nextOriginalUrls = { ...originalAudioUrls.value }
  delete nextOriginalUrls[trackId]
  originalAudioUrls.value = nextOriginalUrls

  return data
}

const uploadTrackThumbnailFile = async (trackId: string, file: File) => {
  const extension = ensureThumbnailFile(file, 'Thumbnail')
  const { data } = await getThumbnailUploadUrl(trackId, { extension })

  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminProductThumbnailUpload(trackId, { fileKey: data.fileKey })
  rows.value = rows.value.map((item) => (item.id === trackId ? confirmed.data : item))
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  const next = { ...thumbnailUrls.value }
  delete next[trackId]
  thumbnailUrls.value = next

  return data
}

const uploadTrackSheetMusicFile = async (trackId: string, file: File) => {
  ensurePdfFile(file, 'Khuông nhạc')
  const { data } = await getSheetMusicUploadUrl(trackId)

  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminProductSheetMusicUpload(trackId, { fileKey: data.fileKey })
  rows.value = rows.value.map((item) => (item.id === trackId ? confirmed.data : item))
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }

  return data
}

const submitCreate = async () => {
  clearCreateDialogError()
  successMessage.value = null
  const validationError = validateTrackForm(createForm, {
    requireOriginalFile: true,
    originalFile: createOriginalFile.value,
    requireThumbnailFile: true,
    thumbnailFile: createThumbnailFile.value,
  })

  if (validationError) {
    createDialogErrorMessage.value = validationError
    return
  }

  isLoading.value = true
  let createdProduct: Product | null = null

  try {
    const { data } = await createAdminProduct({
      title: createForm.title.trim(),
      artistId: createForm.artistId.trim(),
      genres: createForm.genres,
      useCases: createForm.useCases,
      description: createForm.description.trim().length > 0 ? createForm.description.trim() : undefined,
      duration: parseDuration(createForm.duration),
    })

    createdProduct = data
    const jobs: Array<() => Promise<unknown>> = [
      () => uploadTrackThumbnailFile(data.id, createThumbnailFile.value as File),
      () => uploadTrackAudioFile(data.id, createOriginalFile.value as File),
    ]
    if (createSheetMusicFile.value) {
      const sheetMusicFile = createSheetMusicFile.value
      jobs.push(() => uploadTrackSheetMusicFile(data.id, sheetMusicFile))
    }

    const results = await Promise.allSettled(jobs.map((job) => job()))
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (rejected) throw rejected.reason

    createDialogVisible.value = false
    resetCreateForm()
    successMessage.value = 'Đã tạo track'
    await refreshTrackDashboard()
  } catch (error) {
    if (createdProduct) {
      setCreateDialogError(
        new Error(
          `Track đã được tạo nhưng upload file thất bại. ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
      await refreshTrackDashboard()
      return
    }
    setCreateDialogError(error)
  } finally {
    isLoading.value = false
  }
}

const submitEdit = async () => {
  if (!selectedTrack.value) return

  clearEditDialogError()
  successMessage.value = null
  const validationError = validateTrackForm(editForm, {
    requireOriginalFile: false,
    originalFile: editOriginalFile.value,
    requireThumbnailFile: false,
    thumbnailFile: editThumbnailFile.value,
    existingThumbnailKey: selectedTrack.value.thumbnailKey,
  })

  if (validationError) {
    editDialogErrorMessage.value = validationError
    return
  }

  isLoading.value = true

  try {
    const trackId = selectedTrack.value.id
    const { data } = await updateAdminProduct(trackId, {
      title: editForm.title.trim(),
      genres: editForm.genres,
      useCases: editForm.useCases,
      description: editForm.description.trim().length > 0 ? editForm.description.trim() : undefined,
      duration: parseDuration(editForm.duration),
    })
    rows.value = rows.value.map((item) => (item.id === data.id ? data : item))
    if (selectedTrack.value?.id === data.id) selectedTrack.value = data
    applyClientSort()

    const uploadJobs: Array<{
      type: 'thumbnail' | 'audio' | 'sheetMusic'
      run: () => Promise<unknown>
    }> = []

    if (editThumbnailFile.value) {
      const file = editThumbnailFile.value
      uploadJobs.push({ type: 'thumbnail', run: () => uploadTrackThumbnailFile(trackId, file) })
    }

    if (editOriginalFile.value) {
      const file = editOriginalFile.value
      uploadJobs.push({ type: 'audio', run: () => uploadTrackAudioFile(trackId, file) })
    }

    if (editSheetMusicFile.value) {
      const file = editSheetMusicFile.value
      uploadJobs.push({ type: 'sheetMusic', run: () => uploadTrackSheetMusicFile(trackId, file) })
    }

    if (uploadJobs.length > 0) {
      const results = await Promise.allSettled(uploadJobs.map((job) => job.run()))
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const type = uploadJobs[index]?.type
        if (type === 'thumbnail') editThumbnailFile.value = null
        if (type === 'audio') editOriginalFile.value = null
        if (type === 'sheetMusic') editSheetMusicFile.value = null
      })
      const rejected = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      )
      if (rejected) throw rejected.reason
    }

    editDialogVisible.value = false
    successMessage.value = 'Đã cập nhật track'
  } catch (error) {
    setEditDialogError(error)
  } finally {
    isLoading.value = false
  }
}

const confirmSubmitEdit = () => {
  if (!selectedTrack.value) return
  confirm.require({
    header: 'Xác nhận lưu thay đổi',
    message: `Lưu các thay đổi cho track "${selectedTrack.value.title}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Lưu thay đổi',
    rejectLabel: 'Huỷ',
    accept: () => void submitEdit(),
  })
}

const togglePublishConfirmed = async (track: Product) => {
  clearMessages()
  isLoading.value = true
  try {
    const previousStatus = track.status
    if (track.status === 'PUBLISHED') {
      const { data } = await hideAdminProduct(track.id)
      rows.value = rows.value.map((item) => (item.id === track.id ? data : item))
      if (selectedTrack.value?.id === track.id) {
        selectedTrack.value = data
      }
      if (previousStatus !== data.status) {
        if (previousStatus === 'PUBLISHED') summaryCounts.published = Math.max(0, summaryCounts.published - 1)
        if (previousStatus === 'HIDDEN') summaryCounts.hidden = Math.max(0, summaryCounts.hidden - 1)
        if (previousStatus === 'PENDING') summaryCounts.pending = Math.max(0, summaryCounts.pending - 1)
        if (data.status === 'PUBLISHED') summaryCounts.published += 1
        if (data.status === 'HIDDEN') summaryCounts.hidden += 1
        if (data.status === 'PENDING') summaryCounts.pending += 1
      }
      applyClientSort()
      successMessage.value = 'Đã ẩn track'
    } else {
      const { data } = await publishAdminProduct(track.id)
      rows.value = rows.value.map((item) => (item.id === track.id ? data : item))
      if (selectedTrack.value?.id === track.id) {
        selectedTrack.value = data
      }
      if (previousStatus !== data.status) {
        if (previousStatus === 'PUBLISHED') summaryCounts.published = Math.max(0, summaryCounts.published - 1)
        if (previousStatus === 'HIDDEN') summaryCounts.hidden = Math.max(0, summaryCounts.hidden - 1)
        if (previousStatus === 'PENDING') summaryCounts.pending = Math.max(0, summaryCounts.pending - 1)
        if (data.status === 'PUBLISHED') summaryCounts.published += 1
        if (data.status === 'HIDDEN') summaryCounts.hidden += 1
        if (data.status === 'PENDING') summaryCounts.pending += 1
      }
      applyClientSort()
      successMessage.value = 'Đã phát hành track'
    }
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const confirmTogglePublish = (track: Product) => {
  const isPublished = track.status === 'PUBLISHED'
  if (!isPublished && !track.thumbnailKey) {
    openEditDialog(track)
    editDialogErrorMessage.value = 'Cần upload thumbnail trước khi phát hành track'
    return
  }
  confirm.require({
    header: isPublished ? 'Xác nhận ẩn track' : 'Xác nhận phát hành track',
    message: isPublished
      ? `Bạn chắc chắn muốn ẩn track "${track.title}"?`
      : `Bạn chắc chắn muốn phát hành track "${track.title}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: isPublished ? 'Ẩn track' : 'Phát hành',
    rejectLabel: 'Huỷ',
    accept: () => void togglePublishConfirmed(track),
  })
}

const openUploadDialog = (track: Product) => {
  clearMessages()
  closeMobileActionMenu()
  selectedTrack.value = track
  createDialogVisible.value = false
  editDialogVisible.value = false
  detailDialogVisible.value = false
  uploadFile.value = null
  uploadStatus.value = 'idle'
  uploadResult.value = null
  uploadError.value = null
  uploadDialogVisible.value = true
}

const onUploadFileChange = (event: Event) => {
  const file = extractEventFile(event)
  uploadFile.value = file
  uploadStatus.value = 'idle'
  uploadResult.value = null
  uploadError.value = null

  if (file) {
    try {
      ensureAudioFile(file, 'Audio gốc')
    } catch (error) {
      uploadFile.value = null
      uploadError.value = error instanceof Error ? error.message : 'Lỗi tải file'
    }
  }
}

const submitUpload = async () => {
  if (!selectedTrack.value || !uploadFile.value) return

  clearMessages()
  uploadStatus.value = 'requesting'
  uploadError.value = null

  try {
    uploadStatus.value = 'uploading'
    uploadResult.value = await uploadTrackAudioFile(selectedTrack.value.id, uploadFile.value)
    uploadStatus.value = 'done'
    await refreshTrackDashboard()
  } catch (error) {
    uploadStatus.value = 'error'
    uploadError.value = error instanceof Error ? error.message : 'Lỗi tải file'
  }
}

const applyDemoAudioKey = async () => {
  if (!selectedTrack.value) return

  clearMessages()
  uploadStatus.value = 'uploading'
  uploadError.value = null
  uploadResult.value = null

  try {
    const confirmed = await confirmAdminProductAudioUpload(selectedTrack.value.id, {
      mode: 'original',
      fileKey: '1.mp3',
    })
    rows.value = rows.value.map((item) =>
      item.id === selectedTrack.value?.id ? confirmed.data : item,
    )
    selectedTrack.value = confirmed.data
    const nextOriginalUrls = { ...originalAudioUrls.value }
    delete nextOriginalUrls[confirmed.data.id]
    originalAudioUrls.value = nextOriginalUrls
    uploadResult.value = { uploadUrl: '', fileKey: '1.mp3' }
    uploadStatus.value = 'done'
    await refreshTrackDashboard()
  } catch (error) {
    uploadStatus.value = 'error'
    uploadError.value = error instanceof Error ? error.message : 'Lỗi cập nhật audio'
  }
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchTracks()
}

const handlePageChange = (nextPage: number) => {
  void goToPage(nextPage)
}

const handlePageSizeChange = (nextPageSize: number) => {
  const clampedPageSize = Math.min(nextPageSize, maxPageSize)
  if (clampedPageSize === pagination.pageSize) return
  pagination.pageSize = clampedPageSize
  pagination.page = 1
  void fetchTracks()
}

onMounted(() => {
  void fetchArtistOptions()
  void refreshTrackDashboard()
})

useDebouncedWatch(
  () => filters.keyword,
  () => {
    pagination.page = 1
    void refreshTrackDashboard()
  },
  420,
)

useDebouncedWatch(
  () => [filters.sort, filters.status, filters.genre] as const,
  () => {
    pagination.page = 1
    void refreshTrackDashboard()
  },
  420,
)

onBeforeUnmount(() => {
  revokeObjectUrl(createOriginalAudioUrl.value)
  revokeObjectUrl(createThumbnailUrl.value)
  revokeObjectUrl(editThumbnailUrl.value)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <AdminPageHeader title="Quản lý sản phẩm" description="Theo dõi, kiểm duyệt và cập nhật thông tin sản phẩm trên nền tảng." icon-class="pi pi-wave-pulse">
      <template #actions>
        <AdminButton variant="primary" class="w-full sm:w-auto" :loading="isLoading" @click="openCreateDialog">
          <i class="pi pi-plus" />
          Thêm sản phẩm
        </AdminButton>
      </template>
    </AdminPageHeader>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        v-for="card in summaryCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :icon="card.icon"
        :tone="card.tone"
      />
    </section>

    <AdminPanel title="Danh sách sản phẩm">
      <div class="grid gap-3">
        <div class="w-full">
          <AdminFilterInput v-model="filters.keyword" icon-class="pi pi-search" placeholder="Tìm theo tên, tác giả hoặc thể loại" :disabled="isLoading" />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminFilterInput v-model="filters.genre" icon-class="pi pi-sliders-h" placeholder="Thể loại" :disabled="isLoading" />
          <AdminFilterSelect v-model="filters.status" icon-class="pi pi-tag" :options="statusOptions" :disabled="isLoading" />
          <AdminFilterSelect v-model="filters.sort" icon-class="pi pi-sort-alt" :options="sortOptions" :disabled="isLoading" />
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div class="inline-flex w-fit items-center rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1.5 text-sm font-medium text-[color:var(--admin-text-muted)]">
            {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} sản phẩm
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <AdminButton class="w-full sm:w-auto" :loading="isLoading" @click="refreshTrackDashboard">
              <i class="pi pi-filter" />
              Lọc
            </AdminButton>
            <AdminButton class="w-full sm:w-auto" :disabled="isLoading" @click="resetProductFilters">
              <i class="pi pi-refresh" />
              Đặt lại
            </AdminButton>
            <AdminButton class="w-full sm:w-auto" :disabled="rows.length === 0" @click="exportCurrentTracksCsv">
              <i class="pi pi-download" />
              Xuất dữ liệu
            </AdminButton>
          </div>
        </div>

        <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="chip in activeFilterChips"
            :key="chip"
            class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]"
          >
            {{ chip }}
          </span>
        </div>
      </div>

      <div v-if="!isAnyDialogVisible" class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <ProductManagementMobileCardList
        class="mt-4"
        :rows="rows"
        :is-loading="isLoading"
        empty-message="Không có sản phẩm phù hợp. Thử đổi keyword, status hoặc genre để mở rộng kết quả tìm kiếm."
        :resolve-thumbnail-url="(track) => thumbnailUrls[track.id] ?? null"
        :resolve-permission-count="resolvePermissionCount"
        :resolve-artist-label="resolveArtistLabel"
        :resolve-genres-label="formatTrackGenresDisplay"
        :resolve-duration-label="resolveDurationLabel"
        :resolve-updated-at-label="resolveUpdatedAtLabel"
        :resolve-publish-status-label="resolvePublishStatusLabel"
        :resolve-legal-status-label="resolveComplianceLegalStatusLabel"
        :resolve-publish-status-class="resolvePublishStatusClass"
        :resolve-legal-status-class="resolveComplianceLegalStatusClass"
        @detail="openDetailDialog"
        @toggle-publish="confirmTogglePublish"
        @more="openMobileActionMenu"
      />

      <div class="mt-4 hidden overflow-hidden rounded-[28px] border bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)] sm:block [border-color:var(--admin-border-strong)]">
        <div class="overflow-x-auto">
          <table class="min-w-[1180px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-[linear-gradient(180deg,var(--admin-surface-3),var(--admin-surface-2))] text-xs uppercase tracking-[0.18em] text-[color:var(--admin-text)]">
              <tr>
                <th class="w-20 px-3 py-3 font-semibold">Ảnh</th>
                <th class="w-[20%] px-3 py-3 font-semibold">Sản phẩm</th>
                <th class="w-32 px-3 py-3 font-semibold">Quyền bán</th>
                <th class="w-40 px-3 py-3 font-semibold">Pháp lý</th>
                <th class="w-[46%] px-3 py-3 font-semibold">Waveform</th>
                <th class="w-36 px-3 py-3 font-semibold">Trạng thái</th>
                <th class="w-28 px-3 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y [divide-color:var(--admin-border)]">
              <tr
                v-for="(track, index) in rows"
                :key="track.id"
                class="transition"
                :class="index % 2 === 0
                  ? 'bg-[color:var(--admin-surface-0)] hover:bg-[color:var(--admin-surface-2)]'
                  : 'bg-[color:var(--admin-surface-1)] hover:bg-[color:var(--admin-surface-3)]'"
                @mouseenter="preloadTrackAssets(track)"
              >
                <td class="px-3 py-3">
                  <div class="h-10 w-10 overflow-hidden rounded-xl border bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]">
                    <img
                      v-if="thumbnailUrls[track.id]"
                      :src="thumbnailUrls[track.id]"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center bg-[color:var(--admin-primary-50)] text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ track.title.slice(0, 1).toUpperCase() }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-[color:var(--admin-text)]">
                      {{ track.title }}
                    </div>
                    <div class="mt-1 line-clamp-1 text-xs text-[color:var(--admin-text-muted)]">
                      {{ resolveArtistDisplay(track.artistId) }} · {{ formatTrackGenresDisplay(track) }} · {{ formatDuration(track.duration) }} ·
                      {{ formatDateTime(track.updatedAt) }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div class="space-y-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-xl border bg-[color:var(--admin-surface-0)] px-3 py-1.5 text-xs font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:opacity-60"
                      :disabled="isLoading"
                      @click="openApprovedPermissionsDialog(track)"
                    >
                      <i class="pi pi-book text-xs" />
                      {{ track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0 }} quyền
                    </button>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[color:var(--admin-surface-2)] disabled:opacity-60"
                    :class="getProductComplianceLegalStatusClassSafe(track.complianceLegalStatus)"
                    :disabled="isLoading"
                    @click="openComplianceDashboard(track)"
                  >
                    <i class="pi pi-verified text-xs" />
                    {{ formatComplianceLegalStatusLabel(track.complianceLegalStatus) }}
                  </button>
                </td>
                <td class="px-3 py-3">
                  <div class="min-w-0">
                    <div v-if="track.originalAudioKey" class="min-w-0">
                      <div v-if="originalAudioUrls[track.id]" class="min-w-0">
                        <ProductWavePreview
                          :audio-url="originalAudioUrls[track.id] ?? null"
                          :disabled="!track.originalAudioKey"
                          :right-label="formatDuration(track.duration)"
                          :track-status="track.status"
                        />
                      </div>
                      <button
                        v-else
                        type="button"
                        class="inline-flex items-center rounded-xl border bg-[color:var(--admin-surface-0)] px-3 py-2 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:opacity-60"
                        :disabled="originalAudioLoading[track.id] || isLoading"
                        @click="() => void ensureOriginalAudioUrl(track)"
                      >
                        <i :class="originalAudioLoading[track.id] ? 'pi pi-spin pi-spinner mr-2' : 'pi pi-wave-pulse mr-2'" />
                        {{ originalAudioLoading[track.id] ? 'Đang tải...' : 'Hiển thị waveform' }}
                      </button>
                    </div>

                    <div v-else class="text-sm text-[color:var(--admin-text-muted)]">
                      Chưa có audio gốc
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                    :class="getProductStatusClass(track.status)"
                    :disabled="isLoading"
                    @click="confirmTogglePublish(track)"
                  >
                    <span
                      class="h-2.5 w-2.5 rounded-full"
                      :class="
                        track.status === 'PUBLISHED'
                          ? 'bg-[color:var(--admin-accent-500)]'
                          : track.status === 'PENDING'
                            ? 'bg-[color:var(--admin-primary-500)]'
                            : 'bg-[color:var(--admin-neutral-200)]'
                      "
                    />
                    {{
                      track.status === 'PUBLISHED'
                        ? 'Đang phát hành'
                        : track.status === 'PENDING'
                          ? 'Chờ kiểm duyệt'
                          : 'Đang ẩn'
                    }}
                  </button>
                </td>
                <td class="px-3 py-3">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:opacity-60" :disabled="isLoading" @click="openDetailDialog(track)">
                      <i class="pi pi-eye" />
                    </button>
                    <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:opacity-60" :disabled="isLoading" @click="openEditDialog(track)">
                      <i class="pi pi-pencil" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-sm text-[color:var(--admin-text-muted)]">
                  Không có sản phẩm phù hợp. Thử đổi keyword, status hoặc genre để mở rộng kết quả tìm kiếm.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <AdminPaginationBar class="mt-4" :page="pagination.page" :page-size="pagination.pageSize" :page-size-options="[10]" :total-items="totalItems" :disabled="isLoading" @update:page="handlePageChange" @update:page-size="handlePageSizeChange" />
    </AdminPanel>

    <AdminProductUpsertDialog
      v-model:visible="createDialogVisible"
      mode="create"
      :is-loading="isLoading"
      :is-artists-loading="isArtistsLoading"
      :artist-options="artistOptions"
      :error-message="createDialogErrorMessage"
      :form="createForm"
      :field-class="fieldClass"
      :select-field-class="selectFieldClass"
      :file-input-class="fileInputClass"
      :duration-display="createDurationDisplay"
      :audio-url="createOriginalAudioUrl"
      :thumbnail-url="createThumbnailUrl"
      :audio-file="createOriginalFile"
      :thumbnail-file="createThumbnailFile"
      :sheet-music-file="createSheetMusicFile"
      @thumbnail-change="handleCreateThumbnailFileChange"
      @audio-change="handleCreateAudioFileChange"
      @sheet-music-change="handleCreateSheetMusicFileChange"
      @submit="submitCreate"
    >
      <template #wavePreview="{ audioUrl }">
        <ProductWavePreview :audio-url="audioUrl" :disabled="!audioUrl" track-status="PENDING" />
      </template>
    </AdminProductUpsertDialog>

    <AdminProductUpsertDialog
      v-model:visible="editDialogVisible"
      mode="edit"
      :is-loading="isLoading"
      :is-artists-loading="isArtistsLoading"
      :artist-options="artistOptions"
      :error-message="editDialogErrorMessage"
      :form="editForm"
      :field-class="fieldClass"
      :select-field-class="selectFieldClass"
      :file-input-class="fileInputClass"
      :duration-display="editDurationDisplay"
      :audio-url="selectedTrack ? (originalAudioUrls[selectedTrack.id] ?? null) : null"
      :thumbnail-url="editThumbnailUrl || (selectedTrack ? (thumbnailUrls[selectedTrack.id] ?? null) : null)"
      :audio-file="editOriginalFile"
      :thumbnail-file="editThumbnailFile"
      :sheet-music-file="editSheetMusicFile"
      :can-open-sheet-music-pdf="Boolean(selectedTrack?.sheetMusicPdfKey)"
      @thumbnail-change="handleEditThumbnailFileChange"
      @audio-change="handleEditAudioFileChange"
      @sheet-music-change="handleEditSheetMusicFileChange"
      @open-sheet-music-pdf="selectedTrack && openSheetMusicPdf(selectedTrack)"
      @submit="confirmSubmitEdit"
    />

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      :closable="false"
      :class="detailDialogClass"
      :pt="{
        header: { class: 'px-0 pb-0 pt-0' },
        content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto px-0 pb-6 sm:max-h-[calc(100svh-4rem)]' },
        footer: { class: 'hidden' },
      }"
    >
      <template #header>
        <div
          v-if="selectedTrack"
          class="sticky top-0 z-10 w-full border-b bg-[color:var(--admin-surface-0)] px-4 py-3 backdrop-blur sm:px-5 [border-color:var(--admin-border)]"
        >
          <div class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div class="min-w-0 max-w-[320px] sm:max-w-[420px]">
              <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                Chi tiết sản phẩm
              </div>
              <div class="mt-1 truncate text-base font-bold text-[color:var(--admin-text)] sm:text-lg">
                {{ selectedTrack.title }}
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center justify-self-end rounded-full border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] shadow-sm transition hover:bg-[color:var(--admin-surface-1)] hover:text-[color:var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-color:var(--admin-ring)] [--tw-ring-offset-color:var(--admin-surface-0)]"
              aria-label="Đóng"
              @click="detailDialogVisible = false"
            >
              <i class="pi pi-times text-sm" />
            </button>
          </div>
          <nav class="relative top-[1px] mt-3 flex w-full gap-3 overflow-x-auto border-b border-transparent pb-0 no-scrollbar">
            <button
              v-for="tab in detailTabs"
              :key="tab.key"
              type="button"
              class="group relative inline-flex shrink-0 items-center gap-2 pb-3 pt-1.5 text-[13px] font-bold transition-colors"
              :class="detailActiveTab === tab.key
                ? 'text-[color:var(--admin-primary-600)]'
                : 'text-[color:var(--admin-text-muted)] hover:text-[color:var(--admin-text)]'"
              @click="detailActiveTab = tab.key"
            >
              <i :class="tab.icon" class="transition-transform group-hover:scale-110" />
              {{ tab.label }}
              <span
                v-if="detailActiveTab === tab.key"
                class="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[color:var(--admin-primary-600)]"
              />
            </button>
          </nav>
        </div>
      </template>

      <div v-if="selectedTrack" class="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        <div class="space-y-3">
          <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
          <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
        </div>

        <section
          v-if="detailActiveTab === 'info'"
          class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 sm:p-5 [border-color:var(--admin-border)]"
        >
          <div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
            <i class="pi pi-file-edit text-[12px] text-[color:var(--admin-primary-500)]" />
            Thông tin chung
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div class="space-y-4">
              <article class="rounded-[24px] border bg-[linear-gradient(135deg,var(--admin-surface-1),var(--admin-surface-0))] p-4 [border-color:var(--admin-border)]">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex items-start gap-4">
                    <div
                      class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[color:var(--admin-primary-400)] to-[color:var(--admin-primary-600)] text-2xl font-bold text-white shadow-lg ring-4 ring-[color:var(--admin-primary-50)]"
                    >
                      <img
                        v-if="thumbnailUrls[selectedTrack.id]"
                        :src="thumbnailUrls[selectedTrack.id]"
                        alt=""
                        class="h-full w-full object-cover"
                      />
                      <span v-else>{{ selectedTrack.title.slice(0, 1).toUpperCase() }}</span>
                    </div>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center rounded-full bg-[color:var(--admin-primary-600)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          Sản phẩm
                        </span>
                        <span class="max-w-[220px] truncate font-mono text-[11px] text-[color:var(--admin-text-muted)]">
                          {{ selectedTrack.id }}
                        </span>
                      </div>
                      <h2 class="mt-3 text-xl font-bold tracking-tight text-[color:var(--admin-text)] sm:text-2xl">
                        {{ selectedTrack.title }}
                      </h2>
                      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[color:var(--admin-text-muted)]">
                        <span class="font-semibold text-[color:var(--admin-text)]">{{ resolveArtistDisplay(selectedTrack.artistId) }}</span>
                        <span class="text-[color:var(--admin-border)]">•</span>
                        <span>{{ formatTrackGenresDisplay(selectedTrack) }}</span>
                      </div>
                      <div class="mt-4 flex flex-wrap items-center gap-2.5">
                        <span
                          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm"
                          :class="getProductStatusClass(selectedTrack.status)"
                        >
                          <i class="pi pi-music text-[11px]" />
                          <span class="uppercase tracking-[0.14em] opacity-70">Product</span>
                          <span class="font-semibold">{{ formatProductStatusLabel(selectedTrack.status) }}</span>
                        </span>
                        <span
                          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm"
                          :class="getProductComplianceLegalStatusClassSafe(selectedTrack.complianceLegalStatus)"
                        >
                          <i class="pi pi-file text-[11px]" />
                          <span class="uppercase tracking-[0.14em] opacity-70">Legal</span>
                          <span class="font-semibold">{{ formatComplianceLegalStatusLabel(selectedTrack.complianceLegalStatus) }}</span>
                        </span>
                        <span
                          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm"
                          :class="getProductComplianceReviewStatusClassSafe(selectedTrack.complianceReviewStatus)"
                        >
                          <i class="pi pi-check-circle text-[11px]" />
                          <span class="uppercase tracking-[0.14em] opacity-70">Review</span>
                          <span class="font-semibold">{{ formatProductComplianceReviewStatusLabelSafe(selectedTrack.complianceReviewStatus) }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 sm:max-w-[260px] sm:justify-end">
                    <button
                      type="button"
                      :class="[secondaryButtonClass, 'gap-2 px-4 py-2.5 shadow-sm']"
                      :disabled="isLoading"
                      @click="confirmTogglePublish(selectedTrack)"
                    >
                      <i :class="selectedTrack.status === 'PUBLISHED' ? 'pi pi-eye-slash' : 'pi pi-eye'" class="text-sm" />
                      {{ selectedTrack.status === 'PUBLISHED' ? 'Ẩn track' : 'Phát hành track' }}
                    </button>
                    <button type="button" :class="[primaryButtonClass, 'gap-2 px-4 py-2.5 shadow-md']" @click="openUploadDialog(selectedTrack)">
                      <i class="pi pi-upload text-sm" />
                      Tải bản gốc
                    </button>
                    <button
                      type="button"
                      :class="[secondaryButtonClass, 'gap-2 px-4 py-2.5']"
                      :disabled="!selectedTrack.sheetMusicPdfKey"
                      @click="openSheetMusicPdf(selectedTrack)"
                    >
                      <i class="pi pi-file-pdf text-sm" />
                      Mở PDF
                    </button>
                  </div>
                </div>
              </article>

              <article class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
                <ProductWavePreview
                  :audio-url="originalAudioUrls[selectedTrack.id] ?? null"
                  :disabled="!selectedTrack.originalAudioKey"
                  :track-status="selectedTrack.status"
                />
              </article>

              <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Mô tả sản phẩm</div>
                <p class="mt-4 text-sm leading-7 text-[color:var(--admin-text)]">
                  {{ selectedTrack.description || 'Chưa có mô tả riêng cho sản phẩm.' }}
                </p>
              </article>
            </div>

            <div class="space-y-4">
              <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Thông tin chi tiết</div>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div
                    v-for="item in selectedTrackAttributeItems"
                    :key="`${selectedTrack.id}-${item.label}`"
                    class="rounded-2xl border bg-[color:var(--admin-surface-1)] px-4 py-3 [border-color:var(--admin-border)]"
                  >
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                      {{ item.label }}
                    </div>
                    <div
                      class="mt-2 break-words text-sm font-medium text-[color:var(--admin-text)]"
                      :class="item.mono ? 'font-mono text-xs sm:text-sm' : ''"
                    >
                      {{ item.value }}
                    </div>
                  </div>
                </div>
              </article>

              <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Tài liệu đính kèm</div>
                <div class="mt-4 rounded-2xl border bg-[color:var(--admin-surface-1)] px-4 py-4 [border-color:var(--admin-border)]">
                  <div class="text-sm font-medium text-[color:var(--admin-text)]">
                    {{ selectedTrack.sheetMusicPdfKey ? 'Đã có file khuông nhạc PDF.' : 'Chưa upload file khuông nhạc PDF.' }}
                  </div>
                  <div class="mt-2 text-xs text-[color:var(--admin-text-muted)]">
                    File PDF được mở trực tiếp trong phần thông tin chung khi sản phẩm đã upload khuông nhạc.
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-else-if="detailActiveTab === 'licensing'" class="space-y-5 sm:space-y-6">
          <div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
            <i class="pi pi-book text-[12px] text-[color:var(--admin-primary-500)]" />
            Quyền & Licensing
          </div>

          <article class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 sm:p-5 [border-color:var(--admin-border)]">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Quyền bán đã chọn</div>
                  <span class="rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]">
                    {{ selectedTrack.allowedPermissions.length }} quyền
                  </span>
                </div>
                <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                  Chọn tập quyền bán cuối cùng theo hồ sơ Pháp lý của sản phẩm.
                </div>
              </div>
              <button type="button" :class="[secondaryButtonClass, 'gap-2 w-full sm:w-auto']" @click="openApprovedPermissionsDialog(selectedTrack)">
                <i class="pi pi-sliders-h text-sm" />
                Chọn quyền bán
              </button>
            </div>
            <div
              v-if="selectedTrack.allowedPermissions.length === 0"
              class="mt-4 rounded-2xl border border-dashed bg-[color:var(--admin-surface-1)] px-4 py-4 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
            >
              Chưa chọn quyền bán cho sản phẩm. Nhấn “Chọn quyền bán” để bắt đầu.
            </div>
            <div v-else class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="permission in selectedTrack.allowedPermissions"
                :key="`${selectedTrack.id}-detail-allowed-${permission.name}-${permission.lawReference}`"
                class="inline-flex items-center rounded-full border bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]"
              >
                {{ permission.name }}
              </span>
            </div>
          </article>

          <article class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 sm:p-5 [border-color:var(--admin-border)]">
            <div class="flex flex-col gap-2">
              <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Đối chiếu Digital / Physical Rights</div>
              <div class="text-sm text-[color:var(--admin-text-muted)]">
                Hệ thống kiểm tra điều kiện tham gia gói quyền dựa trên tập quyền bán đã chọn.
              </div>
            </div>

              <div v-if="!hasSelectedTrackEligibility" class="mt-4 rounded-2xl border bg-[color:var(--admin-surface-1)] px-4 py-4 text-sm text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">
                    <i class="pi pi-info-circle text-sm" />
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-[color:var(--admin-text)]">Chưa có dữ liệu để đối chiếu</div>
                    <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                      Chưa có cấu hình digital hoặc physical nào đang `ACTIVE` để hệ thống đối chiếu.
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="mt-4 grid gap-4 lg:grid-cols-2">
                <section :class="getEligibilitySectionClass('digital')">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                      <i class="pi pi-desktop text-[12px]" :class="getEligibilitySectionIconClass('digital')" />
                      Digital Platform Rights
                    </div>
                    <div :class="getEligibilitySectionCountClass('digital')">
                      {{ selectedTrack.licensingEligibility.summary.eligibleDigitalCount }}/{{ getEligibilityTotal(selectedTrack, 'digital') }} đủ điều kiện
                    </div>
                  </div>

                  <div v-if="selectedTrack.licensingEligibility.digitalConfigs.length === 0" class="mt-3 text-sm text-[color:var(--admin-text-muted)]">
                    Chưa có gói quyền số nào đang `ACTIVE`.
                  </div>

                  <div v-else class="mt-3 space-y-3">
                    <article
                      v-for="config in selectedTrack.licensingEligibility.digitalConfigs"
                      :key="`${selectedTrack.id}-digital-${config.configId}`"
                      :class="getEligibilityConfigCardClass('digital')"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="font-semibold text-[color:var(--admin-text)]">{{ config.title }}</div>
                          <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                            {{ config.referencedPermissions.length }} quyền tham chiếu
                          </div>
                        </div>
                        <div class="flex flex-wrap justify-end gap-2">
                          <span
                            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
                            :class="getEligibilityStatusClass(config.status)"
                          >
                            <i
                              :class="config.status === 'ELIGIBLE' ? 'pi pi-check-circle' : config.status === 'INELIGIBLE' ? 'pi pi-times-circle' : 'pi pi-clock'"
                              class="text-[12px]"
                            />
                            {{ formatEligibilityStatusLabel(config.status) }}
                          </span>
                          <span
                            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
                            :class="getRegistrationStatusClass(config)"
                          >
                            <i :class="isConfigJoined(config) ? 'pi pi-link' : 'pi pi-ban'" class="text-[12px]" />
                            {{ getRegistrationStatusLabel(config) }}
                          </span>
                        </div>
                      </div>

                      <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3">
                        <details class="group">
                          <summary
                            :class="getMissingPermissionsSummaryClass()"
                            class="flex cursor-pointer list-none items-center justify-between gap-3 transition hover:-translate-y-0.5"
                          >
                            <span class="inline-flex items-center gap-2">
                              <i class="pi pi-exclamation-triangle text-[12px]" />
                              Thiếu {{ config.missingPermissions.length }} quyền tham chiếu
                            </span>
                            <span class="text-[color:var(--admin-text-muted)] group-open:hidden">Xem chi tiết</span>
                            <span class="hidden text-[color:var(--admin-text-muted)] group-open:inline">Ẩn</span>
                          </summary>
                          <div class="mt-3 grid gap-3 sm:grid-cols-2">
                            <article
                              v-for="permission in config.missingPermissions"
                              :key="`${config.configId}-digital-missing-${permission.id}`"
                              :class="getMissingPermissionItemClass()"
                            >
                              <div class="flex items-start gap-3">
                                <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                  <i class="pi pi-shield text-sm" />
                                </span>
                                <div class="min-w-0">
                                  <div class="font-semibold leading-5 text-[color:var(--admin-text)]">
                                    {{ permission.name }}
                                  </div>
                                  <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                                    {{ permission.lawReference }}
                                  </div>
                                </div>
                              </div>
                            </article>
                          </div>
                        </details>
                      </div>

                      <div class="mt-3 flex justify-end">
                        <button
                          type="button"
                          :class="[(config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass), 'gap-2']"
                          :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack!.id, config.configId)"
                          @click="submitPackageRegistration(selectedTrack!, config)"
                        >
                          <i :class="isConfigJoined(config) ? 'pi pi-times' : 'pi pi-plus'" class="text-sm" />
                          {{ isConfigJoined(config) ? 'Gỡ khỏi gói' : 'Đăng ký tham gia' }}
                        </button>
                      </div>
                    </article>
                  </div>
                </section>

                <section :class="getEligibilitySectionClass('physical')">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                      <i class="pi pi-box text-[12px]" :class="getEligibilitySectionIconClass('physical')" />
                      Physical Usage Rights
                    </div>
                    <div :class="getEligibilitySectionCountClass('physical')">
                      {{ selectedTrack.licensingEligibility.summary.eligiblePhysicalCount }}/{{ getEligibilityTotal(selectedTrack, 'physical') }} đủ điều kiện
                    </div>
                  </div>

                  <div v-if="selectedTrack.licensingEligibility.physicalConfigs.length === 0" class="mt-3 text-sm text-[color:var(--admin-text-muted)]">
                    Chưa có cấu hình quyền vật lý nào đang `ACTIVE`.
                  </div>

                  <div v-else class="mt-3 space-y-3">
                    <article
                      v-for="config in selectedTrack.licensingEligibility.physicalConfigs"
                      :key="`${selectedTrack.id}-physical-${config.configId}`"
                      :class="getEligibilityConfigCardClass('physical')"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="font-semibold text-[color:var(--admin-text)]">{{ config.title }}</div>
                          <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                            {{ config.referencedPermissions.length }} quyền tham chiếu
                          </div>
                        </div>
                        <div class="flex flex-wrap justify-end gap-2">
                          <span
                            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
                            :class="getEligibilityStatusClass(config.status)"
                          >
                            <i
                              :class="config.status === 'ELIGIBLE' ? 'pi pi-check-circle' : config.status === 'INELIGIBLE' ? 'pi pi-times-circle' : 'pi pi-clock'"
                              class="text-[12px]"
                            />
                            {{ formatEligibilityStatusLabel(config.status) }}
                          </span>
                          <span
                            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
                            :class="getRegistrationStatusClass(config)"
                          >
                            <i :class="isConfigJoined(config) ? 'pi pi-link' : 'pi pi-ban'" class="text-[12px]" />
                            {{ getRegistrationStatusLabel(config) }}
                          </span>
                        </div>
                      </div>

                      <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3">
                        <details class="group">
                          <summary
                            :class="getMissingPermissionsSummaryClass()"
                            class="flex cursor-pointer list-none items-center justify-between gap-3 transition hover:-translate-y-0.5"
                          >
                            <span class="inline-flex items-center gap-2">
                              <i class="pi pi-exclamation-triangle text-[12px]" />
                              Thiếu {{ config.missingPermissions.length }} quyền tham chiếu
                            </span>
                            <span class="text-[color:var(--admin-text-muted)] group-open:hidden">Xem chi tiết</span>
                            <span class="hidden text-[color:var(--admin-text-muted)] group-open:inline">Ẩn</span>
                          </summary>
                          <div class="mt-3 grid gap-3 sm:grid-cols-2">
                            <article
                              v-for="permission in config.missingPermissions"
                              :key="`${config.configId}-physical-missing-${permission.id}`"
                              :class="getMissingPermissionItemClass()"
                            >
                              <div class="flex items-start gap-3">
                                <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                  <i class="pi pi-shield text-sm" />
                                </span>
                                <div class="min-w-0">
                                  <div class="font-semibold leading-5 text-[color:var(--admin-text)]">
                                    {{ permission.name }}
                                  </div>
                                  <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">
                                    {{ permission.lawReference }}
                                  </div>
                                </div>
                              </div>
                            </article>
                          </div>
                        </details>
                      </div>

                      <div class="mt-3 flex justify-end">
                        <button
                          type="button"
                          :class="[(config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass), 'gap-2']"
                          :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack!.id, config.configId)"
                          @click="submitPackageRegistration(selectedTrack!, config)"
                        >
                          <i :class="isConfigJoined(config) ? 'pi pi-times' : 'pi pi-plus'" class="text-sm" />
                          {{ isConfigJoined(config) ? 'Gỡ khỏi gói' : 'Đăng ký tham gia' }}
                        </button>
                      </div>
                    </article>
                  </div>
                </section>
              </div>

            <article
              v-if="selectedTrack && (selectedTrack.digitalPackageRegistrations.length > 0 || selectedTrack.physicalPackageRegistrations.length > 0)"
              class="mt-4 rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]"
            >
              <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Lịch sử đăng ký gói</div>
              <div class="mt-3 space-y-3">
                <article
                  v-for="registration in [...selectedTrack.digitalPackageRegistrations, ...selectedTrack.physicalPackageRegistrations]"
                  :key="registration.registrationId"
                  class="rounded-2xl border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div class="font-semibold text-[color:var(--admin-text)]">{{ registration.title }}</div>
                      <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                        {{ registration.configType === 'DIGITAL' ? 'Digital package' : 'Physical package' }} · {{ registration.configStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng' }}
                      </div>
                    </div>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                      :class="registration.registrationStatus === 'JOINED'
                        ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]'
                        : 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]'"
                    >
                      <i :class="registration.registrationStatus === 'JOINED' ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="text-[12px]" />
                      {{ registration.registrationStatus === 'JOINED' ? 'Đã đăng ký' : 'Đã gỡ' }}
                    </span>
                  </div>
                </article>
              </div>
            </article>
          </article>
        </section>

      </div>

    </Dialog>


    <ProductManagementActionMenu
      :visible="Boolean(mobileActionTrack)"
      :track="mobileActionTrack"
      :is-loading="isLoading"
      @close="closeMobileActionMenu"
      @detail="openDetailDialog"
      @edit="openEditDialog"
      @permissions="openApprovedPermissionsDialog"
      @compliance="openComplianceDashboard"
      @upload="openUploadDialog"
    />

    <Dialog
      v-model:visible="approvedPermissionsDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(860px,96vw)]"
      :pt="{
        content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' },
        footer: { class: 'border-t px-4 py-4 sm:px-6 [border-color:var(--admin-border)]' },
      }"
    >
      <template #header>
        <div class="w-full" v-if="approvedPermissionsTrack">
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">Chọn quyền bán theo hồ sơ Pháp lý</div>
          <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
            Tinh chỉnh subset quyền bán cuối cùng cho <span class="font-semibold text-[color:var(--admin-text)]">{{ approvedPermissionsTrack.title }}</span>.
          </div>
        </div>
      </template>

      <div class="space-y-5">
        <section
          v-if="approvedPermissionsTrack"
          class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="font-semibold text-[color:var(--admin-text)]">{{ approvedPermissionsTrack.title }}</div>
              <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
                Chọn quyền bán trong đúng tập được Pháp lý cấp cho sản phẩm này.
              </div>
            </div>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductStatusClass(approvedPermissionsTrack.status)">
              {{ formatProductStatusLabel(approvedPermissionsTrack.status) }}
            </span>
          </div>
        </section>

        <section class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
          <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Trạng thái hồ sơ Pháp lý</div>

          <div v-if="approvedPermissionsLoading" class="mt-3 rounded-2xl border bg-[color:var(--admin-surface-1)] px-4 py-4 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">
            Đang tải thông tin hồ sơ Pháp lý...
          </div>

          <div v-else-if="approvedPermissionsDetail" class="mt-3 space-y-4">
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductComplianceLegalStatusClass(approvedPermissionsDetail.legalStatus)">
                Legal: {{ formatComplianceLegalStatusLabel(approvedPermissionsDetail.legalStatus) }}
              </span>
              <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductComplianceReviewStatusClass(approvedPermissionsDetail.reviewStatus)">
                Review: {{ formatProductComplianceReviewStatusLabel(approvedPermissionsDetail.reviewStatus) }}
              </span>
            </div>

            <div v-if="!canChooseAllowedPermissions" class="rounded-2xl border bg-[color:var(--admin-primary-50)] px-4 py-3 text-sm text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]">
              Chỉ có thể chọn quyền bán khi hồ sơ đang ở trạng thái `SUFFICIENT` và `APPROVED`.
            </div>

            <div v-else-if="approvedPermissionOptions.length === 0" class="rounded-2xl border bg-[color:var(--admin-primary-50)] px-4 py-3 text-sm text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]">
              Hồ sơ đã đủ điều kiện nhưng hiện chưa có quyền nào trong tập `Approved permissions`.
            </div>

            <div v-else class="grid gap-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Approved permissions do Pháp lý cấp</div>
                  <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                    Chọn trực tiếp các quyền bán bạn muốn áp dụng cho Product.
                  </div>
                </div>
                <div class="rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]">
                  {{ selectedApprovedPermissionCount }}/{{ approvedPermissionOptions.length }} đã chọn
                </div>
              </div>

              <div class="space-y-3 sm:hidden">
                <button
                  v-for="permission in approvedPermissionOptions"
                  :key="`mobile-${approvedPermissionsTrack?.id ?? 'track'}-${permission.id}`"
                  type="button"
                  class="w-full rounded-[24px] border px-4 py-4 text-left text-sm transition"
                  :class="selectedAllowedPermissionIds.includes(permission.id)
                    ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] shadow-sm [border-color:var(--admin-primary-500)]'
                    : 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]'"
                  :disabled="approvedPermissionsSaving"
                  @click="toggleAllowedPermissionSelection(permission.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="font-semibold">{{ permission.name }}</div>
                      <div class="mt-1 text-xs leading-5 text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</div>
                    </div>
                    <div
                      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs"
                      :class="selectedAllowedPermissionIds.includes(permission.id)
                        ? 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-primary-500)] [border-color:var(--admin-primary-500)]'
                        : 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]'"
                    >
                      <i :class="selectedAllowedPermissionIds.includes(permission.id) ? 'pi pi-check' : 'pi pi-plus'" />
                    </div>
                  </div>
                  <div class="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]" :class="selectedAllowedPermissionIds.includes(permission.id) ? 'text-[color:var(--admin-primary-500)]' : 'text-[color:var(--admin-text-muted)]'">
                    {{ formatApprovedPermissionSelectionState(selectedAllowedPermissionIds.includes(permission.id)) }}
                  </div>
                </button>
              </div>

              <div class="hidden gap-3 sm:grid sm:grid-cols-2">
                <button
                  v-for="permission in approvedPermissionOptions"
                  :key="`${approvedPermissionsTrack?.id ?? 'track'}-${permission.id}`"
                  type="button"
                  class="rounded-[24px] border px-4 py-4 text-left text-sm transition"
                  :class="selectedAllowedPermissionIds.includes(permission.id)
                    ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] shadow-sm [border-color:var(--admin-primary-500)]'
                    : 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]'"
                  :disabled="approvedPermissionsSaving"
                  @click="toggleAllowedPermissionSelection(permission.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate font-semibold">{{ permission.name }}</div>
                      <div class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</div>
                    </div>
                    <div
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs"
                      :class="selectedAllowedPermissionIds.includes(permission.id)
                        ? 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-primary-500)] [border-color:var(--admin-primary-500)]'
                        : 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]'"
                    >
                      <i :class="selectedAllowedPermissionIds.includes(permission.id) ? 'pi pi-check' : 'pi pi-plus'" />
                    </div>
                  </div>
                  <div class="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]" :class="selectedAllowedPermissionIds.includes(permission.id) ? 'text-[color:var(--admin-primary-500)]' : 'text-[color:var(--admin-text-muted)]'">
                    {{ formatApprovedPermissionSelectionState(selectedAllowedPermissionIds.includes(permission.id)) }}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-[color:var(--admin-text-muted)]">
            Đã chọn {{ selectedApprovedPermissionCount }} / {{ approvedPermissionOptions.length }} quyền
          </div>
          <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="approvedPermissionsDialogVisible = false">Đóng</button>
            <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="!canSaveAllowedPermissions" @click="confirmSaveAllowedPermissions">
              Lưu quyền bán
            </button>
          </div>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="uploadDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(720px,92vw)]"
      header="Tải audio gốc"
      :pt="{
        content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-10rem)]' },
        footer: { class: 'border-t px-4 py-4 sm:px-6 [border-color:var(--admin-border)]' },
      }"
    >
      <div class="space-y-4">
        <div
          v-if="selectedTrack"
          class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]"
        >
          <div class="text-sm font-semibold text-[color:var(--admin-text)]">{{ selectedTrack.title }}</div>
          <div class="mt-1 text-xs text-[color:var(--admin-text-muted)]">
            Upload file MP3 gốc mới hoặc gắn nhanh file demo để kiểm tra flow publish.
          </div>
        </div>

        <label class="block space-y-2 rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Tệp</span>
          <input type="file" accept=".mp3,audio/*" :class="fileInputClass" :disabled="uploadStatus === 'requesting' || uploadStatus === 'uploading'" @change="onUploadFileChange" />
          <span class="text-sm text-[color:var(--admin-text-muted)]">File key sẽ được cấp tự động dạng `N.mp3` sau khi bấm tải lên.</span>
        </label>

        <div class="flex flex-wrap items-center gap-2">
          <span v-if="uploadFile" class="rounded-full bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-medium text-[color:var(--admin-text)]">{{ uploadFile.name }}</span>
          <span
            v-if="uploadStatus !== 'idle'"
            class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] [border-color:var(--admin-border)]"
            :class="uploadStatus === 'done'
              ? 'bg-[color:var(--admin-accent-50)] text-[color:var(--admin-text)]'
              : uploadStatus === 'error'
                ? 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text)]'
                : 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)]'"
          >
            {{ formatUploadStatusLabel(uploadStatus) }}
          </span>
        </div>

        <Message v-if="uploadError" severity="error">{{ uploadError }}</Message>
        <Message v-if="uploadStatus === 'done'" severity="success">Tải file lên thành công</Message>

        <div v-if="uploadResult" class="rounded-2xl border bg-[color:var(--admin-surface-1)] p-4 text-sm text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
          <strong class="text-[color:var(--admin-text)]">File key:</strong> {{ uploadResult.fileKey }}
        </div>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="uploadDialogVisible = false">Đóng</button>
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="uploadStatus === 'requesting' || uploadStatus === 'uploading'" @click="applyDemoAudioKey">
            Dùng 1.mp3
          </button>
          <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="!uploadFile || uploadStatus === 'requesting' || uploadStatus === 'uploading'" @click="submitUpload">
            Tải lên
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
