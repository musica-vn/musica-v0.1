<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../api/axios'
import { listManagedUsers } from '../../services/managed-users.service'
import {
  getAdminCertificateDetail,
  getAdminCertificateDownloadUrl,
  getAdminCertificateTemplate,
  listAdminCertificates,
  renderAdminCertificateHtml,
  updateAdminCertificateTemplate,
} from '../../services/certificates.service'
import type {
  CertificateDetail,
  CertificateListItem as CertificateListItemType,
} from '../../types/certificates.types'
import AdminStatCard from '../../components/features/admin-shell/AdminStatCard.vue'
import AdminFilterInput from '../../components/shared/admin/AdminFilterInput.vue'
import AdminFilterSelect from '../../components/shared/admin/AdminFilterSelect.vue'
import AdminPageHeader from '../../components/shared/admin/AdminPageHeader.vue'
import AdminPaginationBar from '../../components/shared/admin/AdminPaginationBar.vue'
import CertificateListItemCard from '../../components/features/certificates/CertificateListItem.vue'
import type { ManagedUser } from '../../types/managed-users.types'

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
  'h-12 w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60'
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
    tone: 'slate' as const,
  },
  {
    title: 'Đang hiệu lực',
    value: activeCount.value,
    description: 'Chứng chỉ khả dụng trên trang hiện tại',
    icon: 'pi pi-verified',
    tone: 'emerald' as const,
  },
  {
    title: 'Người mua duy nhất',
    value: uniqueBuyerCount.value,
    description: 'Số người mua khác nhau trong kết quả',
    icon: 'pi pi-users',
    tone: 'sky' as const,
  },
  {
    title: 'Sẵn sàng xem trước',
    value: previewReadyCount.value,
    description: 'Bản ghi có thể render HTML để xem trước',
    icon: 'pi pi-eye',
    tone: 'amber' as const,
  },
])

const statusOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang hiệu lực', value: 'ACTIVE' as const },
]
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pagination.pageSize)))
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

const handlePageChange = async (page: number) => {
  await goToPage(page)
}

const handlePageSizeChange = async (pageSize: number) => {
  if (pageSize === pagination.pageSize) return
  pagination.pageSize = pageSize
  pagination.page = 1
  await fetchCertificates()
}

onMounted(async () => {
  await Promise.all([fetchCertificates(), loadTemplate(), fetchArtistOptions()])
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <AdminPageHeader
      kicker="Chứng chỉ"
      title="Quản lý chứng chỉ"
      description="Theo dõi danh sách chứng chỉ, bộ lọc giao dịch và template HTML trong cùng một ngôn ngữ UI."
      icon-class="pi pi-file-pdf"
    >
      <template #actions>
        <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading" @click="fetchCertificates">
          <i class="pi pi-refresh mr-2" />
          Làm mới
        </button>
      </template>
    </AdminPageHeader>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
      <div class="space-y-6">
        <section class="rounded-[32px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div class="text-xl font-semibold text-[color:var(--admin-text)]">Danh sách chứng chỉ</div>
            </div>
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-[780px] xl:grid-cols-3">
              <AdminFilterInput v-model="filters.buyerKeyword" icon-class="pi pi-user" placeholder="Người mua" :disabled="isLoading" />
              <AdminFilterInput v-model="filters.trackKeyword" icon-class="pi pi-wave-pulse" placeholder="Track" :disabled="isLoading" />
              <AdminFilterSelect v-model="filters.status" icon-class="pi pi-tag" :options="statusOptions" :disabled="isLoading" />
              <div class="relative">
                <select v-model="filters.artistId" :class="selectFieldClass" :disabled="isLoading || isArtistsLoading">
                  <option value="">Tất cả nghệ sĩ</option>
                  <option v-for="artist in artistOptions" :key="artist.value" :value="artist.value">
                    {{ artist.label }}
                  </option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
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
              class="flex flex-col items-center justify-center rounded-[28px] border border-dashed [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-6 py-14 text-center"
            >
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--admin-surface-0)] text-[color:var(--admin-primary-700)] shadow-sm">
                <i class="pi pi-file-pdf text-xl" />
              </div>
              <div class="mt-4 text-lg font-semibold text-[color:var(--admin-text)]">Không có chứng chỉ phù hợp</div>
              <div class="mt-2 max-w-md text-sm text-[color:var(--admin-text-muted)]">
                Thử đổi bộ lọc người mua, track, trạng thái hoặc khoảng ngày để mở rộng kết quả.
              </div>
            </div>
          </div>

          <div class="mt-6">
            <AdminPaginationBar
              :page="pagination.page"
              :page-size="pagination.pageSize"
              :total-items="totalItems"
              :disabled="isLoading"
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange"
            />
          </div>
        </section>
      </div>

      <section class="space-y-4 rounded-[32px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur">
        <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
          <i class="pi pi-code text-[color:var(--admin-primary-600)]" />
          Template Platform
        </div>

        <div class="space-y-2">
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">Template chứng chỉ</div>
          <div class="text-sm text-[color:var(--admin-text-muted)]">
            Chỉnh sửa HTML template và render nhanh theo chứng chỉ đang có.
          </div>
        </div>

        <Message v-if="templateUnavailableMessage" severity="warn">{{ templateUnavailableMessage }}</Message>

        <div v-if="templateUpdatedAt" class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-3 text-sm text-[color:var(--admin-text-muted)]">
          <span class="font-semibold text-[color:var(--admin-text)]">Cập nhật lúc:</span>
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

        <div class="space-y-3 rounded-[28px] border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] p-4">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Xem trước HTML</div>
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
          <iframe v-if="previewHtml" class="h-[360px] w-full rounded-2xl border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)]" sandbox="" :srcdoc="previewHtml" />
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
          <div class="detail-row"><strong>Track:</strong> {{ detail.trackSnapshotName }}</div>
          <div class="detail-row"><strong>Người mua:</strong> {{ detail.buyerSnapshotName }} ({{ detail.buyerEmail || 'Chưa có email' }})</div>
          <div class="detail-row"><strong>Nghệ sĩ:</strong> {{ detail.artistSnapshotName }}</div>
          <div class="detail-row"><strong>Trạng thái:</strong> {{ formatCertificateStatus(detail.status) }}</div>
          <div class="detail-row"><strong>Hiệu lực từ:</strong> {{ formatDateTime(detail.validFrom) }}</div>
          <div class="detail-row"><strong>Hiệu lực đến:</strong> {{ formatDateTime(detail.validUntil) }}</div>
          <div class="detail-row"><strong>Tạo lúc:</strong> {{ formatDateTime(detail.createdAt) }}</div>
          <div class="detail-row"><strong>PDF key:</strong> {{ detail.pdfFileKey }}</div>
          <div class="detail-row"><strong>Quyền đã chọn:</strong> {{ formatUsageRights(detail.selectedUsageRights) }}</div>
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
  gap: 16px;
}

.detail-grid {
  display: grid;
  gap: 10px;
  border: 1px solid var(--admin-border);
  background: linear-gradient(180deg, var(--admin-surface-0), var(--admin-surface-1));
  border-radius: 24px;
  padding: 16px;
}

.detail-row {
  color: var(--admin-text-muted);
  line-height: 1.6;
}

.detail-row strong {
  color: var(--admin-text);
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
