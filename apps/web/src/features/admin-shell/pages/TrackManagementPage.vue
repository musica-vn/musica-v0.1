<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiClientError } from '../../../shared/api/http'
import type { Track, TrackSortValue, TrackStatus, TrackUsageRight } from '../../tracks/tracks.types'
import {
  confirmAdminTrackAudioUpload,
  createAdminTrack,
  getAdminTracksSummary,
  getOriginalUploadUrl,
  getPreviewPlaybackUrl,
  getPreviewUploadUrl,
  hideAdminTrack,
  listAdminTracks,
  publishAdminTrack,
  updateAdminTrack,
} from '../../tracks/tracks.api'
import TrackFilterInput from '../../tracks/components/TrackFilterInput.vue'
import TrackFilterSelect from '../../tracks/components/TrackFilterSelect.vue'
import TrackListItem from '../../tracks/components/TrackListItem.vue'
import TrackWavePreview from '../../tracks/components/TrackWavePreview.vue'

type TrackAudioMode = 'original' | 'preview'

type TrackForm = {
  title: string
  artistId: string
  authorName: string
  genre: string
  duration: string
  usageRights: TrackUsageRight[]
}

const defaultSort: TrackSortValue = 'createdAt:desc'
const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const fileInputClass =
  'block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-violet-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-200 dark:text-slate-400 dark:file:bg-violet-500/20 dark:file:text-violet-200'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'
const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
const summaryToneClassMap = {
  primary: 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/60 dark:border-violet-500/20',
  success: 'from-emerald-500/15 to-teal-500/10 border-emerald-200/60 dark:border-emerald-500/20',
  warning: 'from-amber-500/15 to-orange-500/10 border-amber-200/60 dark:border-amber-500/20',
} as const

const usageRightOptions = [
  { label: 'Quyền sao chép tác phẩm', value: 'REPRODUCTION_RIGHT' },
  { label: 'Quyền truyền đạt đến công chúng', value: 'COMMUNICATION_TO_PUBLIC_RIGHT' },
  { label: 'Quyền làm tác phẩm phái sinh', value: 'DERIVATIVE_WORK_RIGHT' },
  { label: 'Quyền phân phối bản sao', value: 'DISTRIBUTION_RIGHT' },
] as const
const usageRightLabelMap: Record<TrackUsageRight, string> = {
  REPRODUCTION_RIGHT: 'Quyền sao chép tác phẩm',
  COMMUNICATION_TO_PUBLIC_RIGHT: 'Quyền truyền đạt đến công chúng',
  DERIVATIVE_WORK_RIGHT: 'Quyền làm tác phẩm phái sinh',
  DISTRIBUTION_RIGHT: 'Quyền phân phối bản sao',
}

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rows = ref<Track[]>([])
const totalItems = ref(0)
const summaryCounts = reactive({
  total: 0,
  published: 0,
  hidden: 0,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const filters = reactive<{
  keyword: string
  sort: TrackSortValue
  status: TrackStatus | ''
  genre: string
}>({
  keyword: '',
  sort: defaultSort,
  status: '',
  genre: '',
})

const sortOptions: Array<{ label: string; value: TrackSortValue }> = [
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

const statusOptions: Array<{ label: string; value: TrackStatus | '' }> = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Đang phát hành', value: 'PUBLISHED' },
  { label: 'Đang ẩn', value: 'HIDDEN' },
]

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)

const selectedTrack = ref<Track | null>(null)
const createForm = reactive<TrackForm>({
  title: '',
  artistId: '',
  authorName: '',
  genre: '',
  duration: '',
  usageRights: [],
})
const editForm = reactive<TrackForm>({
  title: '',
  artistId: '',
  authorName: '',
  genre: '',
  duration: '',
  usageRights: [],
})

const createOriginalFile = ref<File | null>(null)
const createPreviewFile = ref<File | null>(null)
const editOriginalFile = ref<File | null>(null)
const editPreviewFile = ref<File | null>(null)
const createOriginalAudioUrl = ref<string | null>(null)
const createPreviewAudioUrl = ref<string | null>(null)
const createPreviewDurationSeconds = ref<number | null>(null)

const uploadMode = ref<TrackAudioMode>('original')
const uploadFile = ref<File | null>(null)
const uploadStatus = ref<'idle' | 'requesting' | 'uploading' | 'done' | 'error'>('idle')
const uploadResult = ref<{ fileKey: string; uploadUrl: string } | null>(null)
const uploadError = ref<string | null>(null)
const previewAudioUrls = ref<Record<string, string>>({})
const previewAudioLoading = ref<Record<string, boolean>>({})

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pagination.pageSize)))
const pageStart = computed(() => (totalItems.value === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, totalItems.value))
const summaryCards = computed(() => [
  {
    title: 'Tổng số track',
    value: summaryCounts.total,
    description: 'Toàn bộ dữ liệu theo bộ lọc',
    icon: 'pi pi-wave-pulse',
    tone: 'primary' as const,
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
    tone: 'warning' as const,
  },
])
const createDurationDisplay = computed(() => {
  const parsed = parseDuration(createForm.duration)
  return parsed === undefined ? null : formatDuration(Math.max(0, Math.round(parsed)))
})
const createPreviewDurationDisplay = computed(() =>
  createPreviewDurationSeconds.value === null ? null : formatDuration(createPreviewDurationSeconds.value),
)
const selectedTrackUsageRights = computed(() => selectedTrack.value?.usageRights ?? [])
const selectedTrackDescription = computed(() => {
  if (!selectedTrack.value) return ''

  const track = selectedTrack.value
  const authorLabel = track.authorName || 'chưa có tên tác giả hiển thị'
  const genreLabel = track.genre || 'chưa phân loại thể loại'
  const durationLabel = formatDuration(track.duration).toLowerCase()
  const statusLabel =
    track.status === 'PUBLISHED' ? 'đang ở trạng thái phát hành' : 'đang được ẩn khỏi hệ thống'
  const usageRightsLabel =
    track.usageRights.length > 0
      ? track.usageRights.map(formatUsageRightLabel).join(', ')
      : 'chưa được gán quyền sử dụng'
  const audioStateLabel = [
    track.originalAudioKey ? 'đã có file MP3 gốc' : 'chưa có file MP3 gốc',
    track.previewAudioKey ? 'đã có file nghe thử' : 'chưa có file nghe thử',
  ].join(', ')

  return `Track "${track.title}" của artist ${track.artistId} hiện ${statusLabel}. Bản ghi này hiển thị tác giả ${authorLabel}, thuộc nhóm ${genreLabel}, thời lượng ${durationLabel}, ${audioStateLabel} và đang mang các quyền sử dụng: ${usageRightsLabel}.`
})
const selectedTrackAttributeItems = computed(() => {
  if (!selectedTrack.value) return []

  const track = selectedTrack.value

  return [
    {
      label: 'Track ID',
      value: track.id,
      mono: true,
    },
    {
      label: 'Artist ID',
      value: track.artistId,
      mono: true,
    },
    {
      label: 'Tên tác giả',
      value: track.authorName || 'Chưa có',
    },
    {
      label: 'Thể loại',
      value: track.genre || 'Chưa có thể loại',
    },
    {
      label: 'Thời lượng',
      value: formatDuration(track.duration),
    },
    {
      label: 'Trạng thái',
      value: formatTrackStatusLabel(track.status),
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
const formatUsageRightLabel = (value: TrackUsageRight) => usageRightLabelMap[value]
const formatTrackStatusLabel = (value: TrackStatus) => (value === 'PUBLISHED' ? 'Đang phát hành' : 'Đang ẩn')
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

const summaryCardToneClass = (tone: keyof typeof summaryToneClassMap) => summaryToneClassMap[tone]

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = `${error.code}: ${error.message}`
    return
  }
  if (error instanceof Error) {
    errorMessage.value = error.message
    return
  }
  errorMessage.value = 'Đã xảy ra lỗi không xác định'
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const revokeObjectUrl = (url: string | null) => {
  if (url) URL.revokeObjectURL(url)
}

const setCreateAudioUrl = (mode: TrackAudioMode, file: File | null) => {
  if (mode === 'original') {
    revokeObjectUrl(createOriginalAudioUrl.value)
    createOriginalAudioUrl.value = file ? URL.createObjectURL(file) : null
    return
  }

  revokeObjectUrl(createPreviewAudioUrl.value)
  createPreviewAudioUrl.value = file ? URL.createObjectURL(file) : null
}

const copyToClipboard = async (value: string | null, label: string) => {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    successMessage.value = `Đã sao chép ${label.toLowerCase()}`
  } catch (error) {
    setError(error instanceof Error ? error : new Error('Không thể sao chép'))
  }
}

const ensurePreviewAudioUrl = async (track: Track) => {
  if (!track.previewAudioKey) return null
  if (previewAudioUrls.value[track.id]) return previewAudioUrls.value[track.id]
  if (previewAudioLoading.value[track.id]) return null

  previewAudioLoading.value = { ...previewAudioLoading.value, [track.id]: true }
  try {
    const { data } = await getPreviewPlaybackUrl(track.id)
    previewAudioUrls.value = {
      ...previewAudioUrls.value,
      [track.id]: data.playbackUrl,
    }
    return data.playbackUrl
  } catch (error) {
    setError(error)
    return null
  } finally {
    previewAudioLoading.value = { ...previewAudioLoading.value, [track.id]: false }
  }
}

const prewarmPreviewAudioUrls = async (tracks: Track[]) => {
  const candidates = tracks.filter((track) => track.previewAudioKey)
  const concurrency = 2
  let index = 0

  const worker = async () => {
    while (index < candidates.length) {
      const current = candidates[index]
      index += 1
      await ensurePreviewAudioUrl(current)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()))
}

const resetCreateForm = () => {
  createForm.title = ''
  createForm.artistId = ''
  createForm.authorName = ''
  createForm.genre = ''
  createForm.duration = ''
  createForm.usageRights = []
  revokeObjectUrl(createOriginalAudioUrl.value)
  revokeObjectUrl(createPreviewAudioUrl.value)
  createOriginalAudioUrl.value = null
  createPreviewAudioUrl.value = null
  createPreviewDurationSeconds.value = null
  createOriginalFile.value = null
  createPreviewFile.value = null
}

const resetEditForm = (track: Track) => {
  editForm.title = track.title
  editForm.artistId = track.artistId
  editForm.authorName = track.authorName ?? ''
  editForm.genre = track.genre ?? ''
  editForm.duration = track.duration === null ? '' : String(track.duration)
  editForm.usageRights = [...(track.usageRights ?? [])]
  editOriginalFile.value = null
  editPreviewFile.value = null
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

const toggleUsageRight = (form: TrackForm, value: TrackUsageRight) => {
  form.usageRights = form.usageRights.includes(value)
    ? form.usageRights.filter((item) => item !== value)
    : [...form.usageRights, value]
}

const validateTrackForm = (
  form: TrackForm,
  options: { requireOriginalFile: boolean; originalFile: File | null },
) => {
  if (form.title.trim().length === 0) return 'Tên track là bắt buộc'
  if (form.artistId.trim().length === 0) return 'Artist ID là bắt buộc'
  if (form.usageRights.length === 0) return 'Cần chọn ít nhất 1 quyền sử dụng'
  if (options.requireOriginalFile && !options.originalFile) return 'Cần chọn file MP3 gốc khi tạo track'
  if (options.requireOriginalFile && form.duration.trim().length === 0) {
    return 'Không đọc được thời lượng từ file audio gốc'
  }
  return null
}

const handleCreateAudioFileChange = async (mode: TrackAudioMode, event: Event) => {
  clearMessages()
  const file = extractEventFile(event)

  if (mode === 'original') {
    createOriginalFile.value = file
    setCreateAudioUrl('original', file)
    if (!file) {
      createForm.duration = ''
      return
    }
  } else {
    createPreviewFile.value = file
    setCreateAudioUrl('preview', file)
    if (!file) {
      createPreviewDurationSeconds.value = null
      return
    }
  }

  try {
    ensureAudioFile(file, mode === 'original' ? 'Audio gốc' : 'Audio nghe thử')
    if (mode === 'original') {
      createForm.duration = String(await readAudioDurationFromFile(file))
    } else {
      createPreviewDurationSeconds.value = await readAudioDurationFromFile(file)
    }
  } catch (error) {
    if (mode === 'original') {
      createOriginalFile.value = null
      createForm.duration = ''
      setCreateAudioUrl('original', null)
    } else {
      createPreviewFile.value = null
      createPreviewDurationSeconds.value = null
      setCreateAudioUrl('preview', null)
    }
    setError(error)
  }
}

const handleEditAudioFileChange = async (mode: TrackAudioMode, event: Event) => {
  clearMessages()
  const file = extractEventFile(event)

  if (mode === 'original') {
    editOriginalFile.value = file
    if (!file) {
      editForm.duration = selectedTrack.value?.duration === null || !selectedTrack.value ? '' : String(selectedTrack.value.duration)
      return
    }
  } else {
    editPreviewFile.value = file
    if (!file) return
  }

  try {
    ensureAudioFile(file, mode === 'original' ? 'Audio gốc' : 'Audio nghe thử')
    if (mode === 'original') {
      editForm.duration = String(await readAudioDurationFromFile(file))
    }
  } catch (error) {
    if (mode === 'original') {
      editOriginalFile.value = null
      editForm.duration = selectedTrack.value?.duration === null || !selectedTrack.value ? '' : String(selectedTrack.value.duration)
    } else {
      editPreviewFile.value = null
    }
    setError(error)
  }
}

const fetchTracks = async () => {
  clearMessages()
  isLoading.value = true

  try {
    const { data, meta } = await listAdminTracks({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      sort: filters.sort,
      status: filters.status || undefined,
      genre: filters.genre.trim().length > 0 ? filters.genre.trim() : undefined,
    })

    rows.value = data.items
    totalItems.value = meta.pagination.totalItems
    void prewarmPreviewAudioUrls(data.items.slice(0, 6))
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const fetchSummaryCounts = async () => {
  try {
    const { data } = await getAdminTracksSummary({
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      genre: filters.genre.trim().length > 0 ? filters.genre.trim() : undefined,
    })

    summaryCounts.total = data.total
    summaryCounts.published = data.published
    summaryCounts.hidden = data.hidden
  } catch (error) {
    setError(error)
  }
}

const refreshTrackDashboard = async () => {
  await Promise.all([fetchTracks(), fetchSummaryCounts()])
}

const openCreateDialog = () => {
  selectedTrack.value = null
  editDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = false
  resetCreateForm()
  createDialogVisible.value = true
}

const openEditDialog = (track: Track) => {
  selectedTrack.value = track
  createDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = false
  resetEditForm(track)
  editDialogVisible.value = true
}

const openDetailDialog = (track: Track) => {
  selectedTrack.value = track
  createDialogVisible.value = false
  editDialogVisible.value = false
  uploadDialogVisible.value = false
  detailDialogVisible.value = true
  void ensurePreviewAudioUrl(track)
}

const uploadToSignedUrl = async (url: string, file: File) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'audio/mpeg',
    },
    body: file,
  })

  if (response.ok) return

  const responseText = (await response.text().catch(() => '')).slice(0, 200)
  const detail = responseText.length > 0 ? `: ${responseText}` : ''
  throw new Error(`Tải file lên thất bại (${response.status} ${response.statusText})${detail}`)
}

const uploadTrackAudioFile = async (trackId: string, file: File, mode: TrackAudioMode) => {
  ensureAudioFile(file, mode === 'original' ? 'Audio gốc' : 'Audio nghe thử')

  const { data } =
    mode === 'original' ? await getOriginalUploadUrl(trackId) : await getPreviewUploadUrl(trackId)

  await uploadToSignedUrl(data.uploadUrl, file)
  const confirmed = await confirmAdminTrackAudioUpload(trackId, { mode, fileKey: data.fileKey })
  rows.value = rows.value.map((item) => (item.id === trackId ? confirmed.data : item))
  if (selectedTrack.value?.id === trackId) {
    selectedTrack.value = confirmed.data
  }
  previewAudioUrls.value = {}

  return data
}

const submitCreate = async () => {
  clearMessages()
  const validationError = validateTrackForm(createForm, {
    requireOriginalFile: true,
    originalFile: createOriginalFile.value,
  })

  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isLoading.value = true
  let createdTrack: Track | null = null

  try {
    const { data } = await createAdminTrack({
      title: createForm.title.trim(),
      artistId: createForm.artistId.trim(),
      authorName: createForm.authorName.trim().length > 0 ? createForm.authorName.trim() : undefined,
      genre: createForm.genre.trim().length > 0 ? createForm.genre.trim() : undefined,
      duration: parseDuration(createForm.duration),
      usageRights: [...createForm.usageRights],
    })

    createdTrack = data
    await uploadTrackAudioFile(data.id, createOriginalFile.value as File, 'original')

    if (createPreviewFile.value) {
      await uploadTrackAudioFile(data.id, createPreviewFile.value, 'preview')
    }

    createDialogVisible.value = false
    resetCreateForm()
    successMessage.value = 'Đã tạo track'
    await refreshTrackDashboard()
  } catch (error) {
    if (createdTrack) {
      setError(
        new Error(
          `Track đã được tạo nhưng upload audio thất bại. ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
      await refreshTrackDashboard()
      return
    }
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const submitEdit = async () => {
  if (!selectedTrack.value) return

  clearMessages()
  const validationError = validateTrackForm(editForm, {
    requireOriginalFile: false,
    originalFile: editOriginalFile.value,
  })

  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isLoading.value = true

  try {
    await updateAdminTrack(selectedTrack.value.id, {
      title: editForm.title.trim(),
      artistId: editForm.artistId.trim(),
      authorName: editForm.authorName.trim().length > 0 ? editForm.authorName.trim() : undefined,
      genre: editForm.genre.trim().length > 0 ? editForm.genre.trim() : undefined,
      duration: parseDuration(editForm.duration),
      usageRights: [...editForm.usageRights],
    })

    if (editOriginalFile.value) {
      await uploadTrackAudioFile(selectedTrack.value.id, editOriginalFile.value, 'original')
    }

    if (editPreviewFile.value) {
      await uploadTrackAudioFile(selectedTrack.value.id, editPreviewFile.value, 'preview')
    }

    editDialogVisible.value = false
    successMessage.value = 'Đã cập nhật track'
    await refreshTrackDashboard()
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const togglePublish = async (track: Track) => {
  clearMessages()
  isLoading.value = true
  try {
    if (track.status === 'PUBLISHED') {
      await hideAdminTrack(track.id)
      successMessage.value = 'Đã ẩn track'
    } else {
      await publishAdminTrack(track.id)
      successMessage.value = 'Đã phát hành track'
    }
    await refreshTrackDashboard()
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const openUploadDialog = (track: Track, mode: TrackAudioMode) => {
  selectedTrack.value = track
  createDialogVisible.value = false
  editDialogVisible.value = false
  detailDialogVisible.value = false
  uploadMode.value = mode
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
      ensureAudioFile(file, uploadMode.value === 'original' ? 'Audio gốc' : 'Audio nghe thử')
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
    uploadResult.value = await uploadTrackAudioFile(selectedTrack.value.id, uploadFile.value, uploadMode.value)
    uploadStatus.value = 'done'
    successMessage.value = 'Đã tải file lên'
    await refreshTrackDashboard()
  } catch (error) {
    uploadStatus.value = 'error'
    uploadError.value = error instanceof Error ? error.message : 'Lỗi tải file'
  }
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchTracks()
}

onMounted(refreshTrackDashboard)

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
  revokeObjectUrl(createPreviewAudioUrl.value)
})
</script>

<template>
  <div class="space-y-6 pb-8">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(109,74,255,0.22),transparent_38%),radial-gradient(circle_at_60%_120%,rgba(192,132,252,0.14),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.92))] p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_60%_120%,rgba(168,85,247,0.18),transparent_44%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="space-y-3">
        <div class="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Quản trị viên
        </div>
        <div>
          <h1 class="m-0 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Quản lý track</h1>
        </div>
      </div>

      <button type="button" :class="primaryButtonClass" :disabled="isLoading" @click="openCreateDialog">
        <i class="pi pi-plus mr-2" />
        Thêm track
      </button>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
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
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-950 dark:text-white">Danh sách track</div>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:min-w-[860px]">
          <TrackFilterInput v-model="filters.keyword" icon-class="pi pi-search" placeholder="Track hoặc tác giả" :disabled="isLoading" />
          <TrackFilterSelect v-model="filters.sort" icon-class="pi pi-sort-alt" :options="sortOptions" :disabled="isLoading" />
          <TrackFilterSelect v-model="filters.status" icon-class="pi pi-tag" :options="statusOptions" :disabled="isLoading" />
          <TrackFilterInput v-model="filters.genre" icon-class="pi pi-sliders-h" placeholder="Thể loại" :disabled="isLoading" />
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-6 space-y-4">
        <TrackListItem
          v-for="track in rows"
          :key="track.id"
          :track="track"
          :audio-url="previewAudioUrls[track.id] ?? null"
          :duration-label="formatDuration(track.duration)"
          :is-busy="isLoading"
          @detail="openDetailDialog"
          @edit="openEditDialog"
          @upload-original="(track) => openUploadDialog(track, 'original')"
          @upload-preview="(track) => openUploadDialog(track, 'preview')"
          @toggle-publish="togglePublish"
          @preload-preview="ensurePreviewAudioUrl"
        />

        <div
          v-if="!isLoading && rows.length === 0"
          class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm dark:bg-slate-950 dark:text-violet-300">
            <i class="pi pi-wave-pulse text-xl" />
          </div>
          <div class="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Không có track phù hợp</div>
          <div class="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Thử đổi keyword, status hoặc genre để mở rộng kết quả tìm kiếm.
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} track
        </div>
        <div class="flex items-center gap-2">
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page <= 1" @click="() => void goToPage(pagination.page - 1)">
            <i class="pi pi-arrow-left mr-2" />
            Trước
          </button>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Trang {{ pagination.page }} / {{ totalPages }}
          </div>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page >= totalPages" @click="() => void goToPage(pagination.page + 1)">
            Sau
            <i class="pi pi-arrow-right ml-2" />
          </button>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="createDialogVisible" modal class="w-[min(1040px,96vw)]">
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
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Artist ID</span>
              <input v-model="createForm.artistId" :class="fieldClass" placeholder="UUID" />
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tên tác giả hiển thị</span>
              <input v-model="createForm.authorName" :class="fieldClass" placeholder="Có thể bỏ trống" />
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thể loại</span>
              <input v-model="createForm.genre" :class="fieldClass" placeholder="Có thể bỏ trống" />
            </label>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <i class="pi pi-tags text-violet-500" />
              Quyền sử dụng
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="option in usageRightOptions"
                :key="`create-right-${option.value}`"
                type="button"
                class="rounded-2xl border px-4 py-3 text-left text-sm font-medium transition"
                :class="createForm.usageRights.includes(option.value)
                  ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'"
                @click="toggleUsageRight(createForm, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <i class="pi pi-volume-up text-violet-500" />
            Nghe thử audio
          </div>

          <div class="grid gap-4">
            <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-slate-900 dark:text-white">MP3 gốc</div>
                <div class="flex flex-wrap gap-2">
                  <span v-if="createOriginalFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{{ createOriginalFile.name }}</span>
                  <span v-if="createDurationDisplay" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ createDurationDisplay }}</span>
                </div>
              </div>
              <div class="mt-4">
                <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="(event) => void handleCreateAudioFileChange('original', event)" />
              </div>
              <div class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <TrackWavePreview :audio-url="createOriginalAudioUrl" :disabled="!createOriginalAudioUrl" :right-label="createDurationDisplay" />
              </div>
            </article>

            <article class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-slate-900 dark:text-white">MP3 nghe thử</div>
                <div class="flex flex-wrap gap-2">
                  <span v-if="createPreviewFile" class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{{ createPreviewFile.name }}</span>
                  <span v-if="createPreviewDurationDisplay" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ createPreviewDurationDisplay }}</span>
                </div>
              </div>
              <div class="mt-4">
                <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="(event) => void handleCreateAudioFileChange('preview', event)" />
              </div>
              <div class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <TrackWavePreview :audio-url="createPreviewAudioUrl" :disabled="!createPreviewAudioUrl" :right-label="createPreviewDurationDisplay" />
              </div>
            </article>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isLoading" @click="submitCreate">Tạo track</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal class="w-[min(900px,94vw)]" header="Chỉnh sửa track">
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tên track</span>
            <input v-model="editForm.title" :class="fieldClass" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Artist ID</span>
            <input v-model="editForm.artistId" :class="fieldClass" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tên tác giả hiển thị</span>
            <input v-model="editForm.authorName" :class="fieldClass" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thể loại</span>
            <input v-model="editForm.genre" :class="fieldClass" />
          </label>
        </div>

        <label class="block space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thay MP3 gốc</span>
          <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="(event) => void handleEditAudioFileChange('original', event)" />
          <span class="text-sm text-slate-500 dark:text-slate-400">Nếu chọn file mới, duration sẽ cập nhật theo audio này.</span>
          <span v-if="editOriginalFile" class="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{{ editOriginalFile.name }}</span>
        </label>

        <label class="block space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thay MP3 nghe thử</span>
          <input type="file" accept=".mp3,audio/*" :class="fileInputClass" @change="(event) => void handleEditAudioFileChange('preview', event)" />
          <span class="text-sm text-slate-500 dark:text-slate-400">Tùy chọn. Dùng để thay preview audio hiện tại.</span>
          <span v-if="editPreviewFile" class="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{{ editPreviewFile.name }}</span>
        </label>

        <label class="block space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Thời lượng (giây)</span>
          <input v-model="editForm.duration" :class="fieldClass" readonly />
        </label>

        <div class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Quyền sử dụng</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in usageRightOptions"
              :key="`edit-right-${option.value}`"
              type="button"
              class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
              :class="editForm.usageRights.includes(option.value)
                ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'"
              @click="toggleUsageRight(editForm, option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="editDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isLoading" @click="submitEdit">Lưu thay đổi</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="detailDialogVisible" modal class="w-[min(1040px,96vw)]">
      <template #header>
        <div v-if="selectedTrack" class="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg font-semibold text-white shadow-lg shadow-violet-500/20">
              {{ selectedTrack.title.slice(0, 1).toUpperCase() }}
            </div>
            <div>
              <div class="text-xl font-semibold text-slate-950 dark:text-white">{{ selectedTrack.title }}</div>
              <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ selectedTrack.authorName || 'Chưa có tác giả' }} · {{ selectedTrack.genre || 'Chưa có thể loại' }}
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
              {{ formatTrackStatusLabel(selectedTrack.status) }}
            </span>
            <button type="button" :class="secondaryButtonClass" :disabled="isLoading" @click="togglePublish(selectedTrack)">
              {{ selectedTrack.status === 'PUBLISHED' ? 'Ẩn track' : 'Phát hành track' }}
            </button>
          </div>
        </div>
      </template>

      <div v-if="selectedTrack" class="space-y-4">
        <section class="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <TrackWavePreview :audio-url="previewAudioUrls[selectedTrack.id] ?? null" :disabled="!selectedTrack.previewAudioKey" />
          <div class="mt-3 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{{ formatDuration(selectedTrack.duration) }}</span>
            <span>·</span>
            <span>{{ selectedTrack.genre || 'Chưa có thể loại' }}</span>
          </div>
        </section>

        <section class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-2">
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Mô tả track hiện tại</div>
            <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ selectedTrackDescription }}
            </p>

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
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Thông tin chung</div>
            <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div><span class="font-semibold text-slate-900 dark:text-white">Artist ID:</span> <span class="font-mono">{{ selectedTrack.artistId }}</span></div>
              <div><span class="font-semibold text-slate-900 dark:text-white">Tên tác giả:</span> {{ selectedTrack.authorName || 'Chưa có' }}</div>
              <div><span class="font-semibold text-slate-900 dark:text-white">Thể loại:</span> {{ selectedTrack.genre || 'Chưa có thể loại' }}</div>
              <div><span class="font-semibold text-slate-900 dark:text-white">Thời lượng:</span> {{ formatDuration(selectedTrack.duration) }}</div>
              <div><span class="font-semibold text-slate-900 dark:text-white">Cập nhật lúc:</span> {{ formatDateTime(selectedTrack.updatedAt) }}</div>
            </div>
          </article>

          <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tài nguyên audio</div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {{ selectedTrack.originalAudioKey ? 'MP3 gốc sẵn sàng' : 'Thiếu MP3 gốc' }}
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {{ selectedTrack.previewAudioKey ? 'MP3 nghe thử sẵn sàng' : 'Thiếu MP3 nghe thử' }}
              </span>
            </div>

            <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-900 dark:text-white">Key audio gốc:</span>
                <span class="min-w-0 flex-1 truncate font-mono">{{ selectedTrack.originalAudioKey || 'Chưa có' }}</span>
                <button v-if="selectedTrack.originalAudioKey" type="button" :class="iconButtonClass" @click="() => void copyToClipboard(selectedTrack?.originalAudioKey ?? null, 'key audio gốc')">
                  <i class="pi pi-copy" />
                </button>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-900 dark:text-white">Key audio nghe thử:</span>
                <span class="min-w-0 flex-1 truncate font-mono">{{ selectedTrack.previewAudioKey || 'Chưa có' }}</span>
                <button v-if="selectedTrack.previewAudioKey" type="button" :class="iconButtonClass" @click="() => void copyToClipboard(selectedTrack?.previewAudioKey ?? null, 'key audio nghe thử')">
                  <i class="pi pi-copy" />
                </button>
              </div>
            </div>
          </article>

          <article class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-2">
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quyền sử dụng</div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="right in selectedTrackUsageRights"
                :key="`${selectedTrack.id}-detail-right-${right}`"
                class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
              >
                {{ formatUsageRightLabel(right) }}
              </span>
              <span v-if="selectedTrackUsageRights.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Chưa gán quyền sử dụng</span>
            </div>
          </article>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="detailDialogVisible = false">Đóng</button>
          <button v-if="selectedTrack" type="button" :class="secondaryButtonClass" @click="openEditDialog(selectedTrack)">Chỉnh sửa</button>
          <button v-if="selectedTrack" type="button" :class="primaryButtonClass" @click="openUploadDialog(selectedTrack, 'preview')">Tải audio nghe thử</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="uploadDialogVisible" modal class="w-[min(720px,92vw)]" :header="uploadMode === 'original' ? 'Tải audio gốc' : 'Tải audio nghe thử'">
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
          <button type="button" :class="primaryButtonClass" :disabled="!uploadFile || uploadStatus === 'requesting' || uploadStatus === 'uploading'" @click="submitUpload">
            Tải lên
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
