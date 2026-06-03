<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiClientError } from '../../../shared/api/http'
import type { ComplianceDetail } from '../../compliance/compliance.types'
import { getAdminComplianceDetail } from '../../compliance/compliance.api'
import { listManagedUsers } from '../../managed-users/managed-users.api'
import type { ManagedUser } from '../../managed-users/managed-users.types'
import type {
  Product,
  ProductLicensingEligibilityConfig,
  ProductSortValue,
  ProductStatus,
  ProductThumbnailExtension,
} from '../../products/products.types'
import {
  PRODUCT_GENRE_OPTIONS,
  PRODUCT_USE_CASE_OPTIONS,
  resolveProductGenreLabel,
  resolveProductUseCaseLabel,
  type ProductGenre,
  type ProductUseCase,
} from '../../products/products.enums'
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
} from '../../products/products.api'
import ProductFilterInput from '../../products/components/ProductFilterInput.vue'
import ProductFilterSelect from '../../products/components/ProductFilterSelect.vue'
import ProductWavePreview from '../../products/components/ProductWavePreview.vue'
import ProductManagementActionMenu from '../components/ProductManagementActionMenu.vue'
import ProductManagementMobileCardList from '../components/ProductManagementMobileCardList.vue'

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
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/90 px-4 pr-11 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const fileInputClass =
  'block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-violet-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-200 dark:text-slate-400 dark:file:bg-violet-500/20 dark:file:text-violet-200'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'
const summaryToneClassMap = {
  primary: 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/60 dark:border-violet-500/20',
  success: 'from-emerald-500/15 to-teal-500/10 border-emerald-200/60 dark:border-emerald-500/20',
  warning: 'from-amber-500/15 to-orange-500/10 border-amber-200/60 dark:border-amber-500/20',
} as const

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
const detailActiveTab = ref<'info' | 'licensing' | 'review'>('info')

const detailTabs = [
  { key: 'info' as const, label: 'Thông tin', icon: 'pi pi-file-edit' },
  { key: 'licensing' as const, label: 'Quyền & Licensing', icon: 'pi pi-book' },
  { key: 'review' as const, label: 'Đánh giá & Duyệt', icon: 'pi pi-verified' },
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
const selectedCreateArtistOption = computed(() =>
  artistOptions.value.find((option) => option.value === createForm.artistId) ?? null,
)
const selectedEditArtistOption = computed(() =>
  artistOptions.value.find((option) => option.value === editForm.artistId) ?? null,
)
const summaryCards = computed(() => [
  {
    title: 'Tổng số sản phẩm',
    value: summaryCounts.total,
    description: 'Toàn bộ dữ liệu theo bộ lọc',
    icon: 'pi pi-wave-pulse',
    tone: 'primary' as const,
  },
  {
    title: 'Chờ kiểm duyệt',
    value: summaryCounts.pending,
    description: 'Sản phẩm mới hoặc chưa duyệt',
    icon: 'pi pi-clock',
    tone: 'warning' as const,
  },
  {
    title: 'Đang phát hành',
    value: summaryCounts.published,
    description: 'Tổng số track đang hiển thị',
    icon: 'pi pi-check-circle',
    tone: 'success' as const,
  },
  {
    title: 'Đang ẩn',
    value: summaryCounts.hidden,
    description: 'Tổng số track đang ẩn',
    icon: 'pi pi-eye-slash',
    tone: 'primary' as const,
  },
])
const getEligibilityTotal = (track: Product, type: 'digital' | 'physical') =>
  type === 'digital'
    ? track.licensingEligibility.summary.eligibleDigitalCount + track.licensingEligibility.summary.ineligibleDigitalCount
    : track.licensingEligibility.summary.eligiblePhysicalCount + track.licensingEligibility.summary.ineligiblePhysicalCount
const formatEligibilityStatusLabel = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Không đủ điều kiện'
const getEligibilityStatusClass = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
const getEligibilityMissingSummary = (config: ProductLicensingEligibilityConfig) =>
  config.missingPermissions.map((permission) => permission.name).join(', ')
const isConfigJoined = (config: ProductLicensingEligibilityConfig) => config.registrationStatus === 'JOINED'
const getRegistrationStatusLabel = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config) ? 'Đã đăng ký' : 'Chưa đăng ký'
const getRegistrationStatusClass = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config)
    ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
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
type TrackAttributeItem = { label: string; value: string; mono?: boolean }
const selectedTrackAttributeItems = computed<TrackAttributeItem[]>(() => {
  if (!selectedTrack.value) return []

  const track = selectedTrack.value

  return [
    {
      label: 'Nghệ sĩ',
      value: resolveArtistDisplay(track.artistId),
    },
    {
      label: 'Thể loại',
      value: formatTrackGenresDisplay(track),
    },
    {
      label: 'Thời lượng',
      value: formatDuration(track.duration),
    },
    {
      label: 'Use-case',
      value: formatTrackUseCasesDisplay(track),
    },
    {
      label: 'Trạng thái',
      value: formatProductStatusLabel(track.status),
    },
    {
      label: 'Tạo lúc',
      value: formatDateTime(track.createdAt),
    },
    {
      label: 'Cập nhật lúc',
      value: formatDateTime(track.updatedAt),
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
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (value === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
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

const summaryCardToneClass = (tone: keyof typeof summaryToneClassMap) => summaryToneClassMap[tone]

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

const toggleSelection = <T extends string>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

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
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (value === 'INSUFFICIENT') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
}

const getProductComplianceReviewStatusClass = (value: ComplianceDetail['reviewStatus']) => {
  if (value === 'APPROVED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (value === 'REJECTED') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
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

onMounted(() => {
  void fetchArtistOptions()
  void refreshTrackDashboard()
})

let keywordDebounceTimer: number | null = null
let filtersDebounceTimer: number | null = null

watch(
  () => filters.keyword,
  () => {
    if (keywordDebounceTimer) window.clearTimeout(keywordDebounceTimer)
    keywordDebounceTimer = window.setTimeout(() => {
      pagination.page = 1
      void refreshTrackDashboard()
    }, 450)
  },
)

watch(
  () => [filters.sort, filters.status, filters.genre] as const,
  () => {
    if (filtersDebounceTimer) window.clearTimeout(filtersDebounceTimer)
    filtersDebounceTimer = window.setTimeout(() => {
      pagination.page = 1
      void refreshTrackDashboard()
    }, 180)
  },
)

onBeforeUnmount(() => {
  revokeObjectUrl(createOriginalAudioUrl.value)
  revokeObjectUrl(createThumbnailUrl.value)
  revokeObjectUrl(editThumbnailUrl.value)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(109,74,255,0.22),transparent_38%),radial-gradient(circle_at_60%_120%,rgba(192,132,252,0.14),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.92))] p-5 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_60%_120%,rgba(168,85,247,0.18),transparent_44%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 sm:p-6 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Quản trị viên
        </div>
        <div>
          <h1 class="m-0 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">Quản lý sản phẩm</h1>
        </div>
      </div>

      <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="openCreateDialog">
        <i class="pi pi-plus mr-2" />
        Thêm sản phẩm
      </button>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in summaryCards"
        :key="card.title"
        class="rounded-[28px] border bg-gradient-to-br p-5 shadow-sm backdrop-blur"
        :class="summaryCardToneClass(card.tone)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{{ card.title }}</div>
            <div class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ card.value }}</div>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-violet-600 shadow-sm dark:bg-slate-950/60 dark:text-violet-300">
            <i :class="card.icon" />
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ card.description }}</p>
      </article>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-950 dark:text-white">Danh sách sản phẩm</div>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Theo dõi, kiểm duyệt và cập nhật thông tin sản phẩm trên nền tảng.
          </div>
        </div>

        <div class="flex min-w-0 flex-col gap-3 xl:min-w-0 xl:max-w-[980px] xl:flex-1">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProductFilterInput v-model="filters.keyword" icon-class="pi pi-search" placeholder="Tìm theo tên, tác giả hoặc thể loại" :disabled="isLoading" />
            <ProductFilterInput v-model="filters.genre" icon-class="pi pi-sliders-h" placeholder="Thể loại" :disabled="isLoading" />
            <ProductFilterSelect v-model="filters.status" icon-class="pi pi-tag" :options="statusOptions" :disabled="isLoading" />
            <ProductFilterSelect v-model="filters.sort" icon-class="pi pi-sort-alt" :options="sortOptions" :disabled="isLoading" />
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="refreshTrackDashboard">
              <i class="pi pi-filter mr-2" />
              Lọc
            </button>
            <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="rows.length === 0" @click="exportCurrentTracksCsv">
              <i class="pi pi-download mr-2" />
              Xuất dữ liệu
            </button>
            <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="openCreateDialog">
              <i class="pi pi-plus mr-2" />
              Thêm sản phẩm
            </button>
          </div>
        </div>
      </div>

      <div v-if="!isAnyDialogVisible" class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <ProductManagementMobileCardList
        class="mt-6"
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

      <div class="mt-6 hidden overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40 sm:block">
        <div class="overflow-x-auto">
          <table class="min-w-[1180px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="w-20 px-3 py-4 font-semibold">Ảnh</th>
                <th class="w-[20%] px-3 py-4 font-semibold">Sản phẩm</th>
                <th class="w-32 px-3 py-4 font-semibold">Quyền bán</th>
                <th class="w-40 px-3 py-4 font-semibold">Pháp lý</th>
                <th class="w-[46%] px-3 py-4 font-semibold">Waveform</th>
                <th class="w-36 px-3 py-4 font-semibold">Trạng thái</th>
                <th class="w-28 px-3 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr
                v-for="track in rows"
                :key="track.id"
                class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30"
                @mouseenter="preloadTrackAssets(track)"
              >
                <td class="px-3 py-4">
                  <div class="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <img
                      v-if="thumbnailUrls[track.id]"
                      :src="thumbnailUrls[track.id]"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/30 to-fuchsia-500/20 text-sm font-semibold text-violet-700 dark:text-violet-200">
                      {{ track.title.slice(0, 1).toUpperCase() }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-slate-900 dark:text-white">
                      {{ track.title }}
                    </div>
                    <div class="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ resolveArtistDisplay(track.artistId) }} · {{ formatTrackGenresDisplay(track) }} · {{ formatDuration(track.duration) }} ·
                      {{ formatDateTime(track.updatedAt) }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <div class="space-y-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-violet-500/40 dark:hover:text-violet-200"
                      :disabled="isLoading"
                      @click="openApprovedPermissionsDialog(track)"
                    >
                      <i class="pi pi-book text-xs" />
                      {{ track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0 }} quyền
                    </button>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60"
                    :class="
                      track.complianceLegalStatus === 'SUFFICIENT'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : track.complianceLegalStatus === 'INSUFFICIENT'
                          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                    "
                    :disabled="isLoading"
                    @click="openComplianceDashboard(track)"
                  >
                    <i class="pi pi-verified text-xs" />
                    {{ formatComplianceLegalStatusLabel(track.complianceLegalStatus) }}
                  </button>
                </td>
                <td class="px-3 py-4">
                  <div class="min-w-0">
                    <div v-if="track.originalAudioKey" class="min-w-0">
                      <div v-if="originalAudioUrls[track.id]" class="min-w-0">
                        <ProductWavePreview :audio-url="originalAudioUrls[track.id] ?? null" :disabled="!track.originalAudioKey" :right-label="formatDuration(track.duration)" />
                      </div>
                      <button
                        v-else
                        type="button"
                        class="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-violet-500/40 dark:hover:text-violet-200"
                        :disabled="originalAudioLoading[track.id] || isLoading"
                        @click="() => void ensureOriginalAudioUrl(track)"
                      >
                        <i :class="originalAudioLoading[track.id] ? 'pi pi-spin pi-spinner mr-2' : 'pi pi-wave-pulse mr-2'" />
                        {{ originalAudioLoading[track.id] ? 'Đang tải...' : 'Hiển thị waveform' }}
                      </button>
                    </div>

                    <div v-else class="text-sm text-slate-500 dark:text-slate-400">
                      Chưa có audio gốc
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                    :class="
                      track.status === 'PUBLISHED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : track.status === 'PENDING'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    "
                    :disabled="isLoading"
                    @click="confirmTogglePublish(track)"
                  >
                    <span
                      class="h-2.5 w-2.5 rounded-full"
                      :class="
                        track.status === 'PUBLISHED'
                          ? 'bg-emerald-500'
                          : track.status === 'PENDING'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
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
                <td class="px-3 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="isLoading" @click="openDetailDialog(track)">
                      <i class="pi pi-eye" />
                    </button>
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="isLoading" @click="openEditDialog(track)">
                      <i class="pi pi-pencil" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có sản phẩm phù hợp. Thử đổi keyword, status hoặc genre để mở rộng kết quả tìm kiếm.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} sản phẩm
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <label
            class="flex h-12 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-500/20"
          >
            <span class="mr-2 text-slate-400 dark:text-slate-500">
              <i class="pi pi-list" />
            </span>
            <select
              :value="String(pagination.pageSize)"
              :disabled="isLoading"
              class="h-full bg-transparent text-sm font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100"
              @change="
                (event) => {
                  pagination.pageSize = Number((event.target as HTMLSelectElement).value)
                  pagination.page = 1
                  void refreshTrackDashboard()
                }
              "
            >
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
            </select>
            <span class="ml-2 text-xs text-slate-400 dark:text-slate-500">
              <i class="pi pi-chevron-down" />
            </span>
          </label>

          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page <= 1" @click="() => void goToPage(pagination.page - 1)">
            <i class="pi pi-angle-left mr-2" />
            Trước
          </button>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {{ pagination.page }} / {{ totalPages }}
          </div>

          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page >= totalPages" @click="() => void goToPage(pagination.page + 1)">
            Sau
            <i class="pi pi-angle-right ml-2" />
          </button>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="createDialogVisible"
      modal
      class="w-[calc(100vw-1rem)] sm:w-[min(1040px,96vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-8rem)] overflow-y-auto' } }"
    >
      <template #header>
        <div class="flex w-full items-center justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">Thêm track</div>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <i class="pi pi-wave-pulse" />
          </div>
        </div>
      </template>

      <Message v-if="createDialogErrorMessage" severity="error" class="mb-4">{{ createDialogErrorMessage }}</Message>

      <div class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-align-left text-violet-500" />
            Thông tin chung
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tên track</span>
              <input v-model="createForm.title" :class="fieldClass" placeholder="Nhập tên track" />
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Nghệ sĩ</span>
              <div class="relative">
                <select v-model="createForm.artistId" :class="selectFieldClass" :disabled="isArtistsLoading">
                  <option value="">Chọn nghệ sĩ</option>
                  <option v-for="artist in artistOptions" :key="artist.value" :value="artist.value">
                    {{ artist.label }}
                  </option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
              </div>
              <span class="text-xs text-slate-500 dark:text-slate-400">
                {{
                  isArtistsLoading
                    ? 'Đang tải danh sách nghệ sĩ...'
                    : selectedCreateArtistOption?.email || 'Chọn nghệ sĩ active để gắn cho sản phẩm'
                }}
              </span>
            </label>
            <div class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thể loại</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in PRODUCT_GENRE_OPTIONS"
                  :key="`create-genre-${option.value}`"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="createForm.genres.includes(option.value)
                    ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-200'"
                  @click="createForm.genres = toggleSelection(createForm.genres, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Use-case</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in PRODUCT_USE_CASE_OPTIONS"
                  :key="`create-usecase-${option.value}`"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="createForm.useCases.includes(option.value)
                    ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-200'"
                  @click="createForm.useCases = toggleSelection(createForm.useCases, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <label class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Mô tả sản phẩm</span>
              <textarea v-model="createForm.description" class="min-h-[120px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20" placeholder="Nhập mô tả chi tiết cho sản phẩm" />
            </label>
          </div>

        </section>

        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-image text-violet-500" />
            Thumbnail
          </div>

          <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Ảnh đại diện</div>
              <span v-if="createThumbnailFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ createThumbnailFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp" :class="fileInputClass" @change="handleCreateThumbnailFileChange" />
            </div>
            <div class="mt-4 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <img v-if="createThumbnailUrl" :src="createThumbnailUrl" alt="" class="h-40 w-full rounded-2xl object-cover" />
              <div v-else class="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">Chưa chọn thumbnail</div>
            </div>
          </article>

          <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-volume-up text-violet-500" />
            Audio gốc
          </div>

          <article class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">File MP3 gốc</div>
              <span v-if="createOriginalFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ createOriginalFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="handleCreateAudioFileChange" />
            </div>
            <div class="mt-4">
              <ProductWavePreview :audio-url="createOriginalAudioUrl" :disabled="!createOriginalAudioUrl" />
            </div>
          </article>

          <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-file-pdf text-violet-500" />
            Khuông nhạc (PDF)
          </div>

          <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">File PDF</div>
              <span v-if="createSheetMusicFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ createSheetMusicFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept=".pdf,application/pdf" :class="fileInputClass" @change="handleCreateSheetMusicFileChange" />
            </div>
          </article>

          <label class="mt-4 block space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thời lượng (giây)</span>
            <input v-model="createForm.duration" :class="fieldClass" readonly />
            <span class="text-xs text-slate-500 dark:text-slate-400">
              {{ createDurationDisplay ? `≈ ${createDurationDisplay}` : 'Chọn file audio để tự đọc thời lượng.' }}
            </span>
          </label>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="secondaryButtonClass" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isLoading" @click="submitCreate">Tạo track</button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="editDialogVisible"
      modal
      class="w-[calc(100vw-1rem)] sm:w-[min(1040px,96vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-8rem)] overflow-y-auto' } }"
    >
      <template #header>
        <div class="flex w-full items-center justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">Chỉnh sửa track</div>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <i class="pi pi-pencil" />
          </div>
        </div>
      </template>

      <Message v-if="editDialogErrorMessage" severity="error" class="mb-4">{{ editDialogErrorMessage }}</Message>

      <div v-if="selectedTrack" class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-align-left text-violet-500" />
            Thông tin chung
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tên track</span>
              <input v-model="editForm.title" :class="fieldClass" placeholder="Nhập tên track" />
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Nghệ sĩ</span>
              <div class="relative">
                <select v-model="editForm.artistId" :class="selectFieldClass" disabled>
                  <option :value="editForm.artistId">{{ selectedEditArtistOption?.label ?? editForm.artistId }}</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
              </div>
            </label>
            <div class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thể loại</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in PRODUCT_GENRE_OPTIONS"
                  :key="`edit-genre-${option.value}`"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="editForm.genres.includes(option.value)
                    ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-200'"
                  @click="editForm.genres = toggleSelection(editForm.genres, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Use-case</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in PRODUCT_USE_CASE_OPTIONS"
                  :key="`edit-usecase-${option.value}`"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="editForm.useCases.includes(option.value)
                    ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-200'"
                  @click="editForm.useCases = toggleSelection(editForm.useCases, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <label class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Mô tả sản phẩm</span>
              <textarea v-model="editForm.description" class="min-h-[120px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20" placeholder="Nhập mô tả chi tiết cho sản phẩm" />
            </label>
          </div>
        </section>

        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-image text-violet-500" />
            Thumbnail
          </div>

          <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Ảnh đại diện</div>
              <span v-if="editThumbnailFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ editThumbnailFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp" :class="fileInputClass" @change="handleEditThumbnailFileChange" />
            </div>
            <div class="mt-4 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <img v-if="editThumbnailUrl || thumbnailUrls[selectedTrack.id]" :src="editThumbnailUrl || thumbnailUrls[selectedTrack.id]" alt="" class="h-40 w-full rounded-2xl object-cover" />
              <div v-else class="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">Chưa có thumbnail</div>
            </div>
          </article>

          <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-volume-up text-violet-500" />
            Audio gốc
          </div>

          <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Thay file MP3</div>
              <span v-if="editOriginalFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ editOriginalFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="handleEditAudioFileChange" />
            </div>
            <div class="mt-4">
              <label class="block space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thời lượng (giây)</span>
                <input v-model="editForm.duration" :class="fieldClass" readonly />
              </label>
            </div>
          </article>

          <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-file-pdf text-violet-500" />
            Khuông nhạc (PDF)
          </div>

          <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ selectedTrack.sheetMusicPdfKey ? 'Đã có PDF' : 'Chưa có PDF' }}
              </div>
              <button type="button" :class="secondaryButtonClass" :disabled="!selectedTrack.sheetMusicPdfKey" @click="openSheetMusicPdf(selectedTrack)">
                Mở PDF
              </button>
            </div>
            <div class="mt-4 flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Thay file PDF</div>
              <span v-if="editSheetMusicFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {{ editSheetMusicFile.name }}
              </span>
            </div>
            <div class="mt-4">
              <input type="file" accept=".pdf,application/pdf" :class="fileInputClass" @change="handleEditSheetMusicFileChange" />
            </div>
          </article>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="secondaryButtonClass" @click="editDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isLoading" @click="confirmSubmitEdit">Lưu thay đổi</button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      class="w-[calc(100vw-1rem)] sm:w-[min(1040px,96vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-8rem)] overflow-y-auto' } }"
    >
      <template #header>
        <div v-if="selectedTrack" class="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg font-semibold text-white shadow-lg shadow-violet-500/20">
              <img
                v-if="thumbnailUrls[selectedTrack.id]"
                :src="thumbnailUrls[selectedTrack.id]"
                alt=""
                class="h-full w-full object-cover"
              />
              <span v-else>{{ selectedTrack.title.slice(0, 1).toUpperCase() }}</span>
            </div>
            <div>
              <div class="text-xl font-semibold text-slate-950 dark:text-white">{{ selectedTrack.title }}</div>
              <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ resolveArtistDisplay(selectedTrack.artistId) }} · {{ formatTrackGenresDisplay(selectedTrack) }}
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              :class="selectedTrack.status === 'PUBLISHED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'"
            >
              {{ formatProductStatusLabel(selectedTrack.status) }}
            </span>
            <button type="button" :class="secondaryButtonClass" :disabled="isLoading" @click="confirmTogglePublish(selectedTrack)">
              {{ selectedTrack.status === 'PUBLISHED' ? 'Ẩn track' : 'Phát hành track' }}
            </button>
          </div>
        </div>
      </template>

      <div v-if="selectedTrack" class="space-y-4">
        <div class="space-y-3">
          <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
          <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
        </div>

        <nav class="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
          <button
            v-for="tab in detailTabs"
            :key="tab.key"
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition"
            :class="detailActiveTab === tab.key
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-white'"
            @click="detailActiveTab = tab.key"
          >
            <i :class="tab.icon" />
            {{ tab.label }}
          </button>
        </nav>

        <div class="max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          <div v-if="detailActiveTab === 'info'" class="space-y-4">
            <section class="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <ProductWavePreview
                :audio-url="originalAudioUrls[selectedTrack.id] ?? null"
                :disabled="!selectedTrack.originalAudioKey"
              />
              <div class="mt-3 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>{{ formatDuration(selectedTrack.duration) }}</span>
                <span>·</span>
                <span>{{ formatTrackGenresDisplay(selectedTrack) }}</span>
              </div>
            </section>

            <section class="grid gap-4 lg:grid-cols-2">
              <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-2">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Thông tin chung</div>
                <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div
                    v-for="item in selectedTrackAttributeItems"
                    :key="`${selectedTrack.id}-${item.label}`"
                    class="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {{ item.label }}
                    </div>
                    <div
                      class="mt-2 break-words text-sm font-medium text-slate-700 dark:text-slate-200"
                      :class="item.mono ? 'font-mono text-xs sm:text-sm' : ''"
                    >
                      {{ item.value }}
                    </div>
                  </div>
                </div>
              </article>

              <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Khuông nhạc (PDF)</div>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div>
                    {{ selectedTrack.sheetMusicPdfKey ? 'Đã có file PDF.' : 'Chưa upload file PDF.' }}
                  </div>
                  <button type="button" :class="secondaryButtonClass" :disabled="!selectedTrack.sheetMusicPdfKey" @click="openSheetMusicPdf(selectedTrack)">
                    Mở PDF
                  </button>
                </div>
              </article>

              <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Mô tả sản phẩm</div>
                <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ selectedTrack.description || 'Chưa có mô tả riêng cho sản phẩm.' }}
                </p>
              </article>
            </section>
          </div>

          <div v-else-if="detailActiveTab === 'licensing'" class="space-y-4">
            <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quyền bán đã chọn</div>
                <button type="button" :class="secondaryButtonClass" @click="openApprovedPermissionsDialog(selectedTrack)">Chọn quyền bán</button>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span
                  v-for="permission in selectedTrack.allowedPermissions"
                  :key="`${selectedTrack.id}-detail-allowed-${permission.name}-${permission.lawReference}`"
                  class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                >
                  {{ permission.name }}
                </span>
                <span v-if="selectedTrack.allowedPermissions.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Chưa chọn quyền bán cho sản phẩm.</span>
              </div>
            </article>

            <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Matching Digital / Physical Rights</div>
                </div>
              </div>

              <div v-if="!hasSelectedTrackEligibility" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                Chưa có cấu hình digital hoặc physical nào đang `ACTIVE` để hệ thống đối chiếu.
              </div>

              <div v-else class="mt-4 grid gap-4 lg:grid-cols-2">
                <section class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Digital Platform Rights</div>
                    <div class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                      {{ selectedTrack.licensingEligibility.summary.eligibleDigitalCount }}/{{ getEligibilityTotal(selectedTrack, 'digital') }} đủ điều kiện
                    </div>
                  </div>

                  <div v-if="selectedTrack.licensingEligibility.digitalConfigs.length === 0" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Chưa có gói quyền số nào đang `ACTIVE`.
                  </div>

                  <div v-else class="mt-3 space-y-3">
                    <article
                      v-for="config in selectedTrack.licensingEligibility.digitalConfigs"
                      :key="`${selectedTrack.id}-digital-${config.configId}`"
                      class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="font-semibold text-slate-900 dark:text-white">{{ config.title }}</div>
                          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {{ config.referencedPermissions.length }} quyền tham chiếu
                          </div>
                        </div>
                        <div class="flex flex-wrap justify-end gap-2">
                          <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" :class="getEligibilityStatusClass(config.status)">
                            {{ formatEligibilityStatusLabel(config.status) }}
                          </span>
                          <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" :class="getRegistrationStatusClass(config)">
                            {{ getRegistrationStatusLabel(config) }}
                          </span>
                        </div>
                      </div>

                      <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3 text-xs text-rose-700 dark:text-rose-300">
                        Thiếu quyền: {{ getEligibilityMissingSummary(config) }}
                      </div>

                      <div class="mt-3 flex justify-end">
                        <button
                          type="button"
                          :class="config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass"
                          :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack!.id, config.configId)"
                          @click="submitPackageRegistration(selectedTrack!, config)"
                        >
                          {{ isConfigJoined(config) ? 'Gỡ khỏi gói' : 'Đăng ký tham gia' }}
                        </button>
                      </div>
                    </article>
                  </div>
                </section>

                <section class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Physical Usage Rights</div>
                    <div class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                      {{ selectedTrack.licensingEligibility.summary.eligiblePhysicalCount }}/{{ getEligibilityTotal(selectedTrack, 'physical') }} đủ điều kiện
                    </div>
                  </div>

                  <div v-if="selectedTrack.licensingEligibility.physicalConfigs.length === 0" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Chưa có cấu hình quyền vật lý nào đang `ACTIVE`.
                  </div>

                  <div v-else class="mt-3 space-y-3">
                    <article
                      v-for="config in selectedTrack.licensingEligibility.physicalConfigs"
                      :key="`${selectedTrack.id}-physical-${config.configId}`"
                      class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="font-semibold text-slate-900 dark:text-white">{{ config.title }}</div>
                          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {{ config.referencedPermissions.length }} quyền tham chiếu
                          </div>
                        </div>
                        <div class="flex flex-wrap justify-end gap-2">
                          <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" :class="getEligibilityStatusClass(config.status)">
                            {{ formatEligibilityStatusLabel(config.status) }}
                          </span>
                          <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" :class="getRegistrationStatusClass(config)">
                            {{ getRegistrationStatusLabel(config) }}
                          </span>
                        </div>
                      </div>

                      <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3 text-xs text-rose-700 dark:text-rose-300">
                        Thiếu quyền: {{ getEligibilityMissingSummary(config) }}
                      </div>

                      <div class="mt-3 flex justify-end">
                        <button
                          type="button"
                          :class="config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass"
                          :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack!.id, config.configId)"
                          @click="submitPackageRegistration(selectedTrack!, config)"
                        >
                          {{ isConfigJoined(config) ? 'Gỡ khỏi gói' : 'Đăng ký tham gia' }}
                        </button>
                      </div>
                    </article>
                  </div>
                </section>
              </div>

              <article
                v-if="selectedTrack && (selectedTrack.digitalPackageRegistrations.length > 0 || selectedTrack.physicalPackageRegistrations.length > 0)"
                class="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Lịch sử đăng ký gói</div>
                <div class="mt-3 space-y-3">
                  <article
                    v-for="registration in [...selectedTrack.digitalPackageRegistrations, ...selectedTrack.physicalPackageRegistrations]"
                    :key="registration.registrationId"
                    class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div class="font-semibold text-slate-900 dark:text-white">{{ registration.title }}</div>
                        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {{ registration.configType === 'DIGITAL' ? 'Digital package' : 'Physical package' }} · {{ registration.configStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng' }}
                        </div>
                      </div>
                      <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" :class="registration.registrationStatus === 'JOINED' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'">
                        {{ registration.registrationStatus === 'JOINED' ? 'Đã đăng ký' : 'Đã gỡ' }}
                      </span>
                    </div>
                  </article>
                </div>
              </article>
            </article>
          </div>

          <div v-else class="space-y-4">
            <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Trạng thái pháp lý</div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span
                  class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                  :class="getProductComplianceLegalStatusClassSafe(selectedTrack.complianceLegalStatus)"
                >
                  Legal: {{ formatComplianceLegalStatusLabel(selectedTrack.complianceLegalStatus) }}
                </span>
                <span
                  class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                  :class="getProductComplianceReviewStatusClassSafe(selectedTrack.complianceReviewStatus)"
                >
                  Review: {{ formatProductComplianceReviewStatusLabelSafe(selectedTrack.complianceReviewStatus) }}
                </span>
              </div>
              <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                Mở dashboard Compliance để xem hồ sơ, tài liệu và thực hiện duyệt theo workflow chuẩn của nền tảng.
              </div>
              <div class="mt-4 flex justify-end">
                <button type="button" :class="primaryButtonClass" @click="openComplianceDashboard(selectedTrack)">Mở Compliance</button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="detailDialogVisible = false">Đóng</button>
          <button v-if="selectedTrack" type="button" :class="secondaryButtonClass" @click="openEditDialog(selectedTrack)">Chỉnh sửa</button>
          <button v-if="selectedTrack" type="button" :class="primaryButtonClass" @click="openUploadDialog(selectedTrack)">Tải audio gốc</button>
        </div>
      </template>
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
      class="w-[calc(100vw-1rem)] sm:w-[min(860px,96vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-8rem)] overflow-y-auto' } }"
    >
      <template #header>
        <div class="w-full" v-if="approvedPermissionsTrack">
          <div class="text-lg font-semibold text-slate-950 dark:text-white">Chọn quyền bán theo hồ sơ Pháp lý</div>
          <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tinh chỉnh subset quyền bán cuối cùng cho <span class="font-semibold text-slate-700 dark:text-slate-200">{{ approvedPermissionsTrack.title }}</span>.
          </div>
        </div>
      </template>

      <div class="space-y-5">
        <section
          v-if="approvedPermissionsTrack"
          class="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(245,243,255,0.92))] p-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,27,75,0.88))]"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="font-semibold text-slate-950 dark:text-white">{{ approvedPermissionsTrack.title }}</div>
              <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Chọn quyền bán trong đúng tập được Pháp lý cấp cho sản phẩm này.
              </div>
            </div>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="approvedPermissionsTrack.status === 'PUBLISHED'
              ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300'
              : approvedPermissionsTrack.status === 'HIDDEN'
                ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'"
            >
              {{ formatProductStatusLabel(approvedPermissionsTrack.status) }}
            </span>
          </div>
        </section>

        <section class="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Trạng thái hồ sơ Pháp lý</div>

          <div v-if="approvedPermissionsLoading" class="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
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

            <div v-if="!canChooseAllowedPermissions" class="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Chỉ có thể chọn quyền bán khi hồ sơ đang ở trạng thái `SUFFICIENT` và `APPROVED`.
            </div>

            <div v-else-if="approvedPermissionOptions.length === 0" class="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Hồ sơ đã đủ điều kiện nhưng hiện chưa có quyền nào trong tập `Approved permissions`.
            </div>

            <div v-else class="grid gap-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Approved permissions do Pháp lý cấp</div>
                  <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Chọn trực tiếp các quyền bán bạn muốn áp dụng cho Product.
                  </div>
                </div>
                <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {{ selectedApprovedPermissionCount }}/{{ approvedPermissionOptions.length }} đã chọn
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="permission in approvedPermissionOptions"
                  :key="`${approvedPermissionsTrack?.id ?? 'track'}-${permission.id}`"
                  type="button"
                  class="rounded-[24px] border px-4 py-4 text-left text-sm transition"
                  :class="selectedAllowedPermissionIds.includes(permission.id)
                    ? 'border-violet-300 bg-violet-100 text-violet-700 shadow-sm dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-500/30 dark:hover:bg-slate-900/70'"
                  :disabled="approvedPermissionsSaving"
                  @click="toggleAllowedPermissionSelection(permission.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate font-semibold">{{ permission.name }}</div>
                      <div class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</div>
                    </div>
                    <div
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs"
                      :class="selectedAllowedPermissionIds.includes(permission.id)
                        ? 'border-violet-300 bg-white/80 text-violet-600 dark:border-violet-400/50 dark:bg-violet-500/10 dark:text-violet-200'
                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'"
                    >
                      <i :class="selectedAllowedPermissionIds.includes(permission.id) ? 'pi pi-check' : 'pi pi-plus'" />
                    </div>
                  </div>
                  <div class="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]" :class="selectedAllowedPermissionIds.includes(permission.id) ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500'">
                    {{ formatApprovedPermissionSelectionState(selectedAllowedPermissionIds.includes(permission.id)) }}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="approvedPermissionsDialogVisible = false">Đóng</button>
          <button type="button" :class="primaryButtonClass" :disabled="!canSaveAllowedPermissions" @click="confirmSaveAllowedPermissions">
            Lưu quyền bán
          </button>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="uploadDialogVisible"
      modal
      class="w-[calc(100vw-1rem)] sm:w-[min(720px,92vw)]"
      header="Tải audio gốc"
      :pt="{ content: { class: 'max-h-[calc(100svh-10rem)] overflow-y-auto' } }"
    >
      <div class="space-y-4">
        <label class="block space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tệp</span>
          <input type="file" accept=".mp3,audio/*" :class="fileInputClass" :disabled="uploadStatus === 'requesting' || uploadStatus === 'uploading'" @change="onUploadFileChange" />
          <span class="text-sm text-slate-500 dark:text-slate-400">File key sẽ được cấp tự động dạng `N.mp3` sau khi bấm tải lên.</span>
        </label>

        <div class="flex flex-wrap items-center gap-2">
          <span v-if="uploadFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{{ uploadFile.name }}</span>
          <span
            v-if="uploadStatus !== 'idle'"
            class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
            :class="uploadStatus === 'done'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              : uploadStatus === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          >
            {{ formatUploadStatusLabel(uploadStatus) }}
          </span>
        </div>

        <Message v-if="uploadError" severity="error">{{ uploadError }}</Message>
        <Message v-if="uploadStatus === 'done'" severity="success">Tải file lên thành công</Message>

        <div v-if="uploadResult" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <strong class="text-slate-900 dark:text-white">File key:</strong> {{ uploadResult.fileKey }}
        </div>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="uploadDialogVisible = false">Đóng</button>
          <button type="button" :class="secondaryButtonClass" :disabled="uploadStatus === 'requesting' || uploadStatus === 'uploading'" @click="applyDemoAudioKey">
            Dùng 1.mp3
          </button>
          <button type="button" :class="primaryButtonClass" :disabled="!uploadFile || uploadStatus === 'requesting' || uploadStatus === 'uploading'" @click="submitUpload">
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
