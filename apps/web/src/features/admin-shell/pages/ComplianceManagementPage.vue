<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiClientError } from '../../../shared/api/http'
import { createAdminComplianceFileDownloadUrl, getAdminComplianceDetail, listAdminCompliance, submitAdminComplianceDecision, uploadAdminComplianceFiles } from '../../compliance/compliance.api'
import type { ComplianceDetail, ComplianceLegalStatus, ComplianceListItem, ComplianceReviewStatus, ProductStatus } from '../../compliance/compliance.types'
import { useCorePermissionsStore } from '../../core-permissions/core-permissions.store'

const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
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
  keyword: '',
  legalStatus: '',
  reviewStatus: '',
  productStatus: '',
})

const detailDialogVisible = ref(false)
const selectedDetail = ref<ComplianceDetail | null>(null)
const selectedTrackId = ref<string | null>(null)

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

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = error.message
    return
  }
  errorMessage.value = error instanceof Error ? error.message : 'Đã xảy ra lỗi'
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

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchList()
}

onMounted(() => {
  const keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  if (keyword.trim().length > 0) filters.keyword = keyword.trim()
  void corePermissionsStore.fetchCorePermissions({ page: 1, pageSize: 100, status: 'ACTIVE' }).catch(() => {})
  void fetchList()
})

watch(
  () => route.query.keyword,
  (value) => {
    if (typeof value !== 'string') return
    if (value.trim().length === 0) return
    filters.keyword = value.trim()
    pagination.page = 1
    void fetchList()
  },
)
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="text-xl font-semibold text-slate-950 dark:text-white">Pháp lý & Kiểm duyệt</div>
        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">Upload giấy tờ pháp lý, xem file và cấp tập quyền mà Product được phép chọn sau khi hồ sơ được duyệt.</div>
      </div>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="grid gap-3 md:grid-cols-4">
        <label class="space-y-2 md:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keyword</span>
          <input v-model="filters.keyword" :class="fieldClass" placeholder="Title hoặc PROD-xxxxxx" :disabled="isLoading" />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Legal</span>
          <select v-model="filters.legalStatus" :class="fieldClass" :disabled="isLoading">
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="SUFFICIENT">SUFFICIENT</option>
            <option value="INSUFFICIENT">INSUFFICIENT</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Review</span>
          <select v-model="filters.reviewStatus" :class="fieldClass" :disabled="isLoading">
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
      </div>

      <div class="mt-3 grid gap-3 md:grid-cols-4">
        <label class="space-y-2 md:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Product status</span>
          <select v-model="filters.productStatus" :class="fieldClass" :disabled="isLoading">
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="HIDDEN">HIDDEN</option>
          </select>
        </label>
        <div class="flex items-end justify-end gap-2 md:col-span-2">
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading" @click="fetchList">
            <i class="pi pi-filter mr-2" />
            Lọc
          </button>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40">
        <div class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="px-4 py-4 font-semibold">Product</th>
                <th class="px-4 py-4 font-semibold">Legal</th>
                <th class="px-4 py-4 font-semibold">Review</th>
                <th class="px-4 py-4 font-semibold">Files</th>
                <th class="px-4 py-4 font-semibold">Reviewed at</th>
                <th class="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr v-for="item in rows" :key="item.complianceId" class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30">
                <td class="px-4 py-4">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ item.product.title }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.product.productCode }} · {{ item.product.status }}</div>
                </td>
                <td class="px-4 py-4">
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{{ item.legalStatus }}</span>
                </td>
                <td class="px-4 py-4">
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{{ item.reviewStatus }}</span>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ item.filesCount }}</td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ item.reviewedAt || '—' }}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="isLoading" @click="openDetail(item)">
                      <i class="pi pi-eye" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!isLoading && rows.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có hồ sơ phù hợp.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ totalItems }}
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
          <button type="button" :class="secondaryButtonClass" :disabled="isLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">Sau</button>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="detailDialogVisible" modal class="w-[min(1040px,96vw)]" header="Compliance detail">
      <div v-if="selectedDetail" class="space-y-6">
        <section class="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedDetail.product.title }}</div>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ selectedDetail.product.productCode }} · {{ selectedDetail.product.status }}</div>
          <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">Compliance: {{ selectedDetail.complianceCode }}</div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Artist</div>
              <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {{ selectedDetail.product.artistName || selectedDetail.product.artistId }}
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reviewed by</div>
              <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {{ selectedDetail.reviewedByName || selectedDetail.reviewedBy || 'Chưa có' }}
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reviewed at</div>
              <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{{ selectedDetail.reviewedAt || 'Chưa có' }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reject reason</div>
              <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{{ selectedDetail.rejectReason || 'Không có' }}</div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Uploaded legal files</div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label class="space-y-2 sm:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Upload files</span>
              <input type="file" multiple :class="fieldClass" :disabled="isUploadingFiles" @change="onUploadFilesChange" />
            </label>
            <div class="sm:col-span-2 flex justify-end">
              <button type="button" :class="primaryButtonClass" :disabled="isUploadingFiles || uploadFilesValue.length === 0" @click="submitUploadFiles">
                <i class="pi pi-upload mr-2" />
                Upload
              </button>
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <div v-if="selectedDetail.uploadedLegalFiles.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
              Chưa có file.
            </div>
            <div
              v-for="file in selectedDetail.uploadedLegalFiles"
              :key="file.fileKey"
              class="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0">
                <div class="truncate font-semibold text-slate-900 dark:text-white">{{ file.fileName }}</div>
                <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ file.mimeType }} · {{ Math.round(file.size / 1024) }} KB</div>
              </div>
              <button type="button" :class="secondaryButtonClass" @click="openFile(file.fileKey)">
                <i class="pi pi-external-link mr-2" />
                Xem/Tải
              </button>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Review decision</div>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Legal status</span>
              <select v-model="decisionForm.legalStatus" :class="fieldClass" :disabled="isSubmittingDecision">
                <option value="PENDING">PENDING</option>
                <option value="SUFFICIENT">SUFFICIENT</option>
                <option value="INSUFFICIENT">INSUFFICIENT</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Review status</span>
              <select v-model="decisionForm.reviewStatus" :class="fieldClass" :disabled="isSubmittingDecision">
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </label>
            <div class="md:col-span-2">
              <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Approved permissions cho Product chọn</div>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <label
                  v-for="permission in corePermissionsStore.activeItems"
                  :key="permission.id"
                  class="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-500/40"
                >
                  <input
                    v-model="decisionForm.approvedPermissionIds"
                    class="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-950"
                    type="checkbox"
                    :value="permission.id"
                    :disabled="isSubmittingDecision"
                  />
                  <div class="min-w-0">
                    <div class="truncate font-semibold">{{ permission.name }}</div>
                    <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</div>
                  </div>
                </label>
              </div>
            </div>
            <div class="md:col-span-2">
              <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Quyền đã được cấp hiện tại</div>
              <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Khi hồ sơ được duyệt với `SUFFICIENT + APPROVED`, hệ thống sẽ auto-sync các quyền được cấp xuống Product để sẵn sàng cho bước publish.
              </div>
              <div v-if="selectedDetail.approvedPermissions.length === 0" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Chưa có quyền nào được Pháp lý cấp.
              </div>
              <div v-else class="mt-3 grid gap-2 sm:grid-cols-2">
                <div
                  v-for="permission in selectedDetail.approvedPermissions"
                  :key="`${permission.name}-${permission.lawReference}`"
                  class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                >
                  <div class="truncate font-semibold">{{ permission.name }}</div>
                  <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ permission.lawReference }}</div>
                </div>
              </div>
            </div>
            <label class="space-y-2 md:col-span-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Reject reason</span>
              <input v-model="decisionForm.rejectReason" :class="fieldClass" :disabled="isSubmittingDecision" placeholder="Bắt buộc khi INSUFFICIENT hoặc REJECTED" />
            </label>
          </div>

          <div class="mt-4 flex justify-end">
            <button type="button" :class="primaryButtonClass" :disabled="isSubmittingDecision" @click="submitDecision">
              <i class="pi pi-check mr-2" />
              Xác nhận
            </button>
          </div>
        </section>
      </div>

      <div v-else class="text-sm text-slate-500 dark:text-slate-400">Đang tải...</div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" @click="detailDialogVisible = false">Đóng</button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
