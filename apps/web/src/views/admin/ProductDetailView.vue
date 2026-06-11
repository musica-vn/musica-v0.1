<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiClientError } from '../../api/axios'
import { useAppNotifications } from '../../composables/useAppNotifications'
import { listManagedUsers } from '../../services/managed-users.service'
import type { ManagedUser } from '../../types/managed-users.types'
import type {
  Product,
  ProductLicensingEligibilityConfig,
  ProductPlatformKey,
  ProductPlatformSettings,
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
import type { ComplianceDetail } from '../../types/compliance.types'
import { getAdminComplianceDetail } from '../../services/compliance.service'
import {
  confirmAdminProductAudioUpload,
  confirmAdminProductSheetMusicUpload,
  confirmAdminProductThumbnailUpload,
  createAdminDigitalRightRegistration,
  createAdminPhysicalRightRegistration,
  getAdminProduct,
  getAdminProductPlatformSettings,
  getOriginalPlaybackUrl,
  getOriginalUploadUrl,
  getProductThumbnailUrl,
  getSheetMusicUploadUrl,
  getSheetMusicUrl,
  getThumbnailUploadUrl,
  hideAdminProduct,
  publishAdminProduct,
  removeAdminDigitalRightRegistration,
  removeAdminPhysicalRightRegistration,
  replaceAdminProductAllowedPermissions,
  updateAdminProduct,
  updateAdminProductPlatformSettings,
} from '../../services/products.service'
import ProductWavePreview from '../../components/features/products/ProductWavePreview.vue'
import AdminProductUpsertDialog from '../../components/features/products/AdminProductUpsertDialog.vue'
import ProductWorkspaceSidebar from '../../components/features/products/detail/ProductWorkspaceSidebar.vue'

type ProductForm = {
  title: string
  artistId: string
  genres: ProductGenre[]
  useCases: ProductUseCase[]
  description: string
  duration: string
}

type ArtistOption = {
  value: string
  label: string
  email: string
}

type ApprovedPermissionOption = {
  id: string
  name: string
  lawReference: string
}

type TrackAttributeItem = {
  label: string
  value: string
  mono?: boolean
}

type ProductDetailSectionKey = 'general' | 'rights-license' | 'platforms'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const notifications = useAppNotifications()

const fieldClass =
  'h-12 w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const fileInputClass =
  'block w-full text-sm text-[color:var(--admin-text-muted)] file:mr-4 file:rounded-2xl file:border-0 file:bg-[color:var(--admin-primary-50)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[color:var(--admin-text)] hover:file:bg-[color:var(--admin-surface-2)]'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:cursor-not-allowed disabled:opacity-60'
const metadataButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border bg-[color:var(--admin-accent-50)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-800)] transition [border-color:rgb(var(--admin-primary-rgb)/0.18)] hover:bg-[linear-gradient(135deg,var(--admin-accent-50),var(--admin-primary-100))] hover:text-[color:var(--admin-primary-900)] disabled:cursor-not-allowed disabled:opacity-60'

const selectedTrack = ref<Product | null>(null)
const isLoading = ref(false)
const isArtistsLoading = ref(false)
const hasLoadedArtists = ref(false)
const artistOptions = ref<ArtistOption[]>([])

const editDialogVisible = ref(false)
const editDialogErrorMessage = ref<string | null>(null)
const editForm = reactive<ProductForm>({
  title: '',
  artistId: '',
  genres: [],
  useCases: [],
  description: '',
  duration: '',
})
const editOriginalFile = ref<File | null>(null)
const editSheetMusicFile = ref<File | null>(null)
const editThumbnailFile = ref<File | null>(null)
const editThumbnailUrl = ref<string | null>(null)

const uploadDialogVisible = ref(false)
const uploadStatus = ref<'idle' | 'requesting' | 'uploading' | 'done' | 'error'>('idle')
const uploadFile = ref<File | null>(null)
const uploadError = ref<string | null>(null)
const uploadResult = ref<{ uploadUrl: string; fileKey: string } | null>(null)

const approvedPermissionsDialogVisible = ref(false)
const approvedPermissionsTrack = ref<Product | null>(null)
const approvedPermissionsDetail = ref<ComplianceDetail | null>(null)
const approvedPermissionsLoading = ref(false)
const approvedPermissionsSaving = ref(false)
const selectedAllowedPermissionIds = ref<string[]>([])

const thumbnailUrls = ref<Record<string, string>>({})
const thumbnailLoading = ref<Record<string, boolean>>({})
const originalAudioUrls = ref<Record<string, string>>({})
const originalAudioLoading = ref<Record<string, boolean>>({})
const packageActionTarget = ref<string | null>(null)
const productPlatformSettings = ref<ProductPlatformSettings | null>(null)
const productPlatformLoading = ref(false)
const productPlatformSaving = ref(false)
const productPlatformError = ref<string | null>(null)
const selectedPlatformKey = ref<ProductPlatformKey>('YOUTUBE')
const selectedPlatformConfigId = ref<string | null>(null)
const selectedPlatformPricingMode = ref<'GLOBAL' | 'CUSTOM'>('GLOBAL')
const customPlatformMultiplier = ref('')

const validSections: ProductDetailSectionKey[] = ['general', 'rights-license', 'platforms']
const productId = computed(() => (typeof route.params.productId === 'string' ? route.params.productId : ''))
const activeSection = computed<ProductDetailSectionKey>(() => {
  const section = route.params.section
  if (typeof section === 'string' && validSections.includes(section as ProductDetailSectionKey)) {
    return section as ProductDetailSectionKey
  }
  return 'general'
})

const backToListQuery = computed(() => {
  const keys = ['page', 'pageSize', 'keyword', 'sort', 'status', 'genre'] as const
  return keys.reduce<Record<string, string>>((result, key) => {
    const rawValue = route.query[key]
    if (typeof rawValue === 'string' && rawValue.length > 0) {
      result[key] = rawValue
    }
    return result
  }, {})
})

const selectedTrackAttributeItems = computed<TrackAttributeItem[]>(() => {
  if (!selectedTrack.value) return []
  const track = selectedTrack.value

  return [
    { label: 'Thời lượng', value: formatDuration(track.duration) },
    { label: 'Use-case', value: formatTrackUseCasesDisplay(track) },
    { label: 'Mã sản phẩm', value: track.id, mono: true },
  ]
})

const selectedPlatformGroup = computed(() =>
  productPlatformSettings.value?.supportedPlatforms.find(
    (platform) => platform.platformKey === selectedPlatformKey.value,
  ) ?? null,
)

const selectedSystemPlatformConfig = computed(() =>
  selectedPlatformGroup.value?.availableConfigs.find(
    (config) => config.digitalRightConfigId === selectedPlatformConfigId.value,
  ) ?? null,
)

const editDurationDisplay = computed(() => {
  const parsed = parseDuration(editForm.duration)
  return parsed === undefined ? null : formatDuration(Math.max(0, Math.round(parsed)))
})

const hasSelectedTrackEligibility = computed(() => {
  if (!selectedTrack.value) return false
  return (
    getEligibilityTotal(selectedTrack.value, 'digital') > 0 ||
    getEligibilityTotal(selectedTrack.value, 'physical') > 0
  )
})

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

const navigateToSection = (section: ProductDetailSectionKey) => {
  if (!productId.value) return
  void router.push({
    path: `/products/${productId.value}/${section}`,
    query: route.query,
  })
}

const goBackToList = () => {
  void router.push({
    path: '/admin/products',
    query: backToListQuery.value,
  })
}

const formatDuration = (duration: number | null) => {
  if (typeof duration !== 'number' || Number.isNaN(duration)) return 'Chưa có'
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const formatPlatformDurationTypeLabel = (value: 'ONE_YEAR' | 'PERPETUAL') =>
  value === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'

const formatMultiplier = (value: number) => Number(value).toFixed(4).replace(/\.?0+$/, '')

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const parseDuration = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

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

const getOriginalAudioFileLabel = (track: Product) => {
  if (!track.originalAudioKey) return 'Chưa có file âm thanh gốc'

  const parts = track.originalAudioKey.split('/')
  return parts[parts.length - 1] ?? track.originalAudioKey
}

const getEligibilityTotal = (track: Product, type: 'digital' | 'physical') =>
  type === 'digital'
    ? track.licensingEligibility.summary.eligibleDigitalCount + track.licensingEligibility.summary.ineligibleDigitalCount
    : track.licensingEligibility.summary.eligiblePhysicalCount + track.licensingEligibility.summary.ineligiblePhysicalCount

const formatEligibilityStatusLabel = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Không đủ điều kiện'

const getEligibilityStatusClass = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE'
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border border-rose-200 bg-rose-50 text-rose-800'

const getEligibilitySectionClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-[24px] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(14,165,233,0.07),var(--admin-surface-1))] p-4'
    : 'rounded-[24px] border border-violet-200/80 bg-[linear-gradient(180deg,rgba(139,92,246,0.07),var(--admin-surface-1))] p-4'

const getEligibilitySectionIconClass = (type: 'digital' | 'physical') =>
  type === 'digital' ? 'text-sky-700' : 'text-violet-700'

const getEligibilitySectionCountClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800'
    : 'rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800'

const getEligibilityConfigCardClass = (type: 'digital' | 'physical') =>
  type === 'digital'
    ? 'rounded-2xl border border-sky-100 bg-[color:var(--admin-surface-0)] p-4'
    : 'rounded-2xl border border-violet-100 bg-[color:var(--admin-surface-0)] p-4'

const isConfigJoined = (config: ProductLicensingEligibilityConfig) => config.registrationStatus === 'JOINED'
const getRegistrationStatusLabel = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config) ? 'Đã đăng ký' : 'Chưa đăng ký'

const getRegistrationStatusClass = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config)
    ? 'border border-sky-200 bg-sky-50 text-sky-800'
    : 'border border-slate-200 bg-slate-50 text-slate-700'

const getRegistrationStatusTextClass = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config) ? 'text-sky-700' : 'text-[color:var(--admin-text)]'

const getVisibleAllowedPermissions = (track: Product) =>
  track.allowedPermissions.slice(0, 3)

const getHiddenAllowedPermissionCount = (track: Product) =>
  Math.max(0, track.allowedPermissions.length - 3)

const getMissingPermissionsToggleLabel = (config: ProductLicensingEligibilityConfig) =>
  `Thiếu ${config.missingPermissions.length} quyền tham chiếu`

const getPackageActionLabel = (config: ProductLicensingEligibilityConfig) =>
  isConfigJoined(config) ? 'Gỡ khỏi gói' : 'Đăng ký tham gia'

const getPackageActionHint = (config: ProductLicensingEligibilityConfig) => {
  if (config.status === 'ELIGIBLE') {
    return isConfigJoined(config)
      ? 'Sản phẩm đang nằm trong gói này.'
      : 'Sản phẩm đã đủ điều kiện để tham gia gói.'
  }

  if (config.missingPermissions.length > 0) {
    return `Cần bổ sung ${config.missingPermissions.length} quyền trước khi đăng ký.`
  }

  return 'Cấu hình này hiện chưa sẵn sàng để đăng ký.'
}

const getMissingPermissionsSummaryClass = () =>
  'inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-900'

const getMissingPermissionItemClass = () =>
  'rounded-2xl border border-amber-200/80 bg-[color:var(--admin-surface-0)] px-3 py-3 text-sm text-[color:var(--admin-text)]'

const getPackageActionKey = (trackId: string, configId: string) => `${trackId}:${configId}`
const isPackageActionLoading = (trackId: string, configId: string) =>
  packageActionTarget.value === getPackageActionKey(trackId, configId)

const formatUploadStatusLabel = (value: 'idle' | 'requesting' | 'uploading' | 'done' | 'error') => {
  if (value === 'requesting') return 'Đang xin URL'
  if (value === 'uploading') return 'Đang tải lên'
  if (value === 'done') return 'Hoàn tất'
  if (value === 'error') return 'Thất bại'
  return 'Chưa bắt đầu'
}

const formatArtistOptionLabel = (artist: ManagedUser) => `${artist.fullName} · ${artist.email}`
const ARTIST_OPTIONS_PAGE_SIZE = 100

const resolveArtistDisplay = (track: Product) => track.authorName ?? track.artistId

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
      return 'Có quyền bán không nằm trong Approved permissions của hồ sơ Pháp lý'
    }

    const detailValue =
      typeof error.details === 'object' &&
      error.details !== null &&
      'message' in error.details
        ? (error.details as { message?: unknown }).message
        : null

    if (typeof detailValue === 'string') return detailValue
    if (Array.isArray(detailValue)) {
      const messages = detailValue.filter((item): item is string => typeof item === 'string')
      if (messages.length > 0) return messages.join(', ')
    }

    return `${error.code}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  return 'Đã xảy ra lỗi không xác định'
}

const setError = (error: unknown) => {
  notifications.error(resolveErrorMessage(error))
}

const notifySuccess = (message: string) => {
  notifications.success(message)
}

const setEditDialogError = (error: unknown) => {
  editDialogErrorMessage.value = resolveErrorMessage(error)
}

const clearMessages = () => {
  // Global notifications auto-dismiss, so no per-page reset is needed here.
}

const clearEditDialogError = () => {
  editDialogErrorMessage.value = null
}

const revokeObjectUrl = (url: string | null) => {
  if (url) URL.revokeObjectURL(url)
}

const getFileExtension = (file: File): string | null => {
  const parts = file.name.split('.')
  if (parts.length < 2) return null
  const extension = parts.at(-1)?.trim().toLowerCase()
  return extension && extension.length > 0 ? extension : null
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

const ensureThumbnailFile = (file: File, label: string): ProductThumbnailExtension => {
  const extension = getFileExtension(file)
  const allowed: ProductThumbnailExtension[] = ['png', 'jpg', 'jpeg', 'webp']
  const normalized = (extension ?? (file.type.split('/')[1] ?? '')).toLowerCase()
  if (allowed.includes(normalized as ProductThumbnailExtension)) {
    return normalized as ProductThumbnailExtension
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

const isAllowedGenreValue = (value: string): value is ProductGenre =>
  PRODUCT_GENRE_OPTIONS.some((option) => option.value === value)

const isAllowedUseCaseValue = (value: string): value is ProductUseCase =>
  PRODUCT_USE_CASE_OPTIONS.some((option) => option.value === value)

const normalizeGenreValues = (values: Array<string | null | undefined>): ProductGenre[] =>
  values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).filter(isAllowedGenreValue)

const normalizeUseCaseValues = (values: Array<string | null | undefined>): ProductUseCase[] =>
  values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).filter(isAllowedUseCaseValue)

const validateTrackForm = () => {
  if (!selectedTrack.value) return 'Không tìm thấy sản phẩm để cập nhật'
  if (editForm.title.trim().length === 0) return 'Tên track là bắt buộc'
  if (editForm.artistId.trim().length === 0) return 'Vui lòng chọn nghệ sĩ'
  if (!editThumbnailFile.value && !selectedTrack.value.thumbnailKey) return 'Cần có thumbnail trước khi lưu track'
  return null
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

const fetchProductDetail = async () => {
  if (!productId.value) return

  clearMessages()
  isLoading.value = true
  try {
    const { data } = await getAdminProduct(productId.value)
    selectedTrack.value = data
    void ensureThumbnailUrl(data)
    void ensureOriginalAudioUrl(data)
  } catch (error) {
    setError(error)
    selectedTrack.value = null
  } finally {
    isLoading.value = false
  }
}

const hydrateProductPlatformEditor = (settings: ProductPlatformSettings | null) => {
  const activeGroup = settings?.supportedPlatforms.find(
    (platform) => platform.platformKey === selectedPlatformKey.value,
  ) ?? null

  selectedPlatformConfigId.value = activeGroup?.selectedDigitalRightConfigId ?? null
  selectedPlatformPricingMode.value = activeGroup?.pricingMode ?? 'GLOBAL'
  customPlatformMultiplier.value =
    activeGroup?.customPriceMultiplier === null || activeGroup?.customPriceMultiplier === undefined
      ? ''
      : String(activeGroup.customPriceMultiplier)
}

const loadProductPlatformSettings = async () => {
  if (!productId.value) return

  productPlatformLoading.value = true
  productPlatformError.value = null

  try {
    const { data } = await getAdminProductPlatformSettings(productId.value)
    productPlatformSettings.value = data
    hydrateProductPlatformEditor(data)
  } catch (error) {
    productPlatformError.value = resolveErrorMessage(error)
  } finally {
    productPlatformLoading.value = false
  }
}

const resetPlatformEditor = () => {
  hydrateProductPlatformEditor(productPlatformSettings.value)
}

const saveProductPlatformSettings = async () => {
  if (!productId.value || !selectedPlatformGroup.value) return

  if (!selectedPlatformConfigId.value) {
    productPlatformError.value = 'Bạn cần chọn một cấu hình hệ thống cho bài hát trước khi lưu'
    return
  }

  let normalizedCustomMultiplier: number | null = null
  if (selectedPlatformPricingMode.value === 'CUSTOM') {
    const parsedValue = Number(customPlatformMultiplier.value)
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      productPlatformError.value = 'Hệ số giá riêng phải là số lớn hơn 0'
      return
    }
    normalizedCustomMultiplier = parsedValue
  }

  productPlatformSaving.value = true
  productPlatformError.value = null
  clearMessages()

  try {
    const { data } = await updateAdminProductPlatformSettings(productId.value, {
      platformKey: selectedPlatformKey.value,
      selectedDigitalRightConfigId: selectedPlatformConfigId.value,
      pricingMode: selectedPlatformPricingMode.value,
      customPriceMultiplier: normalizedCustomMultiplier,
    })
    productPlatformSettings.value = data
    hydrateProductPlatformEditor(data)
    notifySuccess('Đã lưu cấu hình nền tảng số của sản phẩm')
  } catch (error) {
    productPlatformError.value = resolveErrorMessage(error)
  } finally {
    productPlatformSaving.value = false
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

const openComplianceDashboard = (track: Product) => {
  void router.push({ path: '/admin/compliance', query: { keyword: track.title } })
}

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

const openEditDialog = () => {
  if (!selectedTrack.value) return
  clearMessages()
  clearEditDialogError()
  resetEditForm(selectedTrack.value)
  if (!hasLoadedArtists.value && !isArtistsLoading.value) {
    void fetchArtistOptions()
  }
  editDialogVisible.value = true
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
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  const nextOriginalUrls = { ...originalAudioUrls.value }
  delete nextOriginalUrls[trackId]
  originalAudioUrls.value = nextOriginalUrls
  return confirmed.data
}

const uploadTrackThumbnailFile = async (trackId: string, file: File) => {
  const extension = ensureThumbnailFile(file, 'Thumbnail')
  const { data } = await getThumbnailUploadUrl(trackId, { extension })
  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminProductThumbnailUpload(trackId, { fileKey: data.fileKey })
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  const nextThumbnailUrls = { ...thumbnailUrls.value }
  delete nextThumbnailUrls[trackId]
  thumbnailUrls.value = nextThumbnailUrls
  return confirmed.data
}

const uploadTrackSheetMusicFile = async (trackId: string, file: File) => {
  ensurePdfFile(file, 'Khuông nhạc')
  const { data } = await getSheetMusicUploadUrl(trackId)
  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminProductSheetMusicUpload(trackId, { fileKey: data.fileKey })
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  return confirmed.data
}

const submitEdit = async () => {
  if (!selectedTrack.value) return

  clearEditDialogError()
  const validationError = validateTrackForm()
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

    selectedTrack.value = data

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
    notifySuccess('Đã cập nhật sản phẩm')
    await fetchProductDetail()
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
    message: `Lưu các thay đổi cho "${selectedTrack.value.title}"?`,
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
    const response = track.status === 'PUBLISHED'
      ? await hideAdminProduct(track.id)
      : await publishAdminProduct(track.id)
    selectedTrack.value = response.data
    notifySuccess(track.status === 'PUBLISHED' ? 'Đã ẩn sản phẩm' : 'Đã phát hành sản phẩm')
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const confirmTogglePublish = (track: Product) => {
  const isPublished = track.status === 'PUBLISHED'
  if (!isPublished && !track.thumbnailKey) {
    openEditDialog()
    editDialogErrorMessage.value = 'Cần upload thumbnail trước khi phát hành track'
    return
  }

  confirm.require({
    header: isPublished ? 'Xác nhận ẩn sản phẩm' : 'Xác nhận phát hành sản phẩm',
    message: isPublished
      ? `Bạn chắc chắn muốn ẩn "${track.title}"?`
      : `Bạn chắc chắn muốn phát hành "${track.title}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: isPublished ? 'Ẩn sản phẩm' : 'Phát hành',
    rejectLabel: 'Huỷ',
    accept: () => void togglePublishConfirmed(track),
  })
}

const openUploadDialog = () => {
  if (!selectedTrack.value) return
  clearMessages()
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
    const updated = await uploadTrackAudioFile(selectedTrack.value.id, uploadFile.value)
    selectedTrack.value = updated
    uploadStatus.value = 'done'
    uploadResult.value = { uploadUrl: '', fileKey: updated.originalAudioKey ?? '' }
    await fetchProductDetail()
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
    selectedTrack.value = confirmed.data
    const nextOriginalUrls = { ...originalAudioUrls.value }
    delete nextOriginalUrls[confirmed.data.id]
    originalAudioUrls.value = nextOriginalUrls
    uploadResult.value = { uploadUrl: '', fileKey: '1.mp3' }
    uploadStatus.value = 'done'
    await fetchProductDetail()
  } catch (error) {
    uploadStatus.value = 'error'
    uploadError.value = error instanceof Error ? error.message : 'Lỗi cập nhật audio'
  }
}

const openApprovedPermissionsDialog = () => {
  if (!selectedTrack.value) return

  approvedPermissionsTrack.value = selectedTrack.value
  approvedPermissionsDialogVisible.value = true
  approvedPermissionsDetail.value = null
  selectedAllowedPermissionIds.value = [...selectedTrack.value.allowedPermissionIds]
  approvedPermissionsLoading.value = true

  void getAdminComplianceDetail(selectedTrack.value.id)
    .then(({ data }) => {
      approvedPermissionsDetail.value = data
      const approvedPermissionIdSet = new Set(data.approvedPermissionIds.filter((item) => item.length > 0))
      selectedAllowedPermissionIds.value = selectedTrack.value
        ? selectedTrack.value.allowedPermissionIds.filter((item) => approvedPermissionIdSet.has(item))
        : []
    })
    .catch((error) => {
      setError(error)
    })
    .finally(() => {
      approvedPermissionsLoading.value = false
    })
}

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
    selectedTrack.value = data
    approvedPermissionsTrack.value = data
    selectedAllowedPermissionIds.value = [...data.allowedPermissionIds]
    notifySuccess('Đã cập nhật quyền bán của sản phẩm')
    await fetchProductDetail()
  } catch (error) {
    setError(error)
  } finally {
    approvedPermissionsSaving.value = false
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
        notifySuccess(`Đã gỡ sản phẩm khỏi gói ${config.title}`)
      } else {
        await createAdminDigitalRightRegistration(track.id, { configId: config.configId })
        notifySuccess(`Đã đăng ký sản phẩm vào gói ${config.title}`)
      }
    } else if (config.registrationStatus === 'JOINED' && config.registrationId) {
      await removeAdminPhysicalRightRegistration(track.id, config.registrationId)
      notifySuccess(`Đã gỡ sản phẩm khỏi gói ${config.title}`)
    } else {
      await createAdminPhysicalRightRegistration(track.id, { configId: config.configId })
      notifySuccess(`Đã đăng ký sản phẩm vào gói ${config.title}`)
    }

    await fetchProductDetail()
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

const handleEditThumbnailFileChange = (event: Event) => {
  clearEditDialogError()
  const file = extractEventFile(event)
  editThumbnailFile.value = file
  revokeObjectUrl(editThumbnailUrl.value)
  editThumbnailUrl.value = file ? URL.createObjectURL(file) : null
  if (!file) return

  try {
    ensureThumbnailFile(file, 'Thumbnail')
  } catch (error) {
    editThumbnailFile.value = null
    revokeObjectUrl(editThumbnailUrl.value)
    editThumbnailUrl.value = null
    setEditDialogError(error)
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

watch(
  () => [route.params.productId, route.params.section],
  ([nextProductId, nextSection]) => {
    const normalizedSection =
      typeof nextSection === 'string' && validSections.includes(nextSection as ProductDetailSectionKey)
        ? nextSection
        : 'general'

    if (typeof nextProductId === 'string' && nextProductId.length > 0 && nextSection !== normalizedSection) {
      void router.replace({
        path: `/products/${nextProductId}/${normalizedSection}`,
        query: route.query,
      })
    }
  },
  { immediate: true },
)

watch(
  () => productId.value,
  () => {
    productPlatformSettings.value = null
    productPlatformError.value = null
    selectedPlatformConfigId.value = null
    selectedPlatformPricingMode.value = 'GLOBAL'
    customPlatformMultiplier.value = ''
    void fetchProductDetail()
  },
  { immediate: true },
)

watch(
  () => selectedPlatformKey.value,
  () => {
    hydrateProductPlatformEditor(productPlatformSettings.value)
  },
)

watch(
  () => [activeSection.value, productId.value] as const,
  ([section, nextProductId]) => {
    if (section === 'platforms' && nextProductId.length > 0) {
      void loadProductPlatformSettings()
    }
  },
  { immediate: true },
)

onMounted(() => {
  void fetchArtistOptions()
})

onBeforeUnmount(() => {
  revokeObjectUrl(editThumbnailUrl.value)
})
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1560px] flex-col justify-center gap-4 px-4 py-8 sm:gap-5 sm:px-6 sm:py-10 lg:gap-6 lg:px-8 lg:py-12">
    <div v-if="selectedTrack" class="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <ProductWorkspaceSidebar
        :active-section="activeSection"
        @back="goBackToList"
        @navigate="navigateToSection"
      />

      <div class="min-w-0 space-y-5 lg:space-y-6">
        <section
          v-if="activeSection === 'general'"
          class="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]"
        >
          <div class="space-y-4">
            <article class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-5 [border-color:var(--admin-border)]">
              <div class="flex items-start gap-4">
                <div
                  class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[color:var(--admin-primary-600)] text-xl font-bold text-white"
                >
                  <img
                    v-if="thumbnailUrls[selectedTrack.id]"
                    :src="thumbnailUrls[selectedTrack.id]"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                  <i v-else class="pi pi-music text-lg" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2 text-sm text-[color:var(--admin-text-muted)]">
                        <button type="button" class="font-medium text-[color:var(--admin-text-muted)] transition hover:text-[color:var(--admin-text)]" @click="goBackToList">
                          Quản lý bài hát
                        </button>
                        <i class="pi pi-angle-right text-[10px]" />
                        <span class="truncate font-medium text-[color:var(--admin-text)]">{{ selectedTrack.title }}</span>
                      </div>

                      <h1 class="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-[color:var(--admin-text)] sm:text-[1.9rem]">
                        {{ selectedTrack.title }}
                      </h1>

                      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[color:var(--admin-text-muted)]">
                        <span class="font-medium text-[color:var(--admin-text)]">{{ selectedTrack.id }}</span>
                        <span class="text-[color:var(--admin-border)]">•</span>
                        <span>{{ formatTrackGenresDisplay(selectedTrack) }}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      :class="[metadataButtonClass, 'w-full lg:w-auto']"
                      :disabled="isLoading"
                      @click="openEditDialog"
                    >
                      <i class="pi pi-pencil" />
                      Chỉnh sửa metadata
                    </button>
                  </div>

                  <div class="mt-5 border-t pt-4 [border-color:var(--admin-border)]">
                    <div class="text-sm font-medium text-[color:var(--admin-text-muted)]">Trạng thái</div>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductStatusClass(selectedTrack.status)">
                        <span class="h-2 w-2 rounded-full bg-current opacity-70" />
                        {{ formatProductStatusLabel(selectedTrack.status) }}
                      </span>
                      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductComplianceLegalStatusClassSafe(selectedTrack.complianceLegalStatus)">
                        <span class="h-2 w-2 rounded-full bg-current opacity-70" />
                        {{ formatComplianceLegalStatusLabel(selectedTrack.complianceLegalStatus) }}
                      </span>
                      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductComplianceReviewStatusClassSafe(selectedTrack.complianceReviewStatus)">
                        <span class="h-2 w-2 rounded-full bg-current opacity-70" />
                        {{ formatProductComplianceReviewStatusLabelSafe(selectedTrack.complianceReviewStatus) }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button type="button" :class="[primaryButtonClass, 'gap-2 px-4 py-2.5']" :disabled="isLoading" @click="confirmTogglePublish(selectedTrack)">
                      <i :class="selectedTrack.status === 'PUBLISHED' ? 'pi pi-eye-slash' : 'pi pi-eye'" class="text-sm" />
                      {{ selectedTrack.status === 'PUBLISHED' ? 'Ẩn sản phẩm' : 'Phát hành sản phẩm' }}
                    </button>
                    <button type="button" :class="[secondaryButtonClass, 'gap-2 px-4 py-2.5']" @click="openUploadDialog">
                      <i class="pi pi-download text-sm" />
                      Tải bản gốc
                    </button>
                    <button type="button" :class="[secondaryButtonClass, 'gap-2 px-4 py-2.5']" :disabled="!selectedTrack.sheetMusicPdfKey" @click="openSheetMusicPdf(selectedTrack)">
                      <i class="pi pi-file-pdf text-sm" />
                      Mở PDF
                    </button>
                    <button type="button" :class="[secondaryButtonClass, 'gap-2 px-4 py-2.5']" @click="openComplianceDashboard(selectedTrack)">
                      <i class="pi pi-verified text-sm" />
                      Mở Compliance
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                Nghe thử
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span class="font-semibold text-[color:var(--admin-text)]">{{ getOriginalAudioFileLabel(selectedTrack) }}</span>
                <span class="text-[color:var(--admin-border)]">—</span>
                <span class="text-[color:var(--admin-text-muted)]">{{ formatDuration(selectedTrack.duration) }}</span>
              </div>
              <div class="mt-4 rounded-[20px] border bg-[color:var(--admin-surface-1)] px-4 py-4 [border-color:var(--admin-border)]">
                <ProductWavePreview
                  :audio-url="originalAudioUrls[selectedTrack.id] ?? null"
                  :disabled="!selectedTrack.originalAudioKey"
                  :track-status="selectedTrack.status"
                  :right-label="formatDuration(selectedTrack.duration)"
                />
              </div>
            </article>

            <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                Mô tả sản phẩm
              </div>
              <p class="mt-3 text-sm leading-7 text-[color:var(--admin-text)]">
                {{ selectedTrack.description || 'Chưa có mô tả riêng cho sản phẩm.' }}
              </p>
            </article>
          </div>

          <div class="space-y-4">
            <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
              <div class="flex items-start justify-between gap-3">
                <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                  Thông tin chi tiết
                </div>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)] transition hover:text-[color:var(--admin-text)] [border-color:var(--admin-border)]"
                  @click="openEditDialog"
                >
                  <i class="pi pi-ellipsis-h text-sm" />
                </button>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div
                  v-for="item in selectedTrackAttributeItems.slice(0, 2)"
                  :key="`${selectedTrack.id}-${item.label}`"
                  class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4"
                >
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                    {{ item.label }}
                  </div>
                  <div class="mt-2 break-words text-sm font-semibold text-[color:var(--admin-text)]" :class="item.mono ? 'font-mono text-xs sm:text-sm' : ''">
                    {{ item.value }}
                  </div>
                </div>
                <div
                  class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4 sm:col-span-2"
                >
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                    {{ selectedTrackAttributeItems[2]?.label }}
                  </div>
                  <div class="mt-2 break-all font-mono text-xs font-semibold text-[color:var(--admin-text)] sm:text-sm">
                    {{ selectedTrackAttributeItems[2]?.value }}
                  </div>
                </div>
              </div>
            </article>

            <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
              <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                Tài liệu đính kèm
              </div>
              <div class="mt-4 rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                <div class="text-base font-medium text-[color:var(--admin-text)]">
                  {{ selectedTrack.sheetMusicPdfKey ? 'Đã có file khuông nhạc.' : 'Chưa có file khuông nhạc.' }}
                </div>
                <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                  {{ selectedTrack.sheetMusicPdfKey ? 'File PDF có thể mở trực tiếp từ thao tác bên dưới.' : 'Bạn có thể upload file PDF từ nhóm thao tác này.' }}
                </div>
                <div class="mt-4">
                  <button
                    type="button"
                    :class="[secondaryButtonClass, 'gap-2 w-full justify-center']"
                    @click="openUploadDialog"
                  >
                    <i class="pi pi-upload text-sm" />
                    Upload file PDF
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeSection === 'rights-license'" class="space-y-5 sm:space-y-6">
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
                  Chọn tập quyền bán cuối cùng theo hồ sơ pháp lý của sản phẩm.
                </div>
              </div>

              <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button type="button" :class="[secondaryButtonClass, 'gap-2 w-full sm:w-auto']" @click="openComplianceDashboard(selectedTrack)">
                  <i class="pi pi-verified text-sm" />
                  Mở Compliance
                </button>
                <button type="button" :class="[secondaryButtonClass, 'gap-2 w-full sm:w-auto']" @click="openApprovedPermissionsDialog">
                  <i class="pi pi-sliders-h text-sm" />
                  Chọn quyền bán
                </button>
              </div>
            </div>

            <div
              v-if="selectedTrack.allowedPermissions.length === 0"
              class="mt-4 rounded-2xl border border-dashed bg-[color:var(--admin-surface-1)] px-4 py-4 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
            >
              Chưa chọn quyền bán cho sản phẩm. Nhấn “Chọn quyền bán” để bắt đầu.
            </div>
            <div v-else class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="permission in getVisibleAllowedPermissions(selectedTrack)"
                :key="`${selectedTrack.id}-detail-allowed-${permission.name}-${permission.lawReference}`"
                class="inline-flex items-center rounded-full border bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]"
              >
                {{ permission.name }}
              </span>
              <span
                v-if="getHiddenAllowedPermissionCount(selectedTrack) > 0"
                class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
              >
                +{{ getHiddenAllowedPermissionCount(selectedTrack) }} quyền khác
              </span>
            </div>
          </article>

          <article class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 sm:p-5 [border-color:var(--admin-border)]">
            <div class="flex flex-col gap-2">
              <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                Đối chiếu Digital / Physical Rights
              </div>
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

            <div v-else class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
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
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="text-base font-semibold text-[color:var(--admin-text)]">{{ config.title }}</div>
                        <div class="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          {{ config.referencedPermissions.length }} quyền tham chiếu
                        </div>
                      </div>
                      <div class="flex min-w-[136px] flex-col items-end gap-2">
                        <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold" :class="getEligibilityStatusClass(config.status)">
                          {{ formatEligibilityStatusLabel(config.status) }}
                        </span>
                        <span class="text-xs font-medium" :class="getRegistrationStatusTextClass(config)">
                          {{ getRegistrationStatusLabel(config) }}
                        </span>
                      </div>
                    </div>

                    <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3">
                      <details class="group">
                        <summary :class="getMissingPermissionsSummaryClass()" class="cursor-pointer list-none transition hover:-translate-y-0.5">
                          <i class="pi pi-exclamation-triangle text-[12px]" />
                          {{ getMissingPermissionsToggleLabel(config) }}
                          <span class="text-[color:var(--admin-text-muted)] group-open:hidden">Xem chi tiết</span>
                          <span class="hidden text-[color:var(--admin-text-muted)] group-open:inline">Thu gọn</span>
                        </summary>
                        <div class="mt-3 grid gap-3 sm:grid-cols-2">
                          <article
                            v-for="permission in config.missingPermissions"
                            :key="`${config.configId}-digital-missing-${permission.id}`"
                            :class="getMissingPermissionItemClass()"
                          >
                            <div class="flex items-start gap-3">
                              <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <i class="pi pi-shield text-sm" />
                              </span>
                              <div class="min-w-0">
                                <div class="font-semibold leading-5 text-[color:var(--admin-text)]">{{ permission.name }}</div>
                                <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</div>
                              </div>
                            </div>
                          </article>
                        </div>
                      </details>
                    </div>

                    <div class="mt-4 flex flex-col gap-3 border-t pt-4 [border-color:var(--admin-border)] sm:flex-row sm:items-end sm:justify-between">
                      <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Hành động
                        </div>
                        <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                          {{ getPackageActionHint(config) }}
                        </div>
                      </div>
                      <button
                        type="button"
                        :class="[(config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass), 'gap-2 w-full sm:w-auto']"
                        :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack.id, config.configId)"
                        @click="submitPackageRegistration(selectedTrack, config)"
                      >
                        <i :class="isConfigJoined(config) ? 'pi pi-times' : 'pi pi-plus'" class="text-sm" />
                        {{ getPackageActionLabel(config) }}
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
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="text-base font-semibold text-[color:var(--admin-text)]">{{ config.title }}</div>
                        <div class="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          {{ config.referencedPermissions.length }} quyền tham chiếu
                        </div>
                      </div>
                      <div class="flex min-w-[136px] flex-col items-end gap-2">
                        <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold" :class="getEligibilityStatusClass(config.status)">
                          {{ formatEligibilityStatusLabel(config.status) }}
                        </span>
                        <span class="text-xs font-medium" :class="getRegistrationStatusTextClass(config)">
                          {{ getRegistrationStatusLabel(config) }}
                        </span>
                      </div>
                    </div>

                    <div v-if="config.status === 'INELIGIBLE' && config.missingPermissions.length > 0" class="mt-3">
                      <details class="group">
                        <summary :class="getMissingPermissionsSummaryClass()" class="cursor-pointer list-none transition hover:-translate-y-0.5">
                          <i class="pi pi-exclamation-triangle text-[12px]" />
                          {{ getMissingPermissionsToggleLabel(config) }}
                          <span class="text-[color:var(--admin-text-muted)] group-open:hidden">Xem chi tiết</span>
                          <span class="hidden text-[color:var(--admin-text-muted)] group-open:inline">Thu gọn</span>
                        </summary>
                        <div class="mt-3 grid gap-3 sm:grid-cols-2">
                          <article
                            v-for="permission in config.missingPermissions"
                            :key="`${config.configId}-physical-missing-${permission.id}`"
                            :class="getMissingPermissionItemClass()"
                          >
                            <div class="flex items-start gap-3">
                              <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <i class="pi pi-shield text-sm" />
                              </span>
                              <div class="min-w-0">
                                <div class="font-semibold leading-5 text-[color:var(--admin-text)]">{{ permission.name }}</div>
                                <div class="mt-2 text-xs leading-5 text-[color:var(--admin-text-muted)]">{{ permission.lawReference }}</div>
                              </div>
                            </div>
                          </article>
                        </div>
                      </details>
                    </div>

                    <div class="mt-4 flex flex-col gap-3 border-t pt-4 [border-color:var(--admin-border)] sm:flex-row sm:items-end sm:justify-between">
                      <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Hành động
                        </div>
                        <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                          {{ getPackageActionHint(config) }}
                        </div>
                      </div>
                      <button
                        type="button"
                        :class="[(config.status === 'ELIGIBLE' ? primaryButtonClass : secondaryButtonClass), 'gap-2 w-full sm:w-auto']"
                        :disabled="config.status !== 'ELIGIBLE' || isPackageActionLoading(selectedTrack.id, config.configId)"
                        @click="submitPackageRegistration(selectedTrack, config)"
                      >
                        <i :class="isConfigJoined(config) ? 'pi pi-times' : 'pi pi-plus'" class="text-sm" />
                        {{ getPackageActionLabel(config) }}
                      </button>
                    </div>
                  </article>
                </div>
              </section>
            </div>

            <article
              v-if="selectedTrack.digitalPackageRegistrations.length > 0 || selectedTrack.physicalPackageRegistrations.length > 0"
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
                        {{ registration.configType === 'DIGITAL' ? 'Digital package' : 'Physical package' }} ·
                        {{ registration.configStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng' }}
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

        <section v-else class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-5 [border-color:var(--admin-border)]">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
                <i class="pi pi-desktop text-[12px] text-[color:var(--admin-primary-500)]" />
                Quản lý nền tảng số
              </div>
              <div class="mt-3 text-xl font-semibold text-[color:var(--admin-text)]">
                Cấu hình giá nền tảng riêng cho bài hát
              </div>
              <div class="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--admin-text-muted)]">
                Màn này dùng cùng mô hình với `Quản lý nền tảng số` ở trang chính, nhưng giá được lưu riêng cho bài hát hiện tại. Cấu hình hệ thống chỉ là chuẩn tham chiếu, còn tại đây bạn chỉnh hệ số giá áp dụng cho từng bài hát trên từng nền tảng và thời hạn.
              </div>
            </div>

            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="router.push('/admin/settings/digital-rights')">
                <i class="pi pi-external-link text-sm" />
                Xem cấu hình hệ thống
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
              <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                Nền tảng áp dụng
              </label>
              <div class="relative mt-3">
                <select v-model="selectedPlatformKey" :class="selectFieldClass" :disabled="productPlatformLoading || productPlatformSaving">
                  <option
                    v-for="platform in productPlatformSettings?.supportedPlatforms ?? [{ platformKey: 'YOUTUBE', platformLabel: 'YouTube', availableConfigs: [], selectedDigitalRightConfigId: null, pricingMode: 'GLOBAL', customPriceMultiplier: null, systemBaseMultiplier: null, effectiveMultiplier: null, updatedAt: null, updatedBy: null }]"
                    :key="platform.platformKey"
                    :value="platform.platformKey"
                  >
                    {{ platform.platformLabel }}
                  </option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--admin-text-muted)]" />
              </div>

              <div class="mt-4 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-4 [border-color:var(--admin-border)]">
                <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                  Cách dùng
                </div>
                <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                  Chọn 1 cấu hình giá từ hệ thống cho bài hát, sau đó quyết định dùng giá chung của hệ thống hoặc nhập giá riêng cho bài hát ở màn này.
                </div>
              </div>

              <div class="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  :class="[secondaryButtonClass, 'w-full']"
                  :disabled="productPlatformLoading || productPlatformSaving || !productPlatformSettings"
                  @click="resetPlatformEditor"
                >
                  Đặt lại
                </button>
                <button
                  type="button"
                  :class="[primaryButtonClass, 'w-full']"
                  :disabled="productPlatformLoading || productPlatformSaving || !selectedPlatformGroup || selectedPlatformGroup.availableConfigs.length === 0"
                  @click="saveProductPlatformSettings"
                >
                  {{ productPlatformSaving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình bài hát' }}
                </button>
              </div>
            </aside>

            <div class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                    Cấu hình áp dụng cho bài hát
                  </div>
                  <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
                    Chọn một cấu hình hệ thống của {{ selectedPlatformGroup?.platformLabel ?? 'nền tảng đã chọn' }} rồi quyết định dùng giá hệ thống hay cấu hình giá riêng.
                  </div>
                </div>
                <div class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                  Mỗi bài hát chỉ có một cấu hình áp dụng cho mỗi nền tảng
                </div>
              </div>

              <div class="mt-4 space-y-3">
                <Message v-if="productPlatformError" severity="error">{{ productPlatformError }}</Message>
                <Message v-if="productPlatformLoading" severity="info">Đang tải cấu hình nền tảng...</Message>
              </div>

              <div
                v-if="!productPlatformLoading && selectedPlatformGroup && selectedPlatformGroup.availableConfigs.length === 0"
                class="mt-4 rounded-2xl border border-dashed bg-[color:var(--admin-surface-1)] px-4 py-5 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
              >
                Chưa có cấu hình nền tảng số `ACTIVE` nào để gán giá riêng cho bài hát ở nền tảng này.
              </div>

              <div v-else-if="selectedPlatformGroup" class="mt-4 space-y-4">
                <article class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
                  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div class="space-y-4">
                      <div>
                        <div class="text-sm font-semibold text-[color:var(--admin-text)]">
                          Chọn cấu hình hệ thống cho bài hát
                        </div>
                        <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                          Cấu hình bạn chọn ở đây là cấu hình hệ thống được bài hát tham gia. Sau đó bạn có thể dùng nguyên giá chuẩn hoặc bật giá riêng cho bài hát này.
                        </div>
                      </div>

                      <label class="block">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Cấu hình hệ thống
                        </div>
                        <div class="relative mt-3">
                          <select
                            v-model="selectedPlatformConfigId"
                            :class="selectFieldClass"
                            :disabled="productPlatformLoading || productPlatformSaving"
                          >
                            <option :value="null">Chọn cấu hình hệ thống</option>
                            <option
                              v-for="config in selectedPlatformGroup.availableConfigs"
                              :key="config.digitalRightConfigId"
                              :value="config.digitalRightConfigId"
                            >
                              {{ config.title }}
                            </option>
                          </select>
                          <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--admin-text-muted)]" />
                        </div>
                      </label>

                      <div class="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          class="rounded-2xl border px-4 py-4 text-left transition"
                          :class="selectedPlatformPricingMode === 'GLOBAL'
                            ? 'border-[color:rgb(var(--admin-primary-rgb)/0.24)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-900)]'
                            : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)]'"
                          :disabled="productPlatformSaving"
                          @click="selectedPlatformPricingMode = 'GLOBAL'"
                        >
                          <div class="text-sm font-semibold">Dùng giá hệ thống</div>
                          <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                            Bài hát sẽ dùng đúng hệ số giá của cấu hình hệ thống đang chọn.
                          </div>
                        </button>

                        <button
                          type="button"
                          class="rounded-2xl border px-4 py-4 text-left transition"
                          :class="selectedPlatformPricingMode === 'CUSTOM'
                            ? 'border-[color:rgb(var(--admin-primary-rgb)/0.24)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-900)]'
                            : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)]'"
                          :disabled="productPlatformSaving"
                          @click="selectedPlatformPricingMode = 'CUSTOM'"
                        >
                          <div class="text-sm font-semibold">Dùng giá riêng cho bài hát</div>
                          <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                            Chỉ thay đổi hệ số giá của bài hát hiện tại, không ảnh hưởng cấu hình chung của hệ thống.
                          </div>
                        </button>
                      </div>

                      <label
                        class="block rounded-[22px] border bg-[color:var(--admin-surface-0)] px-4 py-4 [border-color:var(--admin-border)]"
                        :class="selectedPlatformPricingMode !== 'CUSTOM' ? 'opacity-60' : ''"
                      >
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Hệ số giá riêng của bài hát
                        </div>
                        <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                          Chỉ cần nhập khi bạn bật chế độ dùng giá riêng cho bài hát.
                        </div>
                        <input
                          v-model="customPlatformMultiplier"
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          :class="[fieldClass, 'mt-3 h-11']"
                          :disabled="productPlatformSaving || selectedPlatformPricingMode !== 'CUSTOM'"
                          placeholder="Ví dụ: 1.2500"
                        />
                      </label>
                    </div>

                    <div class="space-y-3 rounded-[22px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Cấu hình đang áp dụng
                      </div>

                      <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Cấu hình hệ thống đã chọn
                        </div>
                        <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                          {{ selectedSystemPlatformConfig?.title ?? 'Chưa chọn cấu hình' }}
                        </div>
                      </div>

                      <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Giá chuẩn hệ thống
                        </div>
                        <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                          {{ selectedSystemPlatformConfig ? formatMultiplier(selectedSystemPlatformConfig.globalBaseMultiplier) : 'Chưa có' }}
                        </div>
                      </div>

                      <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                          Giá đang áp dụng
                        </div>
                        <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                          {{
                            selectedPlatformPricingMode === 'CUSTOM' && customPlatformMultiplier
                              ? formatMultiplier(Number(customPlatformMultiplier))
                              : selectedPlatformGroup.effectiveMultiplier !== null
                                ? formatMultiplier(selectedPlatformGroup.effectiveMultiplier)
                                : 'Chưa có'
                          }}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-else-if="!isLoading"
      class="rounded-[28px] border border-dashed bg-[color:var(--admin-surface-0)] px-6 py-16 text-center text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
    >
      Không tìm thấy sản phẩm hoặc dữ liệu chi tiết không tải được.
    </div>

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
      v-model:visible="approvedPermissionsDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(860px,96vw)]"
      :pt="{
        content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' },
        footer: { class: 'border-t px-4 py-4 sm:px-6 [border-color:var(--admin-border)]' },
      }"
    >
      <template #header>
        <div v-if="approvedPermissionsTrack" class="w-full">
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">Chọn quyền bán theo hồ sơ pháp lý</div>
          <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
            Tinh chỉnh subset quyền bán cuối cùng cho
            <span class="font-semibold text-[color:var(--admin-text)]">{{ approvedPermissionsTrack.title }}</span>.
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
                Chọn quyền bán trong đúng tập được pháp lý cấp cho sản phẩm này.
              </div>
            </div>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductStatusClass(approvedPermissionsTrack.status)">
              {{ formatProductStatusLabel(approvedPermissionsTrack.status) }}
            </span>
          </div>
        </section>

        <section class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
          <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Trạng thái hồ sơ pháp lý</div>

          <div v-if="approvedPermissionsLoading" class="mt-3 rounded-2xl border bg-[color:var(--admin-surface-1)] px-4 py-4 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">
            Đang tải thông tin hồ sơ pháp lý...
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
                  <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Approved permissions do pháp lý cấp</div>
                  <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                    Chọn trực tiếp các quyền bán bạn muốn áp dụng cho product.
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
                    ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]'
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
                    ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]'
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
