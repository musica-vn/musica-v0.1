<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../shared/api/http'
import type { Track, TrackSortValue, TrackStatus } from '../../features/tracks/tracks.types'
import {
  createAdminTrack,
  getOriginalUploadUrl,
  getPreviewPlaybackUrl,
  getPreviewUploadUrl,
  hideAdminTrack,
  listAdminTracks,
  publishAdminTrack,
  updateAdminTrack,
} from '../../features/tracks/tracks.api'
import TrackWavePreview from '../../features/tracks/components/TrackWavePreview.vue'

type TrackAudioMode = 'original' | 'preview'

type TrackForm = {
  title: string
  artistId: string
  authorName: string
  genre: string
  duration: string
  usageRights: string[]
}

const defaultSort: TrackSortValue = 'createdAt:desc'
const usageRightOptions = [
  { label: 'Social Use', value: 'SOCIAL_USE' },
  { label: 'Ads Use', value: 'ADS_USE' },
  { label: 'YouTube Use', value: 'YOUTUBE_USE' },
  { label: 'Event Use', value: 'EVENT_USE' },
  { label: 'Commercial Use', value: 'COMMERCIAL_USE' },
] as const

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rows = ref<Track[]>([])
const totalItems = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 20,
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
  { label: 'Newest first', value: 'createdAt:desc' },
  { label: 'Oldest first', value: 'createdAt:asc' },
  { label: 'Recently updated', value: 'updatedAt:desc' },
  { label: 'Least recently updated', value: 'updatedAt:asc' },
  { label: 'Title A-Z', value: 'title:asc' },
  { label: 'Title Z-A', value: 'title:desc' },
  { label: 'Status A-Z', value: 'status:asc' },
  { label: 'Status Z-A', value: 'status:desc' },
  { label: 'Genre A-Z', value: 'genre:asc' },
  { label: 'Genre Z-A', value: 'genre:desc' },
]

const statusOptions: Array<{ label: string; value: TrackStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'PUBLISHED', value: 'PUBLISHED' },
  { label: 'HIDDEN', value: 'HIDDEN' },
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

const uploadMode = ref<TrackAudioMode>('original')
const uploadFile = ref<File | null>(null)
const uploadStatus = ref<'idle' | 'requesting' | 'uploading' | 'done' | 'error'>('idle')
const uploadResult = ref<{ fileKey: string; uploadUrl: string } | null>(null)
const uploadError = ref<string | null>(null)
const previewAudioUrls = ref<Record<string, string>>({})
const previewAudioLoading = ref<Record<string, boolean>>({})

const tableFirst = computed(() => (pagination.page - 1) * pagination.pageSize)
const publishedCount = computed(() => rows.value.filter((track) => track.status === 'PUBLISHED').length)
const hiddenCount = computed(() => rows.value.filter((track) => track.status === 'HIDDEN').length)
const summaryCards = computed(() => [
  {
    title: 'Total Tracks',
    value: totalItems.value,
    description: 'All records matched by current filter',
    icon: 'pi pi-wave-pulse',
    tone: 'primary',
  },
  {
    title: 'Published',
    value: publishedCount.value,
    description: 'Ready for buyers to browse',
    icon: 'pi pi-check-circle',
    tone: 'success',
  },
  {
    title: 'Hidden',
    value: hiddenCount.value,
    description: 'Draft or temporarily hidden',
    icon: 'pi pi-eye-slash',
    tone: 'warning',
  },
])

const formatDuration = (duration: number | null) => {
  if (typeof duration !== 'number' || Number.isNaN(duration)) return 'N/A'
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

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = `${error.code}: ${error.message}`
    return
  }
  if (error instanceof Error) {
    errorMessage.value = error.message
    return
  }
  errorMessage.value = 'Unknown error'
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
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

const resetCreateForm = () => {
  createForm.title = ''
  createForm.artistId = ''
  createForm.authorName = ''
  createForm.genre = ''
  createForm.duration = ''
  createForm.usageRights = []
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

const toggleUsageRight = (form: TrackForm, value: string) => {
  form.usageRights = form.usageRights.includes(value)
    ? form.usageRights.filter((item) => item !== value)
    : [...form.usageRights, value]
}

const validateTrackForm = (
  form: TrackForm,
  options: { requireOriginalFile: boolean; originalFile: File | null },
) => {
  if (form.title.trim().length === 0) return 'Title là bắt buộc'
  if (form.artistId.trim().length === 0) return 'Artist ID là bắt buộc'
  if (form.usageRights.length === 0) return 'Cần chọn ít nhất 1 usage right'
  if (options.requireOriginalFile && !options.originalFile) return 'Cần chọn original mp3 khi tạo track'
  if (options.requireOriginalFile && form.duration.trim().length === 0) {
    return 'Không đọc được duration từ original audio'
  }
  return null
}

const handleCreateAudioFileChange = async (mode: TrackAudioMode, event: Event) => {
  clearMessages()
  const file = extractEventFile(event)

  if (mode === 'original') {
    createOriginalFile.value = file
    if (!file) {
      createForm.duration = ''
      return
    }
  } else {
    createPreviewFile.value = file
    if (!file) return
  }

  try {
    ensureAudioFile(file, mode === 'original' ? 'Original audio' : 'Preview audio')
    if (mode === 'original') {
      createForm.duration = String(await readAudioDurationFromFile(file))
    }
  } catch (error) {
    if (mode === 'original') {
      createOriginalFile.value = null
      createForm.duration = ''
    } else {
      createPreviewFile.value = null
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
    ensureAudioFile(file, mode === 'original' ? 'Original audio' : 'Preview audio')
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
  // #region debug-point A:tracks-fetch-start
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'TrackManagementPage.vue:fetchTracks:start', msg: '[DEBUG] tracks fetch start', data: { page: pagination.page, pageSize: pagination.pageSize, keyword: filters.keyword, sort: filters.sort, status: filters.status, genre: filters.genre }, ts: Date.now() }) }).catch(() => {})
  // #endregion
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
    // #region debug-point A:tracks-fetch-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'TrackManagementPage.vue:fetchTracks:success', msg: '[DEBUG] tracks fetch success', data: { itemCount: data.items.length, totalItems: meta.pagination.totalItems }, ts: Date.now() }) }).catch(() => {})
    // #endregion
  } catch (error) {
    // #region debug-point A:tracks-fetch-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'TrackManagementPage.vue:fetchTracks:error', msg: '[DEBUG] tracks fetch error', data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    setError(error)
  } finally {
    isLoading.value = false
  }
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
  throw new Error(`Upload failed (${response.status} ${response.statusText})${detail}`)
}

const uploadTrackAudioFile = async (trackId: string, file: File, mode: TrackAudioMode) => {
  ensureAudioFile(file, mode === 'original' ? 'Original audio' : 'Preview audio')
  // #region debug-point B:upload-helper-start
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:uploadTrackAudioFile:start', msg: '[DEBUG] upload helper start', data: { trackId, fileName: file.name, fileType: file.type, fileSize: file.size, mode }, ts: Date.now() }) }).catch(() => {})
  // #endregion

  const { data } =
    mode === 'original' ? await getOriginalUploadUrl(trackId) : await getPreviewUploadUrl(trackId)

  await uploadToSignedUrl(data.uploadUrl, file)
  previewAudioUrls.value = {}

  // #region debug-point B:upload-helper-success
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:uploadTrackAudioFile:success', msg: '[DEBUG] upload helper success', data: { trackId, fileKey: data.fileKey, mode }, ts: Date.now() }) }).catch(() => {})
  // #endregion

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

  // #region debug-point D:create-track-start
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitCreate:start', msg: '[DEBUG] create track start', data: { title: createForm.title, artistId: createForm.artistId, genre: createForm.genre, duration: createForm.duration, usageRights: createForm.usageRights, hasOriginalFile: Boolean(createOriginalFile.value), hasPreviewFile: Boolean(createPreviewFile.value) }, ts: Date.now() }) }).catch(() => {})
  // #endregion

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
    successMessage.value = 'Created'
    // #region debug-point D:create-track-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitCreate:success', msg: '[DEBUG] create track success', data: { trackId: data.id, title: data.title }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    await fetchTracks()
  } catch (error) {
    // #region debug-point D:create-track-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitCreate:error', msg: '[DEBUG] create track error', data: { createdTrackId: createdTrack?.id ?? null, error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    if (createdTrack) {
      setError(
        new Error(
          `Track đã được tạo nhưng upload audio thất bại. ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
      await fetchTracks()
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

  // #region debug-point D:update-track-start
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitEdit:start', msg: '[DEBUG] update track start', data: { trackId: selectedTrack.value.id, title: editForm.title, genre: editForm.genre, duration: editForm.duration, usageRights: editForm.usageRights, replaceOriginalFile: Boolean(editOriginalFile.value), replacePreviewFile: Boolean(editPreviewFile.value) }, ts: Date.now() }) }).catch(() => {})
  // #endregion

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
    successMessage.value = 'Updated'
    // #region debug-point D:update-track-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitEdit:success', msg: '[DEBUG] update track success', data: { trackId: selectedTrack.value.id }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    await fetchTracks()
  } catch (error) {
    // #region debug-point D:update-track-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'D', location: 'TrackManagementPage.vue:submitEdit:error', msg: '[DEBUG] update track error', data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {})
    // #endregion
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
      successMessage.value = 'Hidden'
    } else {
      await publishAdminTrack(track.id)
      successMessage.value = 'Published'
    }
    await fetchTracks()
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

  if (file) {
    try {
      ensureAudioFile(file, uploadMode.value === 'original' ? 'Original audio' : 'Preview audio')
    } catch (error) {
      uploadFile.value = null
      uploadError.value = error instanceof Error ? error.message : 'Upload error'
      return
    }
  }

  // #region debug-point B:upload-file-selected
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:onUploadFileChange', msg: '[DEBUG] upload file selected', data: { fileName: file?.name ?? null, fileType: file?.type ?? null, fileSize: file?.size ?? null, mode: uploadMode.value }, ts: Date.now() }) }).catch(() => {})
  // #endregion
}

const submitUpload = async () => {
  if (!selectedTrack.value || !uploadFile.value) return

  clearMessages()
  uploadStatus.value = 'requesting'
  uploadError.value = null
  // #region debug-point B:upload-start
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:submitUpload:start', msg: '[DEBUG] upload start', data: { trackId: selectedTrack.value.id, fileName: uploadFile.value.name, fileType: uploadFile.value.type, fileSize: uploadFile.value.size, mode: uploadMode.value }, ts: Date.now() }) }).catch(() => {})
  // #endregion

  try {
    const data = await uploadTrackAudioFile(selectedTrack.value.id, uploadFile.value, uploadMode.value)

    uploadResult.value = data
    uploadStatus.value = 'done'
    successMessage.value = 'Uploaded'
    // #region debug-point B:upload-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:submitUpload:success', msg: '[DEBUG] upload success', data: { fileKey: data.fileKey, mode: uploadMode.value }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    await fetchTracks()
  } catch (error) {
    uploadStatus.value = 'error'
    // #region debug-point B:upload-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'post-fix', hypothesisId: 'B', location: 'TrackManagementPage.vue:submitUpload:error', msg: '[DEBUG] upload error', data: { error: error instanceof Error ? error.message : String(error), mode: uploadMode.value }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    uploadError.value = error instanceof Error ? error.message : 'Upload error'
  }
}

onMounted(fetchTracks)
</script>

<template>
  <div class="page">
    <section class="hero">
      <div>
        <div class="eyebrow">Admin Panel</div>
        <h1 class="hero-title">Track Management</h1>
        <p class="hero-copy">
          Theo dõi trạng thái phát hành và preview audio theo kiểu media catalog tinh tế, tối giản thông tin trên list và dồn chi tiết vào popup.
        </p>
      </div>
      <div class="hero-actions">
        <Button label="Add Track" icon="pi pi-plus" :disabled="isLoading" @click="openCreateDialog" />
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.title" class="summary-card" :data-tone="card.tone">
        <div class="summary-card__meta">
          <span class="summary-card__title">{{ card.title }}</span>
          <span class="summary-card__icon">
            <i :class="card.icon" />
          </span>
        </div>
        <div class="summary-card__value">{{ card.value }}</div>
        <div class="summary-card__desc">{{ card.description }}</div>
      </article>
    </section>

    <Card class="dashboard-card">
      <template #content>
        <div class="panel-header">
          <div>
            <div class="panel-title">Tracks Directory</div>
            <div class="panel-copy">Search, filter và thực hiện hành động quản trị trực tiếp trên từng bản ghi.</div>
          </div>
        </div>

        <div class="toolbar">
          <div class="filters-panel">
            <div class="filters-panel__fields">
              <label class="filter-field filter-field--search">
                <span class="filter-field__label">Search</span>
                <span class="p-input-icon-left filter-search">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="filters.keyword"
                    placeholder="Track or author"
                    @keydown.enter="() => { pagination.page = 1; fetchTracks() }"
                  />
                </span>
              </label>
              <label class="filter-field">
                <span class="filter-field__label">Sort</span>
                <Dropdown v-model="filters.sort" :options="sortOptions" optionLabel="label" optionValue="value" />
              </label>
              <label class="filter-field">
                <span class="filter-field__label">Status</span>
                <Dropdown v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value" />
              </label>
              <label class="filter-field">
                <span class="filter-field__label">Genre</span>
                <InputText v-model="filters.genre" placeholder="Genre" />
              </label>
            </div>
            <div class="filters-panel__actions">
              <Button :disabled="isLoading" label="Apply" severity="secondary" @click="() => { pagination.page = 1; fetchTracks() }" />
              <Button
                :disabled="isLoading"
                label="Reset"
                text
                @click="() => {
                  filters.keyword = ''
                  filters.sort = defaultSort
                  filters.status = ''
                  filters.genre = ''
                  pagination.page = 1
                  fetchTracks()
                }"
              />
            </div>
          </div>
        </div>

        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>

        <DataTable
          :value="rows"
          size="small"
          stripedRows
          class="dashboard-table"
          :loading="isLoading"
          paginator
          lazy
          :rows="pagination.pageSize"
          :first="tableFirst"
          :totalRecords="totalItems"
          @page="(e) => { pagination.page = e.page + 1; pagination.pageSize = e.rows; fetchTracks() }"
        >
          <Column header="Track">
            <template #body="{ data }">
              <div class="track-cell track-cell--rich">
                <div class="track-avatar">{{ data.title.slice(0, 1).toUpperCase() }}</div>
                <div class="track-main">
                  <div class="track-main__top">
                    <div>
                      <div class="cell-title">{{ data.title }}</div>
                      <div class="cell-subtitle">
                        {{ data.authorName || 'Unknown author' }} • {{ data.genre || 'No genre' }}
                      </div>
                    </div>
                    <div class="track-meta-inline">
                      <span>{{ formatDateTime(data.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="wave-row">
                    <TrackWavePreview
                      :audio-url="previewAudioUrls[data.id] ?? null"
                      compact
                      :disabled="!data.previewAudioKey"
                      @mouseenter="ensurePreviewAudioUrl(data)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </Column>
          <Column header="Details">
            <template #body="{ data }">
              <div class="cell-stack">
                <span class="cell-title">{{ formatDuration(data.duration) }}</span>
                <span class="cell-subtitle">{{ data.previewAudioKey ? 'Preview ready' : 'No preview yet' }}</span>
              </div>
            </template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <button
                type="button"
                class="status-toggle"
                :class="{ 'status-toggle--published': data.status === 'PUBLISHED' }"
                :disabled="isLoading"
                @click="togglePublish(data)"
              >
                <span class="status-toggle__thumb" />
                <span class="status-toggle__label">{{ data.status === 'PUBLISHED' ? 'Live' : 'Hidden' }}</span>
              </button>
            </template>
          </Column>
          <Column header="Actions">
            <template #body="{ data }">
              <div class="row-actions">
                <Button size="small" rounded text icon="pi pi-eye" severity="secondary" :disabled="isLoading" @click="openDetailDialog(data)" />
                <Button size="small" rounded text icon="pi pi-pencil" severity="secondary" :disabled="isLoading" @click="openEditDialog(data)" />
                <Button size="small" rounded text icon="pi pi-upload" severity="contrast" :disabled="isLoading" @click="openUploadDialog(data, 'original')" />
                <Button size="small" rounded text icon="pi pi-headphones" severity="contrast" :disabled="isLoading" @click="openUploadDialog(data, 'preview')" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog v-model:visible="createDialogVisible" modal header="Create Track" class="dialog">
      <div class="form">
        <div class="form-grid">
          <label class="form-field">
            <span class="form-field__label">Title</span>
            <InputText v-model="createForm.title" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Artist ID</span>
            <InputText v-model="createForm.artistId" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Author Name</span>
            <InputText v-model="createForm.authorName" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Genre</span>
            <InputText v-model="createForm.genre" />
          </label>
        </div>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Original MP3</span>
          <input type="file" accept=".mp3,audio/*" @change="(event) => void handleCreateAudioFileChange('original', event)" />
          <span class="form-field__hint">Bắt buộc. Duration được đọc tự động từ file này.</span>
          <span v-if="createOriginalFile" class="file-pill">{{ createOriginalFile.name }}</span>
        </label>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Preview MP3</span>
          <input type="file" accept=".mp3,audio/*" @change="(event) => void handleCreateAudioFileChange('preview', event)" />
          <span class="form-field__hint">Tùy chọn. Dùng cho waveform và nghe thử trong admin.</span>
          <span v-if="createPreviewFile" class="file-pill">{{ createPreviewFile.name }}</span>
        </label>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Duration (seconds)</span>
          <InputText v-model="createForm.duration" readonly />
        </label>

        <div class="form-field form-field--wide">
          <span class="form-field__label">Usage Rights</span>
          <div class="rights-selector">
            <button
              v-for="option in usageRightOptions"
              :key="`create-right-${option.value}`"
              type="button"
              class="right-chip"
              :class="{ 'right-chip--active': createForm.usageRights.includes(option.value) }"
              @click="toggleUsageRight(createForm, option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="createDialogVisible = false" />
        <Button label="Create" :disabled="isLoading" @click="submitCreate" />
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Edit Track" class="dialog">
      <div class="form">
        <div class="form-grid">
          <label class="form-field">
            <span class="form-field__label">Title</span>
            <InputText v-model="editForm.title" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Artist ID</span>
            <InputText v-model="editForm.artistId" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Author Name</span>
            <InputText v-model="editForm.authorName" />
          </label>

          <label class="form-field">
            <span class="form-field__label">Genre</span>
            <InputText v-model="editForm.genre" />
          </label>
        </div>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Replace Original MP3</span>
          <input type="file" accept=".mp3,audio/*" @change="(event) => void handleEditAudioFileChange('original', event)" />
          <span class="form-field__hint">Nếu chọn file mới, duration sẽ được cập nhật theo audio này.</span>
          <span v-if="editOriginalFile" class="file-pill">{{ editOriginalFile.name }}</span>
        </label>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Replace Preview MP3</span>
          <input type="file" accept=".mp3,audio/*" @change="(event) => void handleEditAudioFileChange('preview', event)" />
          <span class="form-field__hint">Tùy chọn. Dùng để thay preview audio hiện tại.</span>
          <span v-if="editPreviewFile" class="file-pill">{{ editPreviewFile.name }}</span>
        </label>

        <label class="form-field form-field--wide">
          <span class="form-field__label">Duration (seconds)</span>
          <InputText v-model="editForm.duration" readonly />
        </label>

        <div class="form-field form-field--wide">
          <span class="form-field__label">Usage Rights</span>
          <div class="rights-selector">
            <button
              v-for="option in usageRightOptions"
              :key="`edit-right-${option.value}`"
              type="button"
              class="right-chip"
              :class="{ 'right-chip--active': editForm.usageRights.includes(option.value) }"
              @click="toggleUsageRight(editForm, option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="editDialogVisible = false" />
        <Button label="Save" :disabled="isLoading" @click="submitEdit" />
      </template>
    </Dialog>

    <Dialog v-model:visible="detailDialogVisible" modal header="Track Details" class="dialog detail-dialog">
      <div v-if="selectedTrack" class="detail-layout">
        <section class="detail-hero">
          <div class="detail-hero__left">
            <div class="track-avatar track-avatar--large">{{ selectedTrack.title.slice(0, 1).toUpperCase() }}</div>
            <div>
              <div class="detail-title">{{ selectedTrack.title }}</div>
              <div class="detail-subtitle">
                {{ selectedTrack.authorName || 'Unknown author' }} • {{ selectedTrack.genre || 'No genre' }}
              </div>
            </div>
          </div>
          <button
            type="button"
            class="status-toggle"
            :class="{ 'status-toggle--published': selectedTrack.status === 'PUBLISHED' }"
            :disabled="isLoading"
            @click="togglePublish(selectedTrack)"
          >
            <span class="status-toggle__thumb" />
            <span class="status-toggle__label">{{ selectedTrack.status === 'PUBLISHED' ? 'Live' : 'Hidden' }}</span>
          </button>
        </section>

        <section class="detail-wave">
          <TrackWavePreview :audio-url="previewAudioUrls[selectedTrack.id] ?? null" :disabled="!selectedTrack.previewAudioKey" />
          <div class="detail-wave__meta">
            <span>{{ formatDuration(selectedTrack.duration) }}</span>
            <span>{{ selectedTrack.genre || 'No genre' }}</span>
          </div>
        </section>

        <section class="detail-grid">
          <article class="detail-card">
            <div class="detail-card__title">Metadata</div>
            <div class="detail-kv"><strong>Artist:</strong> {{ selectedTrack.authorName || 'Unknown artist profile' }}</div>
            <div class="detail-kv"><strong>Genre:</strong> {{ selectedTrack.genre || 'No genre' }}</div>
            <div class="detail-kv"><strong>Duration:</strong> {{ formatDuration(selectedTrack.duration) }}</div>
            <div class="detail-kv"><strong>Created At:</strong> {{ formatDateTime(selectedTrack.createdAt) }}</div>
            <div class="detail-kv"><strong>Updated At:</strong> {{ formatDateTime(selectedTrack.updatedAt) }}</div>
          </article>

          <article class="detail-card">
            <div class="detail-card__title">Assets</div>
            <div class="detail-badges">
              <Tag :value="selectedTrack.originalAudioKey ? 'Original ready' : 'Original missing'" :severity="selectedTrack.originalAudioKey ? 'success' : 'warning'" />
              <Tag :value="selectedTrack.previewAudioKey ? 'Preview ready' : 'Preview missing'" :severity="selectedTrack.previewAudioKey ? 'success' : 'warning'" />
            </div>
            <div class="detail-kv"><strong>Original key:</strong> {{ selectedTrack.originalAudioKey || 'Missing' }}</div>
            <div class="detail-kv"><strong>Preview key:</strong> {{ selectedTrack.previewAudioKey || 'Missing' }}</div>
          </article>

          <article class="detail-card detail-card--wide">
            <div class="detail-card__title">Usage Rights</div>
            <div class="tag-list">
              <Tag
                v-for="right in selectedTrack.usageRights"
                :key="`${selectedTrack.id}-detail-right-${right}`"
                :value="right"
                severity="info"
              />
              <span v-if="selectedTrack.usageRights.length === 0" class="cell-subtitle">No usage rights assigned</span>
            </div>
          </article>
        </section>
      </div>

      <template #footer>
        <Button icon="pi pi-times" severity="secondary" text rounded @click="detailDialogVisible = false" />
        <Button v-if="selectedTrack" icon="pi pi-pencil" severity="secondary" text rounded @click="openEditDialog(selectedTrack)" />
        <Button v-if="selectedTrack" icon="pi pi-upload" severity="contrast" text rounded @click="openUploadDialog(selectedTrack, 'preview')" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="uploadDialogVisible"
      modal
      :header="uploadMode === 'original' ? 'Upload Original' : 'Upload Preview'"
      class="dialog"
    >
      <div class="form">
        <label class="form-field form-field--wide">
          <span class="form-field__label">File</span>
          <input type="file" accept=".mp3,audio/*" @change="onUploadFileChange" />
          <span class="form-field__hint">Chỉ nhận audio/mp3 cho bucket private của track.</span>
        </label>

        <Message v-if="uploadError" severity="error">{{ uploadError }}</Message>
        <Message v-if="uploadStatus === 'done'" severity="success">Upload done</Message>

        <div v-if="uploadResult" class="upload-result">
          <div><strong>File Key:</strong> {{ uploadResult.fileKey }}</div>
        </div>
      </div>

      <template #footer>
        <Button label="Close" severity="secondary" @click="uploadDialogVisible = false" />
        <Button
          label="Upload"
          :disabled="!uploadFile || uploadStatus === 'requesting' || uploadStatus === 'uploading'"
          @click="submitUpload"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 24px 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(109, 74, 255, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 240, 255, 0.96));
  border: 1px solid rgba(109, 74, 255, 0.08);
  box-shadow: 0 18px 40px rgba(38, 27, 80, 0.08);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(109, 74, 255, 0.1);
  color: #6d4aff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-title {
  margin: 12px 0 8px;
  font-size: 32px;
  line-height: 1.15;
}

.hero-copy {
  max-width: 760px;
  margin: 0;
  color: #6b7280;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 18px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #ece9f8;
  box-shadow: 0 14px 30px rgba(38, 27, 80, 0.06);
}

.summary-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-card__title {
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(109, 74, 255, 0.12);
  color: #6d4aff;
}

.summary-card__value {
  margin-top: 18px;
  font-size: 28px;
  font-weight: 700;
}

.summary-card__desc {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.dashboard-card:deep(.p-card-body) {
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
}

.panel-copy {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: stretch;
  margin-bottom: 14px;
  flex-wrap: nowrap;
}

.filters-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #ece9f8;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfbff, #f8f6ff);
}

.filters-panel__fields {
  display: grid;
  grid-template-columns: minmax(260px, 1.5fr) minmax(180px, 1fr) minmax(140px, 0.8fr) minmax(160px, 0.9fr);
  gap: 12px;
  flex: 1;
}

.filters-panel__actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.filter-field {
  display: grid;
  gap: 8px;
}

.filter-field--search {
  min-width: 0;
}

.filter-field__label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-search {
  width: 100%;
}

.dashboard-table:deep(.p-datatable-table-container) {
  border-radius: 18px;
  overflow: hidden;
}

.dashboard-table:deep(thead th) {
  background: #faf9fe;
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dashboard-table:deep(tbody tr) {
  background: #fff;
}

.row-actions {
  display: flex;
  gap: 2px;
  flex-wrap: nowrap;
}

.track-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.track-cell--rich {
  min-width: 340px;
}

.track-main {
  display: grid;
  gap: 10px;
  width: 100%;
}

.track-main__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.track-meta-inline {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 12px;
}

.wave-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.track-cell--rich :deep(.wave-preview) {
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr);
}

.track-cell--rich :deep(.wave-preview__waveform) {
  min-width: 420px;
}

.track-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #7c5cff, #5e38ff);
  color: #fff;
  font-weight: 700;
}

.track-avatar--large {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  font-size: 24px;
}

.cell-stack {
  display: grid;
  gap: 4px;
}

.cell-title {
  font-weight: 600;
  color: #111827;
}

.cell-subtitle {
  color: #6b7280;
  font-size: 12px;
}

.tag-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dialog {
  width: min(900px, 92vw);
}

.detail-dialog {
  width: min(980px, 95vw);
}

.form {
  display: grid;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-field {
  display: grid;
  gap: 8px;
}

.form-field--wide {
  grid-column: 1 / -1;
}

.form-field__label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-field__hint {
  color: #6b7280;
  font-size: 12px;
}

.rights-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.right-chip {
  border: 1px solid #ddd6fe;
  background: #f8f6ff;
  color: #5b21b6;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.right-chip--active {
  background: #6d4aff;
  border-color: #6d4aff;
  color: #fff;
}

.file-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(109, 74, 255, 0.1);
  color: #5b21b6;
  font-size: 12px;
  font-weight: 600;
}

.upload-result {
  display: grid;
  gap: 6px;
}

.detail-layout {
  display: grid;
  gap: 18px;
}

.detail-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.detail-hero__left {
  display: flex;
  gap: 14px;
  align-items: center;
}

.detail-title {
  font-size: 24px;
  font-weight: 700;
}

.detail-subtitle {
  margin-top: 6px;
  color: #6b7280;
}

.detail-wave {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, #faf9fe, #f5f3ff);
  border: 1px solid #ece9f8;
}

.detail-wave__meta {
  display: flex;
  gap: 14px;
  margin-top: 12px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 13px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid #ece9f8;
  background: #fff;
}

.detail-card--wide {
  grid-column: 1 / -1;
}

.detail-card__title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 700;
}

.detail-kv {
  margin-top: 8px;
  color: #374151;
  word-break: break-word;
}

.detail-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.status-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
}

.status-toggle--published {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #047857;
}

.status-toggle__thumb {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #9ca3af;
  transition: transform 0.2s ease;
}

.status-toggle--published .status-toggle__thumb {
  background: #10b981;
}

.status-toggle__label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .filters-panel {
    flex-direction: column;
  }

  .filters-panel__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .filters-panel__fields {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .track-main__top,
  .detail-hero,
  .detail-hero__left,
  .wave-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .row-actions {
    flex-wrap: wrap;
  }

  .track-cell--rich :deep(.wave-preview__waveform) {
    min-width: 220px;
  }
}
</style>

