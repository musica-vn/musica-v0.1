<script setup lang="ts">
import Message from 'primevue/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiClientError } from '../../api/axios'
import { useDebouncedWatch } from '../../composables/useDebouncedWatch'
import { listManagedUsers } from '../../services/managed-users.service'
import type { ManagedUser } from '../../types/managed-users.types'
import type {
  Product,
  ProductSortValue,
  ProductStatus,
  ProductThumbnailExtension,
} from '../../types/products.types'
import {
  PRODUCT_GENRE_OPTIONS,
  PRODUCT_USE_CASE_OPTIONS,
  resolveProductGenreLabel,
  type ProductGenre,
  type ProductUseCase,
} from '../../constants/products.enums'
import {
  confirmAdminProductAudioUpload,
  confirmAdminProductSheetMusicUpload,
  confirmAdminProductThumbnailUpload,
  createAdminProduct,
  getAdminProductsSummary,
  getOriginalUploadUrl,
  getProductThumbnailUrl,
  getSheetMusicUploadUrl,
  getThumbnailUploadUrl,
  listAdminProducts,
} from '../../services/products.service'
import ProductWavePreview from '../../components/features/products/ProductWavePreview.vue'
import AdminProductUpsertDialog from '../../components/features/products/AdminProductUpsertDialog.vue'
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

type ArtistOption = {
  value: string
  label: string
  email: string
}

const router = useRouter()
const defaultSort: ProductSortValue = 'updatedAt:desc'
const fieldClass =
  'h-12 w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const fileInputClass =
  'block w-full text-sm text-[color:var(--admin-text-muted)] file:mr-4 file:rounded-2xl file:border-0 file:bg-[color:var(--admin-primary-50)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[color:var(--admin-text)] hover:file:bg-[color:var(--admin-surface-2)]'

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const createDialogErrorMessage = ref<string | null>(null)

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
const createForm = reactive<ProductForm>({
  title: '',
  artistId: '',
  genres: [],
  useCases: [],
  description: '',
  duration: '',
})

const createOriginalFile = ref<File | null>(null)
const createSheetMusicFile = ref<File | null>(null)
const createThumbnailFile = ref<File | null>(null)
const createOriginalAudioUrl = ref<string | null>(null)
const createThumbnailUrl = ref<string | null>(null)
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
    ? 'Không có gì cần duyệt.'
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
    description: 'Tổng số sản phẩm đang hiển thị',
    icon: 'pi pi-check-circle',
    tone: 'emerald' as const,
  },
  {
    title: 'Đang ẩn',
    value: summaryCounts.hidden,
    description: 'Tổng số sản phẩm đang ẩn',
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

const createDurationDisplay = computed(() => {
  const parsed = parseDuration(createForm.duration)
  return parsed === undefined ? null : formatDuration(Math.max(0, Math.round(parsed)))
})

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

const getProductComplianceLegalStatusClassSafe = (value: Product['complianceLegalStatus']) => {
  if (value === 'SUFFICIENT') {
    return 'border-[color:rgb(var(--admin-success-rgb)/0.24)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
  }
  if (value === 'INSUFFICIENT') {
    return 'border-[color:rgb(var(--admin-warning-rgb)/0.22)] bg-[color:var(--admin-warning-50)] text-[color:var(--admin-warning-700)]'
  }
  return 'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)]'
}

const getTrackGenreValues = (track: Product) =>
  track.genres && track.genres.length > 0 ? track.genres : track.genre ? [track.genre] : []

const formatTrackGenresDisplay = (track: Product) => {
  const values = getTrackGenreValues(track)
  return values.length > 0 ? values.map(resolveProductGenreLabel).join(', ') : 'Chưa có thể loại'
}

const formatArtistOptionLabel = (artist: ManagedUser) => `${artist.fullName} · ${artist.email}`
const ARTIST_OPTIONS_PAGE_SIZE = 100

const resolveArtistDisplay = (track: Product) => track.authorName ?? track.artistId

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError) {
    const detailMessage =
      typeof error.details === 'object' &&
      error.details !== null &&
      'message' in error.details &&
      typeof (error.details as { message?: unknown }).message === 'string'
        ? ((error.details as { message?: string }).message ?? null)
        : null

    if (detailMessage) return detailMessage
    return `${error.code}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  return 'Đã xảy ra lỗi không xác định'
}

const setError = (error: unknown) => {
  errorMessage.value = resolveErrorMessage(error)
}

const setCreateDialogError = (error: unknown) => {
  createDialogErrorMessage.value = resolveErrorMessage(error)
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const clearCreateDialogError = () => {
  createDialogErrorMessage.value = null
}

const revokeObjectUrl = (url: string | null) => {
  if (url) URL.revokeObjectURL(url)
}

const setCreateAudioUrl = (file: File | null) => {
  revokeObjectUrl(createOriginalAudioUrl.value)
  createOriginalAudioUrl.value = file ? URL.createObjectURL(file) : null
}

const setCreateThumbnailPreviewUrl = (file: File | null) => {
  revokeObjectUrl(createThumbnailUrl.value)
  createThumbnailUrl.value = file ? URL.createObjectURL(file) : null
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
  const extension = parts.at(-1)?.trim().toLowerCase()
  return extension && extension.length > 0 ? extension : null
}

const ensureThumbnailFile = (file: File, label: string): ProductThumbnailExtension => {
  const allowed: ProductThumbnailExtension[] = ['png', 'jpg', 'jpeg', 'webp']
  const extension = getFileExtension(file)
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

const validateTrackForm = () => {
  if (createForm.title.trim().length === 0) return 'Tên track là bắt buộc'
  if (createForm.artistId.trim().length === 0) return 'Vui lòng chọn nghệ sĩ'
  if (!createThumbnailFile.value) return 'Cần chọn thumbnail cho track'
  if (!createOriginalFile.value) return 'Cần chọn file MP3 gốc khi tạo track'
  if (createForm.duration.trim().length === 0) return 'Không đọc được thời lượng từ file audio gốc'
  return null
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

const preloadPageAssets = async (tracks: Product[]) => {
  await Promise.allSettled(tracks.map((track) => ensureThumbnailUrl(track)))
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
    totalItems.value = meta.pagination.totalItems
    await preloadPageAssets(data.items)
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

const navigateToDetail = (track: Product, section: 'general' | 'rights-license' | 'platforms' = 'general') => {
  void router.push({
    path: `/products/${track.id}/${section}`,
    query: {
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
      keyword: filters.keyword || undefined,
      sort: filters.sort,
      status: filters.status || undefined,
      genre: filters.genre || undefined,
    },
  })
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
  await confirmAdminProductAudioUpload(trackId, { mode: 'original', fileKey: data.fileKey })
}

const uploadTrackThumbnailFile = async (trackId: string, file: File) => {
  const extension = ensureThumbnailFile(file, 'Thumbnail')
  const { data } = await getThumbnailUploadUrl(trackId, { extension })
  await uploadToSignedUrl(data.uploadUrl, file)
  await confirmAdminProductThumbnailUpload(trackId, { fileKey: data.fileKey })
}

const uploadTrackSheetMusicFile = async (trackId: string, file: File) => {
  ensurePdfFile(file, 'Khuông nhạc')
  const { data } = await getSheetMusicUploadUrl(trackId)
  await uploadToSignedUrl(data.uploadUrl, file)
  await confirmAdminProductSheetMusicUpload(trackId, { fileKey: data.fileKey })
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

const openCreateDialog = () => {
  clearMessages()
  clearCreateDialogError()
  resetCreateForm()
  if (!hasLoadedArtists.value && !isArtistsLoading.value) {
    void fetchArtistOptions()
  }
  createDialogVisible.value = true
}

const submitCreate = async () => {
  clearCreateDialogError()
  successMessage.value = null
  const validationError = validateTrackForm()
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
    successMessage.value = 'Đã tạo sản phẩm'
    await refreshTrackDashboard()
  } catch (error) {
    if (createdProduct) {
      setCreateDialogError(
        new Error(
          `Sản phẩm đã được tạo nhưng upload file thất bại. ${error instanceof Error ? error.message : String(error)}`,
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

const resetProductFilters = async () => {
  filters.keyword = ''
  filters.sort = defaultSort
  filters.status = ''
  filters.genre = ''
  pagination.page = 1
  await refreshTrackDashboard()
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
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <AdminPageHeader
      title="Quản lý sản phẩm"
      description="Trang danh sách chỉ dùng để theo dõi tổng quan, tạo mới và điều hướng sang workspace chi tiết của từng sản phẩm."
      icon-class="pi pi-wave-pulse"
    >
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
          <AdminFilterInput
            v-model="filters.keyword"
            icon-class="pi pi-search"
            placeholder="Tìm theo tên, tác giả hoặc thể loại"
            :disabled="isLoading"
          />
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

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-4 grid gap-3 sm:hidden">
        <article
          v-for="track in rows"
          :key="track.id"
          class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 shadow-sm [border-color:var(--admin-border)]"
        >
          <div class="flex items-start gap-3">
            <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]">
              <img v-if="thumbnailUrls[track.id]" :src="thumbnailUrls[track.id]" alt="" class="h-full w-full object-cover" />
              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-[color:var(--admin-primary-50)] text-sm font-semibold text-[color:var(--admin-text)]"
              >
                {{ track.title.slice(0, 1).toUpperCase() }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-2 text-sm font-semibold text-[color:var(--admin-text)]">{{ track.title }}</h3>
              <p class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">
                {{ resolveArtistDisplay(track) }}
              </p>
              <p class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">
                {{ formatTrackGenresDisplay(track) }} · {{ formatDuration(track.duration) }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold" :class="getProductStatusClass(track.status)">
              {{ formatProductStatusLabel(track.status) }}
            </span>
            <span class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold" :class="getProductComplianceLegalStatusClassSafe(track.complianceLegalStatus)">
              {{ formatComplianceLegalStatusLabel(track.complianceLegalStatus) }}
            </span>
          </div>

          <div class="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--admin-text-muted)]">
            <span class="inline-flex items-center gap-1 rounded-full bg-[color:var(--admin-surface-1)] px-2.5 py-1">
              <i class="pi pi-book text-[10px]" />
              {{ track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0 }} quyền
            </span>
            <span class="inline-flex items-center gap-1 rounded-full bg-[color:var(--admin-surface-1)] px-2.5 py-1">
              <i class="pi pi-clock text-[10px]" />
              {{ formatDateTime(track.updatedAt) }}
            </span>
          </div>

          <div class="mt-4">
            <AdminButton variant="primary" class="w-full" :loading="isLoading" @click="navigateToDetail(track)">
              Xem chi tiết
            </AdminButton>
          </div>
        </article>

        <div
          v-if="!isLoading && rows.length === 0"
          class="rounded-[28px] border border-dashed bg-[color:var(--admin-surface-0)] px-4 py-12 text-center text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
        >
          Không có sản phẩm phù hợp. Thử đổi bộ lọc để mở rộng kết quả tìm kiếm.
        </div>
      </div>

      <div class="mt-4 hidden overflow-hidden rounded-[28px] border bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)] sm:block [border-color:var(--admin-border-strong)]">
        <div class="overflow-x-auto">
          <table class="min-w-[980px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-[linear-gradient(180deg,var(--admin-surface-3),var(--admin-surface-2))] text-xs uppercase tracking-[0.18em] text-[color:var(--admin-text)]">
              <tr>
                <th class="w-20 px-3 py-3 font-semibold">Ảnh</th>
                <th class="w-[32%] px-3 py-3 font-semibold">Sản phẩm</th>
                <th class="w-32 px-3 py-3 font-semibold">Quyền bán</th>
                <th class="w-40 px-3 py-3 font-semibold">Pháp lý</th>
                <th class="w-36 px-3 py-3 font-semibold">Trạng thái</th>
                <th class="w-40 px-3 py-3 font-semibold">Cập nhật</th>
                <th class="w-32 px-3 py-3 text-right font-semibold">Thao tác</th>
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
              >
                <td class="px-3 py-3">
                  <div class="h-10 w-10 overflow-hidden rounded-xl border bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]">
                    <img v-if="thumbnailUrls[track.id]" :src="thumbnailUrls[track.id]" alt="" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center bg-[color:var(--admin-primary-50)] text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ track.title.slice(0, 1).toUpperCase() }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-[color:var(--admin-text)]">{{ track.title }}</div>
                    <div class="mt-1 line-clamp-1 text-xs text-[color:var(--admin-text-muted)]">
                      {{ resolveArtistDisplay(track) }} · {{ formatTrackGenresDisplay(track) }} · {{ formatDuration(track.duration) }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <span class="inline-flex items-center gap-2 rounded-xl border bg-[color:var(--admin-surface-0)] px-3 py-1.5 text-xs font-semibold text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
                    <i class="pi pi-book text-xs" />
                    {{ track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0 }} quyền
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold" :class="getProductComplianceLegalStatusClassSafe(track.complianceLegalStatus)">
                    <i class="pi pi-verified text-xs" />
                    {{ formatComplianceLegalStatusLabel(track.complianceLegalStatus) }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold" :class="getProductStatusClass(track.status)">
                    {{ formatProductStatusLabel(track.status) }}
                  </span>
                </td>
                <td class="px-3 py-3 text-sm text-[color:var(--admin-text-muted)]">
                  {{ formatDateTime(track.updatedAt) }}
                </td>
                <td class="px-3 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex h-9 items-center justify-center rounded-xl border bg-[color:var(--admin-surface-0)] px-3 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:opacity-60"
                      :disabled="isLoading"
                      @click="navigateToDetail(track)"
                    >
                      Chi tiết
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-sm text-[color:var(--admin-text-muted)]">
                  Không có sản phẩm phù hợp. Thử đổi bộ lọc để mở rộng kết quả tìm kiếm.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <AdminPaginationBar
        class="mt-4"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :page-size-options="[10]"
        :total-items="totalItems"
        :disabled="isLoading"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
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
  </div>
</template>
