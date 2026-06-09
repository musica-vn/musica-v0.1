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
  'h-12 w-full min-w-0 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full min-w-0 appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--admin-border)] dark:bg-[color:var(--admin-surface-0)] dark:text-[color:var(--admin-text)] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.3)] dark:hover:text-[color:var(--admin-primary-700)]'

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

const readStringField = (value: unknown, key: string): string | null => {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return typeof record[key] === 'string' ? record[key] : null
}

const readNumberField = (value: unknown, key: string): number | null => {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return typeof record[key] === 'number' ? record[key] : null
}

const resolveErrorMessage = (error: ApiClientError) => {
  const inner = extractApiErrorDetails(error.details)

  if (error.message === 'NO_FILES_UPLOADED') {
    return 'Vui lòng chọn ít nhất 1 file pháp lý.'
  }

  if (error.message === 'LEGAL_FILE_TOO_LARGE') {
    const fileName = readStringField(inner, 'fileName')
    const maxBytes = readNumberField(inner, 'maxBytes')
    const maxMb = maxBytes ? Math.round(maxBytes / (1024 * 1024)) : null
    const namePart = fileName ? ` (${fileName})` : ''
    const sizePart = maxMb ? ` Giới hạn ${maxMb}MB.` : ''
    return `File quá lớn${namePart}.${sizePart}`.trim()
  }

  if (error.message === 'LEGAL_FILE_TYPE_NOT_ALLOWED') {
    const fileName = readStringField(inner, 'fileName')
    const mimeType = readStringField(inner, 'mimeType')
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
    return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/12 dark:text-emerald-200'
  }
  if (status === 'INSUFFICIENT') {
    return 'bg-rose-50 text-rose-800 dark:bg-rose-500/12 dark:text-rose-200'
  }
  return 'bg-amber-50 text-amber-800 dark:bg-amber-500/12 dark:text-amber-200'
}

const getReviewStatusClass = (status: ComplianceReviewStatus) => {
  if (status === 'APPROVED') {
    return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/12 dark:text-emerald-200'
  }
  if (status === 'REJECTED') {
    return 'bg-rose-50 text-rose-800 dark:bg-rose-500/12 dark:text-rose-200'
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
}

const getProductStatusClass = (status: ProductStatus) => {
  if (status === 'PUBLISHED') {
    return 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)] dark:bg-[color:var(--admin-primary-100)] dark:text-[color:var(--admin-primary-800)]'
  }
  if (status === 'HIDDEN') {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
  }
  return 'bg-amber-50 text-amber-800 dark:bg-amber-500/12 dark:text-amber-200'
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
      class="flex flex-col gap-4 rounded-[32px] border border-[color:var(--admin-border)] bg-[radial-gradient(circle_at_top_left,var(--admin-primary-soft),transparent_38%),linear-gradient(135deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-2)] sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--admin-primary-800)]">
          Compliance
        </div>
        <div>
          <h1 class="m-0 text-2xl font-semibold tracking-tight !text-[color:var(--admin-text)] sm:text-3xl">Pháp lý & Kiểm duyệt</h1>
          <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
            Upload giấy tờ pháp lý, theo dõi trạng thái review và cấp `Approved permissions` làm nguồn để Product tự chọn quyền bán thủ công.
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article class="rounded-[24px] border border-[rgb(var(--admin-primary-rgb)/0.16)] bg-[linear-gradient(135deg,#f7fcff,var(--admin-primary-50))] px-5 py-4 shadow-[var(--admin-elev-1)]">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-primary-600)]">Tổng hồ sơ</div>
          <div class="mt-2 text-2xl font-semibold text-[color:var(--admin-primary-800)]">{{ totalItems }}</div>
        </article>
        <article class="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffaf0,#fff1d8)] px-5 py-4 shadow-[var(--admin-elev-1)]">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Chờ review</div>
          <div class="mt-2 text-2xl font-semibold text-[color:#9c5a00]">{{ pendingReviewCount }}</div>
        </article>
        <article class="rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#f7fff8,#e7faec)] px-5 py-4 shadow-[var(--admin-elev-1)]">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Sẵn sàng chọn</div>
          <div class="mt-2 text-2xl font-semibold text-[color:#1f7447]">{{ readyToSyncCount }}</div>
        </article>
      </div>
    </section>

    <section class="rounded-[32px] border border-[color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur">
      <div class="w-full">
        <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <label class="space-y-1.5 lg:col-span-4">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Keyword</span>
            <div class="relative">
              <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
              <input v-model="filters.keyword" :class="fieldClass" class="pl-10" placeholder="Tìm theo tên sản phẩm hoặc nghệ sĩ" :disabled="isLoading" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Legal</span>
            <div class="relative">
              <select v-model="filters.legalStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="SUFFICIENT">SUFFICIENT</option>
                <option value="INSUFFICIENT">INSUFFICIENT</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Review</span>
            <div class="relative">
              <select v-model="filters.reviewStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
            </div>
          </label>

          <label class="space-y-1.5 lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Product status</span>
            <div class="relative">
              <select v-model="filters.productStatus" :class="selectFieldClass" :disabled="isLoading">
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
            </div>
          </label>

          <div class="flex lg:col-span-2 lg:items-end lg:pt-[1.625rem]">
            <button
              type="button"
              :class="secondaryButtonClass"
              class="h-12 w-full sm:w-auto lg:w-full shrink-0 items-center justify-center gap-2 border-dashed hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)]"
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
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="getProductStatusClass(item.product.status)">
              {{ formatProductStatusLabel(item.product.status) }}
            </span>
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="getLegalStatusClass(item.legalStatus)">
              {{ formatLegalStatusLabel(item.legalStatus) }}
            </span>
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="getReviewStatusClass(item.reviewStatus)">
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

      <div class="mt-6 hidden overflow-hidden rounded-[28px] border border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)] sm:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px] lg:min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-[linear-gradient(180deg,var(--admin-surface-3),var(--admin-surface-2))] text-xs uppercase tracking-[0.18em] text-[color:var(--admin-text)]">
              <tr>
                <th class="w-20 px-4 py-4 font-semibold">STT</th>
                <th class="px-4 py-4 font-semibold">Product</th>
                <th class="px-4 py-4 font-semibold">Pháp lý</th>
                <th class="px-4 py-4 font-semibold">Kiểm duyệt</th>
                <th class="w-24 px-4 py-4 text-center font-semibold">Files</th>
                <th class="w-44 px-4 py-4 text-center font-semibold">Review time</th>
                <th class="w-28 px-4 py-4 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y [--tw-divide-opacity:1] [border-color:var(--admin-border)] divide-y-[color:var(--admin-border)]">
              <tr
                v-for="(item, index) in rows"
                :key="item.complianceId"
                class="transition"
                :class="index % 2 === 0
                  ? 'bg-[color:var(--admin-surface-0)] hover:bg-[color:var(--admin-surface-2)]'
                  : 'bg-[color:var(--admin-surface-1)] hover:bg-[color:var(--admin-surface-2)]'"
              >
                <td class="px-4 py-4 align-middle">
                  <div class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--admin-primary-100)] text-sm font-semibold text-[color:var(--admin-primary-800)]">
                    {{ (pagination.page - 1) * pagination.pageSize + index + 1 }}
                  </div>
                </td>
                <td class="px-4 py-4 align-middle">
                  <div class="font-semibold text-[color:var(--admin-text)]">{{ item.product.title }}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--admin-text-muted)]">
                    <span>{{ item.product.artistName || item.product.artistId }}</span>
                    <span class="h-1 w-1 rounded-full bg-[color:var(--admin-border-strong)]" />
                    <span class="inline-flex items-center rounded-full px-2.5 py-1 font-semibold" :class="getProductStatusClass(item.product.status)">
                      {{ formatProductStatusLabel(item.product.status) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle">
                  <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="getLegalStatusClass(item.legalStatus)">
                    {{ formatLegalStatusLabel(item.legalStatus) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-middle">
                  <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="getReviewStatusClass(item.reviewStatus)">
                    {{ formatReviewStatusLabel(item.reviewStatus) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-middle text-center text-[color:var(--admin-text-muted)]">{{ item.filesCount }}</td>
                <td class="px-4 py-4 align-middle text-center text-[color:var(--admin-text-muted)] whitespace-nowrap">{{ formatReviewDateTime(item.reviewedAt) }}</td>
                <td class="px-4 py-4 align-middle">
                  <div class="flex items-center justify-center">
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)] disabled:opacity-60" :disabled="isLoading" @click="openDetail(item)">
                      <i class="pi pi-eye" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-sm text-[color:var(--admin-text-muted)]">
                  Không có hồ sơ phù hợp.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t pt-4 [border-color:var(--admin-border)] md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-[color:var(--admin-text-muted)]">Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} hồ sơ</div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="rounded-2xl border bg-[color:var(--admin-surface-1)] px-3 py-2 text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">Đã duyệt: {{ approvedCount }}</div>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">Sau</button>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      :closable="false"
      class="w-[calc(100vw-1rem)] sm:w-[min(1240px,96vw)] lg:w-[min(1320px,96vw)]"
      :pt="{
        header: { class: 'hidden' },
        content: { class: 'compliance-detail-scroll max-h-[calc(100svh-4rem)] !overflow-y-auto px-0 pb-0' },
        footer: { class: 'hidden' },
      }"
    >
      <div v-if="selectedDetail" class="relative space-y-5 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <button
          type="button"
          class="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-[color:var(--admin-text-muted)] transition hover:bg-[color:var(--admin-surface-1)] hover:text-[color:var(--admin-primary-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] sm:right-6 sm:top-6"
          aria-label="Đóng"
          @click="detailDialogVisible = false"
        >
          <i class="pi pi-times text-xl" />
        </button>

        <div class="space-y-3">
          <Message v-if="detailDialogVisible && errorMessage" severity="error">{{ errorMessage }}</Message>
          <Message v-if="detailDialogVisible && successMessage" severity="success">{{ successMessage }}</Message>
        </div>

        <!-- Custom tabs header -->
        <div class="mb-5 overflow-x-auto no-scrollbar">
          <div class="inline-flex min-w-full items-center gap-2 rounded-[22px] border bg-[color:var(--admin-surface-1)] p-1 [border-color:var(--admin-border)] sm:min-w-0">
          <button
            type="button"
            class="inline-flex min-w-0 flex-1 shrink-0 items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-1)] sm:flex-none"
            :class="activeTab === 'info'
              ? 'bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] text-[color:var(--admin-primary-800)] shadow-sm'
              : 'bg-transparent text-slate-500 hover:bg-[color:var(--admin-surface-0)] hover:text-slate-700 dark:hover:text-slate-200'"
            @click="activeTab = 'info'"
          >
            <i class="pi pi-file text-sm" />
            <span class="truncate">Hồ sơ & Tài liệu</span>
          </button>
          <button
            type="button"
            class="inline-flex min-w-0 flex-1 shrink-0 items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-1)] sm:flex-none"
            :class="activeTab === 'decision'
              ? 'bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] text-[color:var(--admin-primary-800)] shadow-sm'
              : 'bg-transparent text-slate-500 hover:bg-[color:var(--admin-surface-0)] hover:text-slate-700 dark:hover:text-slate-200'"
            @click="activeTab = 'decision'"
          >
            <i class="pi pi-check-circle text-sm" />
            <span class="truncate">Đánh giá & Duyệt</span>
          </button>
          </div>
        </div>

        <!-- Tab 1: Info & Documents -->
        <div v-if="activeTab === 'info'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <!-- Left: General Information -->
          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/30">
              <h3 class="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-4 mt-0">Thông tin chung</h3>
              <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-4 shadow-sm">
                <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
                  Hồ sơ đang xem
                </div>
                <h2 class="mt-2 text-[1.8rem] font-extrabold tracking-tight text-[color:var(--admin-text)]">
                  {{ selectedDetail.product.title }}
                </h2>
                <div class="mt-4 flex flex-wrap items-center gap-2.5">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    :class="getProductStatusClass(selectedDetail.product.status)"
                  >
                    {{ formatProductStatusLabel(selectedDetail.product.status) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    :class="getLegalStatusClass(selectedDetail.legalStatus)"
                  >
                    {{ formatLegalStatusLabel(selectedDetail.legalStatus) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    :class="getReviewStatusClass(selectedDetail.reviewStatus)"
                  >
                    {{ formatReviewStatusLabel(selectedDetail.reviewStatus) }}
                  </span>
                </div>
              </div>

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
              
              <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.5)] transition cursor-pointer bg-white dark:bg-slate-950/20" @click="fileInput?.click()">
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
              <div v-if="uploadFilesValue.length > 0" class="flex items-center justify-between mt-3 p-3 bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] dark:bg-[color:var(--admin-primary-50)] rounded-xl border [border-color:rgb(var(--admin-primary-rgb)/0.16)] dark:[border-color:rgb(var(--admin-primary-rgb)/0.26)]">
                <span class="text-xs font-semibold text-[color:var(--admin-primary-800)] dark:text-[color:var(--admin-primary-800)] flex items-center gap-1.5">
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
        <div v-else-if="activeTab === 'decision'" class="space-y-6">
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

          <ComplianceDecisionContextRail
            :detail="selectedDetail"
            :suggested-action-text="suggestedActionText"
            :format-legal-status-label="formatLegalStatusLabel"
            :format-review-status-label="formatReviewStatusLabel"
            :format-review-date-time="formatReviewDateTime"
          />
        </div>

      </div>

      <div v-else class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        <i class="pi pi-spin pi-spinner text-xl text-[color:var(--admin-primary-600)] mb-2 block" />
        Đang tải thông tin chi tiết hồ sơ...
      </div>

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
