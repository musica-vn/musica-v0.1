<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../../shared/api/http'
import { listManagedUsers } from '../../managed-users/managed-users.api'
import {
  getAdminCertificateDetail,
  getAdminCertificateDownloadUrl,
  getAdminCertificateTemplate,
  listAdminCertificates,
  renderAdminCertificateHtml,
  updateAdminCertificateTemplate,
} from '../../certificates/certificates.api'
import type { CertificateDetail, CertificateListItem as CertificateListItemType } from '../../certificates/certificates.types'
import CertificateListItemCard from '../../certificates/components/CertificateListItem.vue'
import ProductFilterInput from '../../products/components/ProductFilterInput.vue'
import ProductFilterSelect from '../../products/components/ProductFilterSelect.vue'
import type { ManagedUser } from '../../managed-users/managed-users.types'

const usageRightLabelMap: Record<string, string> = {
  REPRODUCTION_RIGHT: 'Quyền sao chép tác phẩm',
  COMMUNICATION_TO_PUBLIC_RIGHT: 'Quyền truyền đạt đến công chúng',
  DERIVATIVE_WORK_RIGHT: 'Quyền làm tác phẩm phái sinh',
  DISTRIBUTION_RIGHT: 'Quyền phân phối bản sao',
}

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rows = ref<CertificateListItemType[]>([])
const totalItems = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 20,
})

const filters = reactive({
  buyerKeyword: '',
  trackKeyword: '',
  artistId: '',
  status: 'ACTIVE' as 'ACTIVE' | '',
  fromDate: '',
  toDate: '',
})

const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/90 px-4 pr-11 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'
const summaryToneClassMap = {
  primary: 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/60 dark:border-violet-500/20',
  success: 'from-emerald-500/15 to-teal-500/10 border-emerald-200/60 dark:border-emerald-500/20',
  info: 'from-sky-500/15 to-cyan-500/10 border-sky-200/60 dark:border-sky-500/20',
  warning: 'from-amber-500/15 to-orange-500/10 border-amber-200/60 dark:border-amber-500/20',
} as const

const detailDialogVisible = ref(false)
const detail = ref<CertificateDetail | null>(null)
const renderedHtml = ref<string | null>(null)

const templateHtml = ref('')
const templateUpdatedAt = ref<string | null>(null)
const templateSaveLoading = ref(false)
const artistOptions = ref<Array<{ value: string; label: string }>>([])
const isArtistsLoading = ref(false)

const previewCertificateId = ref('')
const previewHtml = ref<string | null>(null)
const previewLoading = ref(false)
const templateUnavailableMessage = ref<string | null>(null)
const activeCount = computed(() => rows.value.filter((certificate) => certificate.status === 'ACTIVE').length)
const uniqueBuyerCount = computed(() => new Set(rows.value.map((certificate) => certificate.buyerId)).size)
const previewReadyCount = computed(() => rows.value.filter((certificate) => Boolean(certificate.trackSnapshotName)).length)
const summaryCards = computed(() => [
  {
    title: 'Chứng chỉ',
    value: totalItems.value,
    description: 'Bản ghi khớp với bộ lọc hiện tại',
    icon: 'pi pi-file',
    tone: 'primary' as const,
  },
  {
    title: 'Đang hiệu lực',
    value: activeCount.value,
    description: 'Chứng chỉ khả dụng trên trang hiện tại',
    icon: 'pi pi-verified',
    tone: 'success' as const,
  },
  {
    title: 'Người mua duy nhất',
    value: uniqueBuyerCount.value,
    description: 'Số người mua khác nhau trong kết quả',
    icon: 'pi pi-users',
    tone: 'info' as const,
  },
  {
    title: 'Sẵn sàng xem trước',
    value: previewReadyCount.value,
    description: 'Bản ghi có thể render HTML để xem trước',
    icon: 'pi pi-eye',
    tone: 'warning' as const,
  },
])

const statusOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang hiệu lực', value: 'ACTIVE' as const },
]
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pagination.pageSize)))
const pageStart = computed(() => (totalItems.value === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, totalItems.value))
const previewCandidates = computed(() => rows.value.filter((certificate) => certificate.trackSnapshotName))

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

const formatDateTime = (value: string | null) => {
  if (typeof value !== 'string' || value.length === 0) return 'Chưa có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatCertificateStatus = (value: string) => (value === 'ACTIVE' ? 'Đang hiệu lực' : value)
const formatUsageRights = (values: string[]) => values.map((value) => usageRightLabelMap[value] ?? value).join(', ')
const summaryCardToneClass = (tone: keyof typeof summaryToneClassMap) => summaryToneClassMap[tone]
const formatArtistOptionLabel = (artist: ManagedUser) => `${artist.fullName} · ${artist.email}`

const fetchArtistOptions = async () => {
  isArtistsLoading.value = true

  try {
    const response = await listManagedUsers({
      page: 1,
      pageSize: 200,
      roleName: 'Artist',
      status: 'ACTIVE',
    })

    artistOptions.value = [...response.data.items]
      .sort((left, right) => left.fullName.localeCompare(right.fullName, undefined, { sensitivity: 'base' }))
      .map((artist) => ({
        value: artist.id,
        label: formatArtistOptionLabel(artist),
      }))
  } catch (error) {
    setError(error)
  } finally {
    isArtistsLoading.value = false
  }
}

const fetchCertificates = async () => {
  clearMessages()
  isLoading.value = true
  try {
    const { data, meta } = await listAdminCertificates({
      page: pagination.page,
      pageSize: pagination.pageSize,
      buyerKeyword: filters.buyerKeyword.trim().length > 0 ? filters.buyerKeyword.trim() : undefined,
      trackKeyword: filters.trackKeyword.trim().length > 0 ? filters.trackKeyword.trim() : undefined,
      artistId: filters.artistId.trim().length > 0 ? filters.artistId.trim() : undefined,
      status: filters.status || undefined,
      fromDate: filters.fromDate.trim().length > 0 ? filters.fromDate.trim() : undefined,
      toDate: filters.toDate.trim().length > 0 ? filters.toDate.trim() : undefined,
    })

    rows.value = data.items
    totalItems.value = meta.pagination.totalItems
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const openDetail = async (certificateId: string) => {
  clearMessages()
  isLoading.value = true
  try {
    const { data } = await getAdminCertificateDetail(certificateId)
    detail.value = data
    renderedHtml.value = null
    detailDialogVisible.value = true
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const downloadPdf = async (certificateId: string) => {
  clearMessages()
  isLoading.value = true
  try {
    const { data } = await getAdminCertificateDownloadUrl(certificateId)
    window.open(data.downloadUrl, '_blank')
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const renderDetailHtml = async (certificateId: string) => {
  clearMessages()
  isLoading.value = true
  try {
    const { data } = await renderAdminCertificateHtml(certificateId)
    renderedHtml.value = data.html
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const loadTemplate = async () => {
  try {
    const { data } = await getAdminCertificateTemplate()
    templateHtml.value = data.htmlTemplate
    templateUpdatedAt.value = data.updatedAt
    templateUnavailableMessage.value = null
  } catch (error) {
    templateUnavailableMessage.value =
      error instanceof Error ? error.message : 'Tính năng template chưa khả dụng trên schema hiện tại'
  }
}

const saveTemplate = async () => {
  clearMessages()
  templateSaveLoading.value = true
  try {
    const { data } = await updateAdminCertificateTemplate(templateHtml.value)
    templateUpdatedAt.value = data.updatedAt
    successMessage.value = 'Đã lưu template'
  } catch (error) {
    setError(error)
  } finally {
    templateSaveLoading.value = false
  }
}

const previewRender = async () => {
  const id = previewCertificateId.value.trim()
  if (id.length === 0) return

  clearMessages()
  previewLoading.value = true
  try {
    const { data } = await renderAdminCertificateHtml(id)
    previewHtml.value = data.html
  } catch (error) {
    setError(error)
  } finally {
    previewLoading.value = false
  }
}

const resetFilters = async () => {
  filters.buyerKeyword = ''
  filters.trackKeyword = ''
  filters.artistId = ''
  filters.status = 'ACTIVE'
  filters.fromDate = ''
  filters.toDate = ''
  pagination.page = 1
  await fetchCertificates()
}

const selectPreviewCandidate = (certificateId: string) => {
  previewCertificateId.value = certificateId
}

const openPreviewPanel = async (certificateId: string) => {
  selectPreviewCandidate(certificateId)
  await previewRender()
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchCertificates()
}

onMounted(async () => {
  await Promise.all([fetchCertificates(), loadTemplate(), fetchArtistOptions()])
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(109,74,255,0.22),transparent_38%),radial-gradient(circle_at_60%_120%,rgba(56,189,248,0.14),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.92))] p-5 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_60%_120%,rgba(14,165,233,0.16),transparent_44%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 sm:p-6 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Quản trị viên
        </div>
        <div>
          <h1 class="m-0 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">Quản lý chứng chỉ</h1>
        </div>
      </div>

      <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="fetchCertificates">
        <i class="pi pi-refresh mr-2" />
        Làm mới
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

    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
      <div class="space-y-6">
        <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div class="text-xl font-semibold text-slate-950 dark:text-white">Danh sách chứng chỉ</div>
            </div>
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-[780px] xl:grid-cols-3">
              <ProductFilterInput v-model="filters.buyerKeyword" icon-class="pi pi-user" placeholder="Người mua" :disabled="isLoading" />
              <ProductFilterInput v-model="filters.trackKeyword" icon-class="pi pi-wave-pulse" placeholder="Track" :disabled="isLoading" />
              <ProductFilterSelect v-model="filters.status" icon-class="pi pi-tag" :options="statusOptions" :disabled="isLoading" />
              <div class="relative">
                <select v-model="filters.artistId" :class="selectFieldClass" :disabled="isLoading || isArtistsLoading">
                  <option value="">Tất cả nghệ sĩ</option>
                  <option v-for="artist in artistOptions" :key="artist.value" :value="artist.value">
                    {{ artist.label }}
                  </option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
              </div>
              <input v-model="filters.fromDate" :class="fieldClass" placeholder="Từ ngày (ISO date)" />
              <input v-model="filters.toDate" :class="fieldClass" placeholder="Đến ngày (ISO date)" />
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              :class="[secondaryButtonClass, 'w-full sm:w-auto']"
              :disabled="isLoading"
              @click="() => { pagination.page = 1; void fetchCertificates() }"
            >
              Tìm kiếm
            </button>
            <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="() => void resetFilters()">
              Đặt lại
            </button>
          </div>

          <div class="mt-4 space-y-3">
            <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
            <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
          </div>

          <div class="mt-6 space-y-4">
            <CertificateListItemCard
              v-for="certificate in rows"
              :key="certificate.id"
              :certificate="certificate"
              :is-busy="isLoading"
              @detail="openDetail"
              @preview="(certificateId: string) => void openPreviewPanel(certificateId)"
              @download="(certificateId: string) => void downloadPdf(certificateId)"
            />

            <div
              v-if="!isLoading && rows.length === 0"
              class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm dark:bg-slate-950 dark:text-violet-300">
                <i class="pi pi-file-pdf text-xl" />
              </div>
              <div class="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Không có chứng chỉ phù hợp</div>
              <div class="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Thử đổi bộ lọc người mua, track, trạng thái hoặc khoảng ngày để mở rộng kết quả.
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div class="text-sm text-slate-500 dark:text-slate-400">
              {{ pageStart }}-{{ pageEnd }} / {{ totalItems }} chứng chỉ
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
      </div>

      <section class="space-y-4 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
        <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <i class="pi pi-code text-violet-500" />
          Template Platform
        </div>

        <div class="space-y-2">
          <div class="text-lg font-semibold text-slate-950 dark:text-white">Template chứng chỉ</div>
          <div class="text-sm text-slate-500 dark:text-slate-400">
            Chỉnh sửa HTML template và render nhanh theo chứng chỉ đang có.
          </div>
        </div>

        <Message v-if="templateUnavailableMessage" severity="warn">{{ templateUnavailableMessage }}</Message>

        <div v-if="templateUpdatedAt" class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          <span class="font-semibold text-slate-900 dark:text-white">Cập nhật lúc:</span>
          {{ formatDateTime(templateUpdatedAt) }}
        </div>

        <Textarea
          v-model="templateHtml"
          rows="16"
          autoResize
          class="w-full"
          :disabled="!!templateUnavailableMessage"
        />

        <div class="flex justify-end">
          <button type="button" :class="primaryButtonClass" :disabled="templateSaveLoading || !!templateUnavailableMessage" @click="saveTemplate">
            Lưu template
          </button>
        </div>

        <div class="space-y-3 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Xem trước HTML</div>
          <div class="grid gap-3">
            <select
              v-model="previewCertificateId"
              :class="fieldClass"
            >
              <option value="">Chọn chứng chỉ để xem trước</option>
              <option
                v-for="certificate in previewCandidates"
                :key="certificate.id"
                :value="certificate.id"
              >
                {{ certificate.trackSnapshotName }} • {{ certificate.buyerSnapshotName }}
              </option>
            </select>
            <button type="button" :class="secondaryButtonClass" :disabled="previewLoading || !!templateUnavailableMessage || !previewCertificateId" @click="previewRender">
              Xem trước
            </button>
          </div>
          <iframe v-if="previewHtml" class="h-[360px] w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" sandbox="" :srcdoc="previewHtml" />
        </div>
      </section>
    </section>

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      header="Chi tiết chứng chỉ"
      class="dialog"
      :pt="{ content: { class: 'max-h-[calc(100svh-10rem)] overflow-y-auto' } }"
    >
      <div v-if="detail" class="detail">
        <div class="detail-grid">
          <div><strong>Track:</strong> {{ detail.trackSnapshotName }}</div>
          <div><strong>Người mua:</strong> {{ detail.buyerSnapshotName }} ({{ detail.buyerEmail || 'Chưa có email' }})</div>
          <div><strong>Nghệ sĩ:</strong> {{ detail.artistSnapshotName }}</div>
          <div><strong>Trạng thái:</strong> {{ formatCertificateStatus(detail.status) }}</div>
          <div><strong>Hiệu lực từ:</strong> {{ formatDateTime(detail.validFrom) }}</div>
          <div><strong>Hiệu lực đến:</strong> {{ formatDateTime(detail.validUntil) }}</div>
          <div><strong>Tạo lúc:</strong> {{ formatDateTime(detail.createdAt) }}</div>
          <div><strong>PDF key:</strong> {{ detail.pdfFileKey }}</div>
          <div><strong>Quyền đã chọn:</strong> {{ formatUsageRights(detail.selectedUsageRights) }}</div>
        </div>

        <div class="detail-actions">
          <Button label="Xem HTML" severity="secondary" :disabled="isLoading" @click="renderDetailHtml(detail.id)" />
          <Button label="Tải PDF" :disabled="isLoading" @click="downloadPdf(detail.id)" />
        </div>

        <iframe
          v-if="renderedHtml"
          class="preview-iframe"
          sandbox=""
          :srcdoc="renderedHtml"
        />
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <Button label="Đóng" severity="secondary" class="w-full sm:w-auto" @click="detailDialogVisible = false" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.dialog {
  width: min(1000px, calc(100vw - 1rem));
}

.detail {
  display: grid;
  gap: 12px;
}

.detail-grid {
  display: grid;
  gap: 6px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
