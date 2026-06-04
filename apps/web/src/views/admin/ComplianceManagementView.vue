<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiClientError } from '../../api/axios'
import { formatAdminDateTime } from '../../utils/date-time'
import {
  createAdminComplianceFileDownloadUrl,
  getAdminComplianceDetail,
  listAdminCompliance,
  submitAdminComplianceDecision,
  uploadAdminComplianceFiles,
} from '../../services/compliance.service'
import ComplianceDecisionContextRail from '../../components/features/compliance/ComplianceDecisionContextRail.vue'
import ComplianceDecisionHeader from '../../components/features/compliance/ComplianceDecisionHeader.vue'
import ComplianceDecisionWorkspace from '../../components/features/compliance/ComplianceDecisionWorkspace.vue'
import type {
  ComplianceDetail,
  ComplianceLegalStatus,
  ComplianceListItem,
  ComplianceReviewStatus,
  ProductStatus,
} from '../../types/compliance.types'
import { useCorePermissionsStore } from '../../stores/core-permissions.store'

const fieldClass =
  'h-12 w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const selectFieldClass =
  'h-12 w-full min-w-0 appearance-none rounded-2xl border border-slate-200/80 bg-white/90 px-4 pr-11 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'

const route = useRoute()
const corePermissionsStore = useCorePermissionsStore()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rows = ref<ComplianceListItem[]>([])
const totalItems = ref(0)

const pagination = reactive({ page: 1, pageSize: 20 })
const filters = reactive<{
  keyword: string
  legalStatus: ComplianceLegalStatus | ''
  reviewStatus: ComplianceReviewStatus | ''
  productStatus: ProductStatus | ''
}>({
  keyword: typeof route.query.keyword === 'string' ? route.query.keyword.trim() : '',
  legalStatus: '',
  reviewStatus: '',
  productStatus: '',
})

const detailDialogVisible = ref(false)
const selectedDetail = ref<ComplianceDetail | null>(null)
const selectedTrackId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const activeTab = ref<'info' | 'decision'>('info')

const uploadFilesValue = ref<File[]>([])
const isUploadingFiles = ref(false)
const isSubmittingDecision = ref(false)

const decisionForm = reactive<{
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  approvedPermissionIds: string[]
  rejectReason: string
}>({
  legalStatus: 'PENDING',
  reviewStatus: 'PENDING',
  approvedPermissionIds: [],
  rejectReason: '',
})

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pagination.pageSize)))
const pageStart = computed(() => (totalItems.value === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, totalItems.value))
const pendingReviewCount = computed(() => rows.value.filter((item) => item.reviewStatus === 'PENDING').length)
const approvedCount = computed(() => rows.value.filter((item) => item.reviewStatus === 'APPROVED').length)
const readyToSyncCount = computed(() => rows.value.filter((item) => item.legalStatus === 'SUFFICIENT' && item.reviewStatus === 'APPROVED').length)
const selectedPermissionItems = computed(() =>
  corePermissionsStore.activeItems.filter((permission) =>
    decisionForm.approvedPermissionIds.includes(permission.id),
  ),
)
const selectedPermissionChips = computed(() =>
  selectedPermissionItems.value.map((permission) => ({
    id: permission.id,
    name: permission.name,
  })),
)
const decisionSummaryText = computed(() => {
  if (decisionForm.reviewStatus === 'REJECTED') return 'Quyết định từ chối sẽ được lưu'
  if (selectedPermissionItems.value.length === 0) return 'Chưa chọn quyền nào'
  return `${selectedPermissionItems.value.length} quyền sẽ được cấp`
})
const suggestedActionText = computed(() => {
  if (selectedDetail.value?.reviewStatus === 'REJECTED') {
    return 'Hồ sơ từng bị từ chối. Kiểm tra lại lý do trước khi cấp quyền.'
  }
  return 'Hồ sơ đang chờ duyệt. Chọn trạng thái và quyền để hoàn tất.'
})

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const extractApiErrorDetails = (details: unknown) => {
  if (typeof details !== 'object' || details === null) return null
  if (!('details' in details)) return null
  const inner = (details as { details?: unknown }).details
  return typeof inner === 'object' && inner !== null ? inner : null
}

const resolveErrorMessage = (error: ApiClientError) => {
  const inner = extractApiErrorDetails(error.details)

  if (error.message === 'NO_FILES_UPLOADED') {
    return 'Vui lòng chọn ít nhất 1 file pháp lý.'
  }

  if (error.message === 'LEGAL_FILE_TOO_LARGE') {
    const fileName = typeof (inner as any)?.fileName === 'string' ? (inner as any).fileName : null
    const maxBytes = typeof (inner as any)?.maxBytes === 'number' ? (inner as any).maxBytes : null
    const maxMb = maxBytes ? Math.round(maxBytes / (1024 * 1024)) : null
    const namePart = fileName ? ` (${fileName})` : ''
    const sizePart = maxMb ? ` Giới hạn ${maxMb}MB.` : ''
    return `File quá lớn${namePart}.${sizePart}`.trim()
  }

  if (error.message === 'LEGAL_FILE_TYPE_NOT_ALLOWED') {
    const fileName = typeof (inner as any)?.fileName === 'string' ? (inner as any).fileName : null
    const mimeType = typeof (inner as any)?.mimeType === 'string' ? (inner as any).mimeType : null
    const namePart = fileName ? ` (${fileName})` : ''
    const mimePart = mimeType ? ` (mime: ${mimeType})` : ''
    return `Định dạng file không được hỗ trợ${namePart}.${mimePart} Chỉ hỗ trợ: PDF, DOC, DOCX, PNG, JPG/JPEG, WEBP.`
  }

  return error.message
}

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = resolveErrorMessage(error)
    return
  }
  errorMessage.value = error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

const formatReviewDateTime = (value: string | null) => formatAdminDateTime(value, { fallback: '—' })

const formatLegalStatusLabel = (status: ComplianceLegalStatus) => {
  if (status === 'SUFFICIENT') return 'Hồ sơ đủ'
  if (status === 'INSUFFICIENT') return 'Hồ sơ thiếu'
  return 'Chờ pháp lý'
}

const formatReviewStatusLabel = (status: ComplianceReviewStatus) => {
  if (status === 'APPROVED') return 'Đã duyệt'
  if (status === 'REJECTED') return 'Từ chối'
  return 'Chờ duyệt'
}

const formatProductStatusLabel = (status: ProductStatus) => {
  if (status === 'PUBLISHED') return 'Đang phát hành'
  if (status === 'HIDDEN') return 'Đã ẩn'
  return 'Chờ xử lý'
}

const getLegalStatusClass = (status: ComplianceLegalStatus) => {
  if (status === 'SUFFICIENT') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (status === 'INSUFFICIENT') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
}

const getReviewStatusClass = (status: ComplianceReviewStatus) => {
  if (status === 'APPROVED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (status === 'REJECTED') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
}

const getProductStatusClass = (status: ProductStatus) => {
  if (status === 'PUBLISHED') {
    return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300'
  }
  if (status === 'HIDDEN') {
    return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const fetchList = async () => {
  clearMessages()
  isLoading.value = true
  try {
    const { data, meta } = await listAdminCompliance({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      legalStatus: filters.legalStatus || undefined,
      reviewStatus: filters.reviewStatus || undefined,
      productStatus: filters.productStatus || undefined,
    })
    rows.value = data.items
    totalItems.value = meta.pagination.totalItems
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const openDetail = async (item: ComplianceListItem) => {
  clearMessages()
  detailDialogVisible.value = true
  selectedDetail.value = null
  selectedTrackId.value = item.product.trackId
  uploadFilesValue.value = []
  activeTab.value = 'info'

  try {
    const { data } = await getAdminComplianceDetail(item.product.trackId)
    selectedDetail.value = data
    decisionForm.legalStatus = data.legalStatus
    decisionForm.reviewStatus = data.reviewStatus
    decisionForm.approvedPermissionIds = [...(data.approvedPermissionIds ?? [])]
    decisionForm.rejectReason = data.rejectReason ?? ''
  } catch (error) {
    setError(error)
  }
}

const refreshDetail = async () => {
  if (!selectedTrackId.value) return
  const { data } = await getAdminComplianceDetail(selectedTrackId.value)
  selectedDetail.value = data
}

const onUploadFilesChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  uploadFilesValue.value = files
}

const submitUploadFiles = async () => {
  if (!selectedTrackId.value || uploadFilesValue.value.length === 0) return
  clearMessages()
  isUploadingFiles.value = true
  try {
    await uploadAdminComplianceFiles(selectedTrackId.value, uploadFilesValue.value)
    successMessage.value = 'Đã upload file pháp lý.'
    uploadFilesValue.value = []
    await refreshDetail()
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isUploadingFiles.value = false
  }
}

const openFile = async (fileKey: string) => {
  clearMessages()
  try {
    const { data } = await createAdminComplianceFileDownloadUrl(fileKey)
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer')
  } catch (error) {
    setError(error)
  }
}

const requiresRejectReason = computed(() => decisionForm.legalStatus === 'INSUFFICIENT' || decisionForm.reviewStatus === 'REJECTED')

const submitDecision = async () => {
  if (!selectedTrackId.value) return
  clearMessages()
  if (requiresRejectReason.value && decisionForm.rejectReason.trim().length === 0) {
    errorMessage.value = 'Reject reason là bắt buộc khi INSUFFICIENT hoặc REJECTED.'
    return
  }

  isSubmittingDecision.value = true
  try {
    await submitAdminComplianceDecision(selectedTrackId.value, {
      legalStatus: decisionForm.legalStatus,
      reviewStatus: decisionForm.reviewStatus,
      approvedPermissionIds: decisionForm.approvedPermissionIds,
      rejectReason: decisionForm.rejectReason.trim().length > 0 ? decisionForm.rejectReason.trim() : undefined,
    })
    successMessage.value = 'Đã cập nhật kết quả kiểm duyệt.'
    await refreshDetail()
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmittingDecision.value = false
  }
}

const togglePermissionSelection = (permissionId: string) => {
  decisionForm.approvedPermissionIds = decisionForm.approvedPermissionIds.includes(permissionId)
    ? decisionForm.approvedPermissionIds.filter((id) => id !== permissionId)
    : [...decisionForm.approvedPermissionIds, permissionId]
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchList()
}

let debounceTimeout: number | undefined

const triggerFetch = (isInstant = false) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
    debounceTimeout = undefined
  }

  if (isInstant) {
    pagination.page = 1
    void fetchList()
  } else {
    debounceTimeout = window.setTimeout(() => {
      pagination.page = 1
      void fetchList()
    }, 300)
  }
}

watch(
  () => filters.keyword,
  () => {
    triggerFetch(false)
  },
)

watch(
  () => [filters.legalStatus, filters.reviewStatus, filters.productStatus],
  () => {
    triggerFetch(true)
  },
)

const resetFilters = () => {
  filters.keyword = ''
  filters.legalStatus = ''
  filters.reviewStatus = ''
  filters.productStatus = ''
}

onMounted(() => {
  void corePermissionsStore.fetchCorePermissions({ page: 1, pageSize: 100, status: 'ACTIVE' }).catch(() => {})
  void fetchList()
})

watch(
  () => route.query.keyword,
  (value) => {
    if (typeof value !== 'string') return
    filters.keyword = value.trim()
  },
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] p-5 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
          Compliance
        </div>
        <div>
          <h1 class="m-0 text-2xl font-semibold tracking-tight !text-slate-950 sm:text-3xl dark:!text-white">Pháp lý & Kiểm duyệt</h1>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Upload giấy tờ pháp lý, theo dõi trạng thái review và cấp `Approved permissions` làm nguồn để Product tự chọn quyền bán thủ công.
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article class="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tổng hồ sơ</div>
          <div class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ totalItems }}</div>
        </article>
        <article class="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Chờ review</div>
          <div class="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300">{{ pendingReviewCount }}</div>
        </article>
        <article class="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sẵn sàng chọn</div>
          <div class="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{{ readyToSyncCount }}</div>
        </article>
      </div>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="w-full">
        <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <label class="space-y-1.5 lg:col-span-4">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keyword</span>
            <div class="relative">
              <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
              <input v-model="filters.keyword" :class="fieldClass" class="pl-10" placeholder="Tìm theo tên sản phẩm hoặc nghệ sĩ" :disabled="isLoading" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Legal</span>
            <div class="relative">
              <select v-model="filters.legalStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="SUFFICIENT">SUFFICIENT</option>
                <option value="INSUFFICIENT">INSUFFICIENT</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Review</span>
            <div class="relative">
              <select v-model="filters.reviewStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Product status</span>
            <div class="relative">
              <select v-model="filters.productStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
            </div>
          </label>

          <div class="flex items-end lg:col-span-2">
            <button
              type="button"
              :class="secondaryButtonClass"
              class="w-full h-12 flex items-center justify-center gap-2 border-dashed hover:border-rose-400 hover:text-rose-500 dark:hover:border-rose-500/50 dark:hover:text-rose-400"
              :disabled="isLoading"
              @click="resetFilters"
            >
              <i class="pi pi-refresh text-xs" />
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="!detailDialogVisible && errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="!detailDialogVisible && successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-6 space-y-3 sm:hidden">
        <article
          v-for="(item, index) in rows"
          :key="item.complianceId"
          class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Hồ sơ #{{ (pagination.page - 1) * pagination.pageSize + index + 1 }}
              </div>
              <div class="mt-2 line-clamp-2 font-semibold text-slate-950 dark:text-white">
                {{ item.product.title }}
              </div>
              <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {{ item.product.artistName || item.product.artistId }}
              </div>
            </div>

            <button
              type="button"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              :disabled="isLoading"
              @click="openDetail(item)"
            >
              <i class="pi pi-eye" />
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getProductStatusClass(item.product.status)">
              {{ formatProductStatusLabel(item.product.status) }}
            </span>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getLegalStatusClass(item.legalStatus)">
              {{ formatLegalStatusLabel(item.legalStatus) }}
            </span>
            <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getReviewStatusClass(item.reviewStatus)">
              {{ formatReviewStatusLabel(item.reviewStatus) }}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Files</div>
              <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ item.filesCount }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Review time</div>
              <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{ formatReviewDateTime(item.reviewedAt) }}
              </div>
            </div>
          </div>
        </article>

        <div
          v-if="!isLoading && rows.length === 0"
          class="rounded-[28px] border border-dashed border-slate-200/80 bg-white/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
        >
          Không có hồ sơ phù hợp.
        </div>
      </div>

      <div class="mt-6 hidden overflow-hidden rounded-[28px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40 sm:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px] lg:min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="w-20 px-4 py-4 font-semibold">STT</th>
                <th class="px-4 py-4 font-semibold">Product</th>
                <th class="px-4 py-4 font-semibold">Pháp lý</th>
                <th class="px-4 py-4 font-semibold">Kiểm duyệt</th>
                <th class="w-24 px-4 py-4 font-semibold">Files</th>
                <th class="w-44 px-4 py-4 font-semibold">Review time</th>
                <th class="w-28 px-4 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr v-for="(item, index) in rows" :key="item.complianceId" class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30">
                <td class="px-4 py-4">
                  <div class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sm font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                    {{ (pagination.page - 1) * pagination.pageSize + index + 1 }}
                  </div>
                </td>
                <td class="px-4 py-4">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ item.product.title }}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ item.product.artistName || item.product.artistId }}</span>
                    <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span class="inline-flex items-center rounded-full border px-2.5 py-1 font-semibold" :class="getProductStatusClass(item.product.status)">
                      {{ formatProductStatusLabel(item.product.status) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getLegalStatusClass(item.legalStatus)">
                    {{ formatLegalStatusLabel(item.legalStatus) }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" :class="getReviewStatusClass(item.reviewStatus)">
                    {{ formatReviewStatusLabel(item.reviewStatus) }}
                  </span>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ item.filesCount }}</td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ formatReviewDateTime(item.reviewedAt) }}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="isLoading" @click="openDetail(item)">
                      <i class="pi pi-eye" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có hồ sơ phù hợp.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} hồ sơ</div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Đã duyệt: {{ approvedCount }}</div>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">Sau</button>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      class="w-[calc(100vw-1rem)] sm:w-[min(1240px,96vw)] lg:w-[min(1320px,96vw)]"
      :pt="{
        header: { class: 'px-0 pb-0 pt-0' },
        content: { class: 'compliance-detail-scroll max-h-[calc(100svh-4rem)] !overflow-y-auto px-0 pb-0' },
        footer: { class: 'border-t border-slate-100 px-4 py-5 dark:border-slate-800 sm:px-6 sm:py-6' },
      }"
    >
      <template #header>
        <div
          v-if="selectedDetail"
          class="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 sm:py-5"
        >
          <ComplianceDecisionHeader
            :detail="selectedDetail"
            :format-product-status-label="formatProductStatusLabel"
            :format-legal-status-label="formatLegalStatusLabel"
            :format-review-status-label="formatReviewStatusLabel"
            :format-review-date-time="formatReviewDateTime"
            :get-product-status-class="getProductStatusClass"
            :get-legal-status-class="getLegalStatusClass"
            :get-review-status-class="getReviewStatusClass"
          />
        </div>
      </template>

      <div v-if="selectedDetail" class="space-y-5 px-4 pb-6 pt-4 sm:px-6 sm:pb-8">
        <div class="space-y-3">
          <Message v-if="detailDialogVisible && errorMessage" severity="error">{{ errorMessage }}</Message>
          <Message v-if="detailDialogVisible && successMessage" severity="success">{{ successMessage }}</Message>
        </div>

        <!-- Custom tabs header -->
        <div class="mb-5 flex flex-nowrap gap-6 overflow-x-auto border-b border-slate-100 pb-1 no-scrollbar dark:border-slate-800">
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-2 border-b-2 bg-transparent pb-3 text-sm font-semibold outline-none transition"
            :class="activeTab === 'info' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="activeTab = 'info'"
          >
            <i class="pi pi-file" />
            Hồ sơ & Tài liệu
          </button>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-2 border-b-2 bg-transparent pb-3 text-sm font-semibold outline-none transition"
            :class="activeTab === 'decision' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="activeTab = 'decision'"
          >
            <i class="pi pi-check-circle" />
            Đánh giá & Duyệt
          </button>
        </div>

        <!-- Tab 1: Info & Documents -->
        <div v-if="activeTab === 'info'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <!-- Left: General Information -->
          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/30">
              <h3 class="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-4 mt-0">Thông tin chung</h3>
              <div class="space-y-3.5">
                <div class="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">Nghệ sĩ</span>
                  <span class="min-w-0 truncate text-right text-sm font-semibold text-slate-900 dark:text-white">
                    {{ selectedDetail.product.artistName || selectedDetail.product.artistId }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">Người kiểm duyệt</span>
                  <span class="min-w-0 truncate text-right text-sm font-semibold text-slate-900 dark:text-white">
                    {{ selectedDetail.reviewedByName || selectedDetail.reviewedBy || '—' }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">Thời gian duyệt</span>
                  <span class="min-w-0 truncate text-right text-sm font-semibold text-slate-900 dark:text-white">
                    {{ formatReviewDateTime(selectedDetail.reviewedAt) }}
                  </span>
                </div>
              </div>
              
              <div v-if="selectedDetail.rejectReason" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-350">
                <div class="flex items-start gap-2.5">
                  <i class="pi pi-exclamation-circle mt-0.5 text-sm" />
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-455">Lý do từ chối trước đó</div>
                    <p class="m-0 mt-1 text-xs leading-relaxed">{{ selectedDetail.rejectReason }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Legal Files Upload & List -->
          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/30">
              <h3 class="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3 mt-0">Tải tệp tin pháp lý</h3>
              
              <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center hover:border-violet-400 dark:hover:border-violet-500/50 transition cursor-pointer bg-white dark:bg-slate-950/20" @click="fileInput?.click()">
                <input ref="fileInput" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" class="hidden" :disabled="isUploadingFiles" @change="onUploadFilesChange" />
                <div class="flex flex-col items-center gap-2">
                  <i class="pi pi-cloud-upload text-3xl text-slate-400 dark:text-slate-500" />
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {{ uploadFilesValue.length > 0 ? `Đã chọn ${uploadFilesValue.length} tệp` : 'Click để chọn tệp pháp lý' }}
                  </span>
                  <span class="text-[10px] text-slate-450 dark:text-slate-500">Hỗ trợ tải lên nhiều tệp cùng lúc</span>
                </div>
              </div>

              <!-- Upload action bar -->
              <div v-if="uploadFilesValue.length > 0" class="flex items-center justify-between mt-3 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/30">
                <span class="text-xs font-semibold text-violet-750 dark:text-violet-300 flex items-center gap-1.5">
                  <i class="pi pi-file text-sm" />
                  Sẵn sàng tải lên {{ uploadFilesValue.length }} tệp
                </span>
                <div class="flex gap-2">
                  <button type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer" @click="uploadFilesValue = []">Hủy</button>
                  <button type="button" :class="primaryButtonClass" class="!py-1.5 !px-3 !text-xs cursor-pointer" :disabled="isUploadingFiles" @click="submitUploadFiles">
                    <i v-if="isUploadingFiles" class="pi pi-spin pi-spinner mr-1 text-xs" />
                    <i v-else class="pi pi-upload mr-1 text-xs" />
                    Tải lên
                  </button>
                </div>
              </div>
            </div>

            <!-- List of files -->
            <div class="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/30">
              <h3 class="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3 mt-0">Danh sách tài liệu đã lưu ({{ selectedDetail.uploadedLegalFiles.length }})</h3>
              
              <div v-if="selectedDetail.uploadedLegalFiles.length === 0" class="rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/60 px-4 py-8 text-center text-xs text-slate-450 dark:text-slate-550 bg-white/50 dark:bg-slate-950/10">
                <i class="pi pi-folder-open text-2xl text-slate-300 mb-2 block" />
                Chưa có tài liệu nào được lưu cho hồ sơ này.
              </div>
              <div v-else class="grid gap-2">
                <div
                  v-for="file in selectedDetail.uploadedLegalFiles"
                  :key="file.fileKey"
                  class="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700"
                >
                  <div class="min-w-0 flex items-center gap-3">
                    <div class="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400">
                      <i class="pi pi-file text-base" />
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-xs font-semibold text-slate-950 dark:text-white" :title="file.fileName">{{ file.fileName }}</div>
                      <div class="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        {{ formatFileSize(file.size) }} · {{ formatReviewDateTime(file.uploadedAt) }}
                      </div>
                    </div>
                  </div>
                  <button type="button" :class="secondaryButtonClass" class="!py-1.5 !px-2.5 !text-xs shrink-0 cursor-pointer" @click="openFile(file.fileKey)">
                    <i class="pi pi-external-link mr-1 text-[10px]" />
                    Xem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Decision & Permissions -->
        <div v-else-if="activeTab === 'decision'" class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ComplianceDecisionContextRail
            :detail="selectedDetail"
            :suggested-action-text="suggestedActionText"
            :format-legal-status-label="formatLegalStatusLabel"
            :format-review-status-label="formatReviewStatusLabel"
            :format-review-date-time="formatReviewDateTime"
          />

          <ComplianceDecisionWorkspace
            :legal-status="decisionForm.legalStatus"
            :review-status="decisionForm.reviewStatus"
            :reject-reason="decisionForm.rejectReason"
            :requires-reject-reason="requiresRejectReason"
            :approved-permission-ids="decisionForm.approvedPermissionIds"
            :selected-count="selectedPermissionItems.length"
            :decision-summary-text="decisionSummaryText"
            :active-permissions="corePermissionsStore.activeItems"
            :selected-permissions="selectedPermissionChips"
            :is-submitting-decision="isSubmittingDecision"
            @update:legal-status="decisionForm.legalStatus = $event"
            @update:review-status="decisionForm.reviewStatus = $event"
            @update:reject-reason="decisionForm.rejectReason = $event"
            @toggle-permission="togglePermissionSelection"
            @clear-permissions="decisionForm.approvedPermissionIds = []"
            @submit="submitDecision"
          />
        </div>
      </div>

      <div v-else class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        <i class="pi pi-spin pi-spinner text-xl text-violet-500 mb-2 block" />
        Đang tải thông tin chi tiết hồ sơ...
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <button type="button" :class="[secondaryButtonClass, 'gap-2']" @click="detailDialogVisible = false">
            <i class="pi pi-times text-sm" />
            Đóng
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.compliance-detail-scroll) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

:deep(.compliance-detail-scroll::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}
</style>
