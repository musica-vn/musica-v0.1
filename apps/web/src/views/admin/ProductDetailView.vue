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
  ProductPlatformPricingMode,
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
import {
  buildCompletePlatformPricingModifiers,
  resolvePlatformPricingModifierLabel,
  type PlatformPricingModifierValue,
} from '../../constants/platform-pricing'
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
import PlatformPricingModifierEditor from '../../components/features/platform-pricing/PlatformPricingModifierEditor.vue'

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
const selectedPlatformMode = ref<ProductPlatformPricingMode>('SYSTEM')
const editablePlatformModifiers = ref<PlatformPricingModifierValue[]>([])

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



const joinedPackageRegistrations = computed(() => {
  if (!selectedTrack.value) return []

  return [
    ...selectedTrack.value.digitalPackageRegistrations,
    ...selectedTrack.value.physicalPackageRegistrations,
  ].filter((registration) => registration.registrationStatus === 'JOINED')
})

const joinedPackageRegistrationPreview = computed(() =>
  joinedPackageRegistrations.value.slice(0, 3),
)

const digitalEligibilityProgress = computed(() => {
  if (!selectedTrack.value) return '0/0'
  return `${selectedTrack.value.licensingEligibility.summary.eligibleDigitalCount}/${getEligibilityTotal(selectedTrack.value, 'digital')}`
})

const digitalEligibilityDescription = computed(() => {
  if (!selectedTrack.value) return 'Chưa có dữ liệu quyền số'

  const joinedCount = joinedPackageRegistrations.value.length
  if (joinedCount > 0) {
    return `${joinedCount} gói đang tham gia`
  }

  return 'Chưa tham gia gói quyền nào'
})

const selectedPlatformGroup = computed(() =>
  productPlatformSettings.value?.supportedPlatforms.find(
    (platform) => platform.platformKey === selectedPlatformKey.value,
  ) ?? null,
)

const selectedPlatformLabel = computed(
  () => selectedPlatformGroup.value?.platformLabel ?? 'YouTube',
)

const selectedPlatformDefaultTemplate = computed(
  () => selectedPlatformGroup.value?.defaultTemplate ?? null,
)

const selectedPricingModeLabel = computed(() =>
  selectedPlatformMode.value === 'CUSTOM' ? 'Giá riêng' : 'Giá hệ thống',
)

const canSavePlatformConfiguration = computed(
  () =>
    !productPlatformLoading.value &&
    !productPlatformSaving.value &&
    !!selectedPlatformGroup.value,
)

const activePlatformModifiersPreview = computed(() =>
  selectedPlatformMode.value === 'CUSTOM'
    ? editablePlatformModifiers.value
    : selectedPlatformDefaultTemplate.value?.modifiers ?? [],
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

const navigateToPlatform = (platformKey: ProductPlatformKey) => {
  selectedPlatformKey.value = platformKey
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

const getTrackIdentityLabel = (track: Product) => {
  const genreLabel = formatTrackGenresDisplay(track)
  const useCaseLabel = formatTrackUseCasesDisplay(track)
  return `${genreLabel} · ${useCaseLabel}`
}

const getTrackArtistLabel = (track: Product) =>
  typeof track.authorName === 'string' && track.authorName.trim().length > 0
    ? track.authorName.trim()
    : 'Nghệ sĩ chưa cập nhật'

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

  selectedPlatformMode.value = activeGroup?.mode ?? 'SYSTEM'
  editablePlatformModifiers.value = buildCompletePlatformPricingModifiers(
    activeGroup?.customTemplate?.modifiers ?? activeGroup?.defaultTemplate.modifiers ?? [],
  )
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

  productPlatformSaving.value = true
  productPlatformError.value = null
  clearMessages()

  try {
    const { data } = await updateAdminProductPlatformSettings(productId.value, {
      platformKey: selectedPlatformKey.value,
      mode: selectedPlatformMode.value,
      modifiers:
        selectedPlatformMode.value === 'CUSTOM'
          ? buildCompletePlatformPricingModifiers(editablePlatformModifiers.value)
          : null,
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
    selectedPlatformMode.value = 'SYSTEM'
    editablePlatformModifiers.value = []
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
  <div class="flex min-h-[calc(100vh-3rem)] w-full bg-background">
    <div v-if="selectedTrack" class="flex flex-col xl:flex-row w-full flex-1">
      <div class="xl:w-[220px] flex-shrink-0 xl:sticky xl:top-0 h-auto xl:h-[calc(100vh-3rem)] z-10 hidden xl:block">
        <ProductWorkspaceSidebar
          :active-section="activeSection"
          :active-platform-key="selectedPlatformKey"
          @back="goBackToList"
          @navigate="navigateToSection"
          @navigate-platform="navigateToPlatform"
        />
      </div>

            <div class="flex-1 min-w-0 flex flex-col">
        
        <main class="flex-1 overflow-y-auto">
        <section v-if="activeSection === 'general'">
          <!-- Massive Immersive Player Hero -->
          <section class="min-h-[70vh] flex flex-col items-center justify-center py-12 px-6 bg-surface-container-low/30 relative overflow-hidden">
            <div class="w-full max-w-5xl space-y-12 text-center mt-8">
              <!-- Header Info -->
              <div class="space-y-4">
                <div class="inline-flex items-center gap-3">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" :class="selectedTrack.status === 'PUBLISHED' ? 'bg-info-bg text-info-text border border-info-bg shadow-sm' : selectedTrack.status === 'PENDING' ? 'bg-warning-bg text-warning-text border border-warning-bg shadow-sm' : 'bg-surface-dim text-text-tertiary border border-border-subtle'">
                    <span class="w-2 h-2 rounded-full mr-2" :class="selectedTrack.status === 'PUBLISHED' ? 'bg-[#378ADD]' : selectedTrack.status === 'PENDING' ? 'bg-warning-text' : 'bg-text-tertiary'"></span>
                    {{ formatProductStatusLabel(selectedTrack.status) }}
                  </span>
                  <span class="text-metadata text-text-tertiary font-code-mono uppercase tracking-tighter">MÃ SP: {{ selectedTrack.id.slice(0, 8) }}</span>
                </div>
                <h2 class="text-5xl md:text-[72px] font-page-title text-on-surface font-black tracking-tighter leading-none drop-shadow-sm">{{ selectedTrack.title }}</h2>
                <div class="flex items-center justify-center gap-2 text-text-secondary">
                  <span class="font-medium text-on-surface">{{ getTrackArtistLabel(selectedTrack) }}</span>
                  <span class="text-border-subtle">•</span>
                  <span class="font-code-mono text-sm uppercase">{{ formatTrackGenresDisplay(selectedTrack) }}</span>
                </div>
              </div>

              <!-- The Massive Waveform -->
              <div class="relative group py-8">
                <div class="absolute inset-0 bg-primary/5 rounded-[40px] blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div class="flex items-center gap-10 mb-8 px-4">
                  <ProductWavePreview
                    hero
                    :audio-url="originalAudioUrls[selectedTrack.id] ?? null"
                    :disabled="!selectedTrack.originalAudioKey"
                    :track-status="selectedTrack.status"
                    :right-label="formatDuration(selectedTrack.duration)"
                    class="w-full"
                  />
                </div>
                <div class="flex items-center justify-center gap-2 mt-4 text-text-tertiary">
                  <i class="pi pi-wave-pulse !text-sm"></i>
                  <span class="text-metadata font-code-mono uppercase">{{ getOriginalAudioFileLabel(selectedTrack) }} • High Fidelity Lossless</span>
                </div>
              </div>

              <!-- Immediate Actions -->
              <div class="flex flex-wrap justify-center items-center gap-4">
                <button
                  type="button"
                  class="bg-primary text-white px-8 py-4 rounded-xl font-body-md font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-3 disabled:opacity-60"
                  :disabled="isLoading"
                  @click="confirmTogglePublish(selectedTrack)"
                >
                  <i :class="selectedTrack.status === 'PUBLISHED' ? 'pi pi-eye-slash' : 'pi pi-upload'"></i>
                  {{ selectedTrack.status === 'PUBLISHED' ? 'Ẩn sản phẩm' : 'Phát hành bản mới' }}
                </button>
                <button type="button" class="bg-surface-container-highest text-on-surface px-6 py-4 rounded-xl font-body-md font-medium hover:bg-surface-dim transition-all flex items-center gap-2 border border-border-subtle" @click="openUploadDialog">
                  <i class="pi pi-download"></i>
                  Tải bản gốc
                </button>
                <button type="button" class="bg-surface-container-highest text-on-surface px-6 py-4 rounded-xl font-body-md font-medium hover:bg-surface-dim transition-all flex items-center gap-2 border border-border-subtle" :disabled="!selectedTrack.sheetMusicPdfKey" @click="openSheetMusicPdf(selectedTrack)">
                  <i class="pi pi-file-pdf"></i>
                  Mở PDF
                </button>
                <div class="w-[1px] h-10 bg-border-subtle/50 mx-2"></div>
                <button type="button" class="bg-danger-bg/50 text-danger-text px-6 py-4 rounded-xl font-body-md font-medium hover:bg-danger-bg transition-all flex items-center gap-2 border border-[#F09595]/30" @click="openEditDialog">
                  <i class="pi pi-pencil"></i>
                  Sửa Metadata
                </button>
              </div>
            </div>
          </section>



          <!-- Dense Data Grid Below -->
          <section class="max-w-6xl mx-auto px-6 pb-24 pt-12 w-full">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
              <!-- Long Description -->
              <div class="md:col-span-8 bg-surface-container-lowest border border-border-subtle p-8 rounded-2xl shadow-sm">
                <div class="flex items-center gap-3 mb-6">
                  <i class="pi pi-align-left text-primary"></i>
                  <h3 class="text-section-heading font-section-heading text-on-surface font-bold uppercase tracking-widest">Mô tả sản phẩm</h3>
                </div>
                <div class="prose prose-sm max-w-none text-on-surface-variant leading-relaxed text-base">
                  <p class="mb-4">{{ selectedTrack.description || 'Chưa có mô tả riêng cho sản phẩm.' }}</p>
                </div>
              </div>

              <!-- Rights Status -->
              <div class="md:col-span-4 space-y-6">
                <div class="bg-primary text-white p-8 rounded-2xl shadow-lg shadow-primary/10">
                  <div class="flex justify-between items-start mb-6">
                    <div>
                      <h3 class="text-section-heading font-section-heading text-primary-fixed-dim font-bold uppercase tracking-widest mb-2">Quyền số</h3>
                      <span class="text-3xl font-black">{{ digitalEligibilityProgress }}</span>
                    </div>
                    <span class="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/80">
                      {{ digitalEligibilityDescription }}
                    </span>
                  </div>
                  <div class="space-y-4">
                    <div v-for="registration in joinedPackageRegistrationPreview" :key="registration.registrationId" class="flex items-center gap-3">
                      <i class="pi pi-check-circle text-success-text"></i>
                      <span class="text-body-md font-medium truncate">{{ registration.title }}</span>
                    </div>
                    <div v-if="joinedPackageRegistrationPreview.length === 0" class="text-sm text-white/75">
                      Chưa có gói quyền nào được đăng ký.
                    </div>
                  </div>
                  <button type="button" class="w-full flex items-center justify-between mt-8 pt-4 border-t border-white/10 group cursor-pointer" @click="navigateToSection('rights-license')">
                    <span class="text-metadata font-bold uppercase">Xem tất cả gói quyền</span>
                    <i class="pi pi-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>

                <div class="bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-primary transition-colors" @click="selectedTrack.sheetMusicPdfKey ? openSheetMusicPdf(selectedTrack) : openUploadDialog()">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center" :class="selectedTrack.sheetMusicPdfKey ? 'bg-success-bg text-success-text' : 'bg-surface-container-high text-text-tertiary'">
                      <i class="text-lg" :class="selectedTrack.sheetMusicPdfKey ? 'pi pi-check-circle' : 'pi pi-file-pdf'"></i>
                    </div>
                    <div>
                      <p class="text-body-sm font-bold text-on-surface">File khuông nhạc</p>
                      <p class="text-metadata text-text-tertiary mt-1">{{ selectedTrack.sheetMusicPdfKey ? 'Sẵn sàng sử dụng' : 'Chưa có file PDF' }}</p>
                    </div>
                  </div>
                  <i class="pi pi-external-link text-text-tertiary group-hover:text-primary"></i>
                </div>
              </div>

              <!-- Info Metadata Grid -->
              <div class="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl">
                  <span class="text-section-heading font-section-heading text-text-tertiary uppercase block mb-2">Thời lượng</span>
                  <span class="text-2xl font-bold text-on-surface">{{ formatDuration(selectedTrack.duration) }}</span>
                </div>
                <div class="bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl">
                  <span class="text-section-heading font-section-heading text-text-tertiary uppercase block mb-2">Use-case</span>
                  <span class="text-xl font-bold text-on-surface truncate block">{{ formatTrackUseCasesDisplay(selectedTrack) }}</span>
                </div>
                <div class="md:col-span-2 bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl">
                  <span class="text-section-heading font-section-heading text-text-tertiary uppercase block mb-2">Mã sản phẩm</span>
                  <span class="text-code-mono font-code-mono text-on-surface truncate block">{{ selectedTrack.id }}</span>
                </div>
              </div>

              <!-- Upload Zone -->
              <div class="md:col-span-12">
                <button type="button" class="w-full bg-surface-container-low border-2 border-dashed border-border-subtle rounded-3xl py-12 px-6 flex flex-col items-center justify-center gap-4 hover:bg-surface-container-high hover:border-primary transition-all group" @click="openUploadDialog">
                  <div class="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <i class="pi pi-upload text-primary !text-2xl"></i>
                  </div>
                  <div class="text-center">
                    <span class="text-body-md font-bold text-on-surface block mb-1">Upload file PDF khuông nhạc mới</span>
                    <span class="text-metadata text-text-tertiary">Chọn file PDF để cập nhật tài liệu đính kèm cho bài hát này.</span>
                  </div>
                </button>
              </div>
            </div>
          </section>
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
                {{ selectedPlatformLabel }} cho bài hát này
              </div>
              <div class="mt-2 text-sm leading-7 text-[color:var(--admin-text-muted)]">
                Nếu không tự cấu hình, bài hát sẽ dùng toàn bộ mẫu giá mặc định của hệ thống.
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                  1 bài hát · 1 cấu hình
                </span>
                <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-primary-800)] [border-color:rgb(var(--admin-primary-rgb)/0.18)]">
                  Chế độ: {{ selectedPricingModeLabel }}
                </span>
              </div>
            </div>

            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" @click="router.push('/admin/settings/digital-rights')">
                <i class="pi pi-external-link text-sm" />
                Xem cấu hình hệ thống
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div class="space-y-4">
              <div class="space-y-3">
                <Message v-if="productPlatformError" severity="error">{{ productPlatformError }}</Message>
                <Message v-if="productPlatformLoading" severity="info">Đang tải cấu hình nền tảng...</Message>
              </div>

              <div v-if="selectedPlatformGroup" class="space-y-4">
                <article class="rounded-[26px] border bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 [border-color:var(--admin-border)]">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Cấu hình áp dụng
                      </div>
                      <div class="mt-2 text-base font-semibold text-[color:var(--admin-text)]">
                        Chọn cách bài hát lấy giá
                      </div>
                      <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                        Tất cả thuộc tính giá đều luôn có sẵn. Bạn chỉ chọn dùng mẫu mặc định hoặc tự cấu hình hệ số riêng.
                      </div>
                    </div>
                    <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-0)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                      {{ selectedPlatformLabel }}
                    </span>
                  </div>

                  <div class="mt-5">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                      Chế độ áp dụng
                    </div>
                    <div class="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        class="rounded-[22px] border px-4 py-4 text-left transition"
                        :class="selectedPlatformMode === 'SYSTEM'
                          ? 'border-[color:rgb(var(--admin-primary-rgb)/0.24)] bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] text-[color:var(--admin-primary-900)]'
                          : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)]'"
                        :disabled="productPlatformSaving"
                        @click="selectedPlatformMode = 'SYSTEM'"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <div class="text-sm font-semibold">Dùng gói mặc định của hệ thống</div>
                            <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                              Bài hát dùng nguyên bộ hệ số giá mặc định của YouTube.
                            </div>
                          </div>
                          <span
                            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
                            :class="selectedPlatformMode === 'SYSTEM'
                              ? 'border-[color:var(--admin-primary-600)] bg-[color:var(--admin-primary-600)] text-white'
                              : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] text-transparent'"
                          >
                            <i class="pi pi-check text-[10px]" />
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        class="rounded-[22px] border px-4 py-4 text-left transition"
                        :class="selectedPlatformMode === 'CUSTOM'
                          ? 'border-[color:rgb(var(--admin-primary-rgb)/0.24)] bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] text-[color:var(--admin-primary-900)]'
                          : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)]'"
                        :disabled="productPlatformSaving"
                        @click="selectedPlatformMode = 'CUSTOM'"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <div class="text-sm font-semibold">Tự cấu hình giá riêng</div>
                            <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                              Clone toàn bộ dữ liệu mặc định rồi sửa từng hệ số giá cho bài hát này.
                            </div>
                          </div>
                          <span
                            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
                            :class="selectedPlatformMode === 'CUSTOM'
                              ? 'border-[color:var(--admin-primary-600)] bg-[color:var(--admin-primary-600)] text-white'
                              : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] text-transparent'"
                          >
                            <i class="pi pi-check text-[10px]" />
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </article>

                <article class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Dữ liệu mặc định của hệ thống
                      </div>
                      <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
                        Đây là bộ hệ số chuẩn của YouTube. Khi bật giá riêng, bài hát sẽ clone từ bộ dữ liệu này.
                      </div>
                    </div>
                    <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-0)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                      {{ selectedPlatformDefaultTemplate?.modifiers.length ?? 0 }} thuộc tính
                    </span>
                  </div>

                  <div class="mt-4">
                    <PlatformPricingModifierEditor
                      :model-value="selectedPlatformDefaultTemplate?.modifiers ?? []"
                      readonly
                    />
                  </div>
                </article>

                <article
                  v-if="selectedPlatformMode === 'CUSTOM'"
                  class="rounded-[26px] border bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 [border-color:var(--admin-border)]"
                >
                  <div class="flex items-center gap-3">
                    <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-700)]">
                      <i class="pi pi-pencil text-sm" />
                    </div>
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Form giá riêng
                      </div>
                      <div class="mt-1 text-base font-semibold text-[color:var(--admin-text)]">
                        Cấu hình giá riêng
                      </div>
                      <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
                        Tất cả thuộc tính đều có sẵn, bạn chỉ sửa hệ số giá của bài hát này.
                      </div>
                    </div>
                  </div>

                  <div class="mt-5">
                    <PlatformPricingModifierEditor
                      v-model="editablePlatformModifiers"
                      :disabled="productPlatformSaving"
                    />
                  </div>
                </article>

                <article class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Xem trước kết quả
                      </div>
                      <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
                        Mức giá đang được preview trước khi lưu.
                      </div>
                    </div>
                    <span class="inline-flex items-center rounded-full border bg-[color:var(--admin-surface-0)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                      {{ selectedPricingModeLabel }}
                    </span>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-4">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Cách áp dụng
                      </div>
                      <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                        {{ selectedPricingModeLabel }}
                      </div>
                    </div>
                    <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-4">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Thuộc tính đang áp dụng
                      </div>
                      <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                        {{ activePlatformModifiersPreview.length }}
                      </div>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div
                      v-for="modifier in activePlatformModifiersPreview"
                      :key="modifier.key"
                      class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-4"
                    >
                      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        {{ resolvePlatformPricingModifierLabel(modifier.key) }}
                      </div>
                      <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                        {{ formatMultiplier(modifier.multiplier) }}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <aside class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)] xl:sticky xl:top-6">
              <div class="rounded-[22px] border bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] p-4 [border-color:rgb(var(--admin-primary-rgb)/0.12)]">
                <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-primary-800)]">
                  Áp dụng cho bài hát
                </div>
                <div class="mt-2 text-base font-semibold text-[color:var(--admin-text)]">
                  {{ selectedTrack.title }}
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]">
                    {{ selectedPlatformLabel }}
                  </span>
                  <span class="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]">
                    {{ selectedPricingModeLabel }}
                  </span>
                </div>
              </div>

              <div class="mt-4 space-y-3 rounded-[22px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
                <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                  Tóm tắt áp dụng
                </div>

                <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                      Mẫu hệ thống
                  </div>
                  <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ selectedPlatformDefaultTemplate?.name ?? 'Chưa có' }}
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Chế độ
                    </div>
                    <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                        {{ selectedPricingModeLabel }}
                    </div>
                  </div>

                  <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                        Số thuộc tính giá
                    </div>
                    <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                        {{ activePlatformModifiersPreview.length }}
                    </div>
                  </div>
                </div>

                <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                      Ghi chú
                  </div>
                  <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ selectedPlatformMode === 'CUSTOM' ? 'Dang dung snapshot rieng cua bai hat' : 'Dang dung mau gia mac dinh cua he thong' }}
                  </div>
                </div>

                <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                    Cập nhật gần nhất
                  </div>
                  <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                    {{ selectedPlatformGroup?.updatedAt ? formatDateTime(selectedPlatformGroup.updatedAt) : 'Chưa có' }}
                  </div>
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
                  :disabled="!canSavePlatformConfiguration"
                  @click="saveProductPlatformSettings"
                >
                  {{ productPlatformSaving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình bài hát' }}
                </button>
              </div>
              <div class="mt-3 text-xs leading-6 text-[color:var(--admin-text-muted)]">
                Lưu sẽ chỉ cập nhật cấu hình của bài hát hiện tại, không thay đổi cấu hình hệ thống.
              </div>
            </aside>
          </div>
        </section>
      </main>
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
