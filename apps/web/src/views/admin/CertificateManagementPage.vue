<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../shared/api/http'
import {
  getAdminCertificateDetail,
  getAdminCertificateDownloadUrl,
  getAdminCertificateTemplate,
  listAdminCertificates,
  renderAdminCertificateHtml,
  updateAdminCertificateTemplate,
} from '../../features/certificates/certificates.api'
import type { CertificateDetail, CertificateListItem } from '../../features/certificates/certificates.types'

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rows = ref<CertificateListItem[]>([])
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

const tableFirst = computed(() => (pagination.page - 1) * pagination.pageSize)

const detailDialogVisible = ref(false)
const detail = ref<CertificateDetail | null>(null)
const renderedHtml = ref<string | null>(null)

const templateHtml = ref('')
const templateUpdatedAt = ref<string | null>(null)
const templateSaveLoading = ref(false)

const previewCertificateId = ref('')
const previewHtml = ref<string | null>(null)
const previewLoading = ref(false)
const templateUnavailableMessage = ref<string | null>(null)
const activeCount = computed(() => rows.value.filter((certificate) => certificate.status === 'ACTIVE').length)
const uniqueBuyerCount = computed(() => new Set(rows.value.map((certificate) => certificate.buyerId)).size)
const previewReadyCount = computed(() => rows.value.filter((certificate) => Boolean(certificate.trackSnapshotName)).length)
const summaryCards = computed(() => [
  {
    title: 'Certificates',
    value: totalItems.value,
    description: 'Records matched by current filter',
    icon: 'pi pi-file',
  },
  {
    title: 'Active',
    value: activeCount.value,
    description: 'Usable certificates on current page',
    icon: 'pi pi-verified',
  },
  {
    title: 'Unique Buyers',
    value: uniqueBuyerCount.value,
    description: 'Distinct buyers in the current result',
    icon: 'pi pi-users',
  },
  {
    title: 'Preview Ready',
    value: previewReadyCount.value,
    description: 'Rows available for render-html preview',
    icon: 'pi pi-eye',
  },
])

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'ACTIVE', value: 'ACTIVE' as const },
]
const previewOptions = computed(() =>
  rows.value.map((certificate) => ({
    label: `${certificate.trackSnapshotName} • ${certificate.buyerSnapshotName}`,
    value: certificate.id,
  })),
)

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

const formatDateTime = (value: string | null) => {
  if (typeof value !== 'string' || value.length === 0) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
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

const openDetailAndRender = async (certificateId: string) => {
  await openDetail(certificateId)
  await renderDetailHtml(certificateId)
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
      error instanceof Error ? error.message : 'Template feature is not available on current schema'
  }
}

const saveTemplate = async () => {
  clearMessages()
  templateSaveLoading.value = true
  try {
    const { data } = await updateAdminCertificateTemplate(templateHtml.value)
    templateUpdatedAt.value = data.updatedAt
    successMessage.value = 'Template saved'
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

onMounted(async () => {
  await Promise.all([fetchCertificates(), loadTemplate()])
})
</script>

<template>
  <div class="page">
    <section class="hero">
      <div>
        <div class="eyebrow">Admin Panel</div>
        <h1 class="hero-title">Certificate Management</h1>
        <p class="hero-copy">
          Theo dõi certificate issuance, snapshot pháp lý và khu vực template editor theo layout dashboard sáng, nhiều khoảng trắng như ảnh bạn gửi.
        </p>
      </div>
      <div class="hero-actions">
        <Button label="Refresh" icon="pi pi-refresh" severity="secondary" outlined :disabled="isLoading" @click="fetchCertificates" />
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.title" class="summary-card">
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

    <section class="content-grid">
      <Card class="dashboard-card table-card">
        <template #content>
          <div class="panel-header">
            <div>
              <div class="panel-title">Certificates Directory</div>
              <div class="panel-copy">Tra cứu certificate, xem detail, mở file PDF và kiểm tra snapshot trước khi cấp lại.</div>
            </div>
          </div>

          <div class="toolbar">
            <div class="filters">
              <InputText v-model="filters.buyerKeyword" placeholder="Buyer keyword" />
              <InputText v-model="filters.trackKeyword" placeholder="Track keyword" />
              <InputText v-model="filters.artistId" placeholder="Artist ID" />
              <Dropdown v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value" />
              <InputText v-model="filters.fromDate" placeholder="From (ISO date)" />
              <InputText v-model="filters.toDate" placeholder="To (ISO date)" />
              <Button :disabled="isLoading" label="Search" severity="secondary" @click="() => { pagination.page = 1; fetchCertificates() }" />
              <Button
                :disabled="isLoading"
                label="Reset"
                text
                @click="() => {
                  filters.buyerKeyword = ''
                  filters.trackKeyword = ''
                  filters.artistId = ''
                  filters.status = 'ACTIVE'
                  filters.fromDate = ''
                  filters.toDate = ''
                  pagination.page = 1
                  fetchCertificates()
                }"
              />
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
            @page="(e) => { pagination.page = e.page + 1; pagination.pageSize = e.rows; fetchCertificates() }"
          >
            <Column header="Certificate">
              <template #body="{ data }">
                <div class="certificate-cell">
                  <div class="certificate-avatar">C</div>
                  <div>
                    <div class="cell-title">{{ data.trackSnapshotName }}</div>
                    <div class="cell-subtitle">{{ data.buyerSnapshotName }} • {{ formatDateTime(data.createdAt) }}</div>
                  </div>
                </div>
              </template>
            </Column>
            <Column header="Buyer">
              <template #body="{ data }">
                <div class="cell-stack">
                  <span class="cell-title">{{ data.buyerSnapshotName }}</span>
                  <span class="cell-subtitle">{{ data.buyerEmail || 'No email snapshot' }}</span>
                </div>
              </template>
            </Column>
            <Column header="Artist">
              <template #body="{ data }">
                <div class="cell-stack">
                  <span class="cell-title">{{ data.artistSnapshotName }}</span>
                  <span class="cell-subtitle">Rights owner</span>
                </div>
              </template>
            </Column>
            <Column header="Issued">
              <template #body="{ data }">
                <div class="cell-stack">
                  <span class="cell-title">{{ formatDateTime(data.validFrom) }}</span>
                  <span class="cell-subtitle">{{ formatDateTime(data.createdAt) }}</span>
                </div>
              </template>
            </Column>
            <Column header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" severity="success" />
              </template>
            </Column>
            <Column header="Actions">
              <template #body="{ data }">
                <div class="row-actions">
                  <Button size="small" rounded label="Detail" severity="secondary" :disabled="isLoading" @click="openDetail(data.id)" />
                  <Button size="small" rounded label="Render" severity="contrast" outlined :disabled="isLoading" @click="openDetailAndRender(data.id)" />
                  <Button size="small" rounded label="Download" :disabled="isLoading" @click="downloadPdf(data.id)" />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <Card class="dashboard-card side-card">
        <template #content>
          <div class="panel-header panel-header--tight">
            <div>
              <div class="panel-title">Certificate Template</div>
              <div class="panel-copy">Edit HTML template và preview nhanh theo certificate hiện có.</div>
            </div>
          </div>

          <Message v-if="templateUnavailableMessage" severity="warn">{{ templateUnavailableMessage }}</Message>
          <div class="template-meta">
            <div v-if="templateUpdatedAt"><strong>Updated At:</strong> {{ formatDateTime(templateUpdatedAt) }}</div>
          </div>

          <Textarea v-model="templateHtml" rows="12" autoResize class="template-textarea" :disabled="!!templateUnavailableMessage" />

          <div class="template-actions">
            <Button label="Save Template" :disabled="templateSaveLoading || !!templateUnavailableMessage" @click="saveTemplate" />
          </div>

          <div class="preview">
            <div class="preview-toolbar">
              <Dropdown
                v-model="previewCertificateId"
                :options="previewOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select certificate preview"
                class="preview-select"
              />
              <Button label="Preview" severity="secondary" :disabled="previewLoading || !!templateUnavailableMessage" @click="previewRender" />
            </div>
            <iframe v-if="previewHtml" class="preview-iframe preview-iframe--compact" sandbox="" :srcdoc="previewHtml" />
          </div>
        </template>
      </Card>
    </section>

    <Dialog v-model:visible="detailDialogVisible" modal header="Certificate Detail" class="dialog">
      <div v-if="detail" class="detail">
        <div class="detail-grid">
          <div><strong>Track:</strong> {{ detail.trackSnapshotName }}</div>
          <div><strong>Buyer:</strong> {{ detail.buyerSnapshotName }} ({{ detail.buyerEmail }})</div>
          <div><strong>Artist:</strong> {{ detail.artistSnapshotName }}</div>
          <div><strong>Status:</strong> {{ detail.status }}</div>
          <div><strong>Valid From:</strong> {{ formatDateTime(detail.validFrom) }}</div>
          <div><strong>Valid Until:</strong> {{ formatDateTime(detail.validUntil) }}</div>
          <div><strong>Created At:</strong> {{ formatDateTime(detail.createdAt) }}</div>
          <div><strong>PDF Key:</strong> {{ detail.pdfFileKey }}</div>
          <div><strong>Selected Rights:</strong> {{ detail.selectedUsageRights.join(', ') }}</div>
        </div>

        <div class="detail-actions">
          <Button label="Render HTML" severity="secondary" :disabled="isLoading" @click="renderDetailHtml(detail.id)" />
          <Button label="Download PDF" :disabled="isLoading" @click="downloadPdf(detail.id)" />
        </div>

        <iframe
          v-if="renderedHtml"
          class="preview-iframe"
          sandbox=""
          :srcdoc="renderedHtml"
        />
      </div>

      <template #footer>
        <Button label="Close" severity="secondary" @click="detailDialogVisible = false" />
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
  gap: 20px;
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

.panel-header--tight {
  margin-bottom: 12px;
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
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
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

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.certificate-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.certificate-avatar {
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

.dialog {
  width: min(1000px, 92vw);
}

.template-textarea {
  width: 100%;
}

.template-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.preview {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.preview-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.preview-select {
  min-width: 280px;
}

.preview-iframe {
  width: 100%;
  height: 500px;
  border: 1px solid var(--p-content-border-color, #ddd);
  border-radius: 8px;
}

.preview-iframe--compact {
  height: 360px;
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

.template-meta {
  margin-bottom: 10px;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
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
}
</style>

