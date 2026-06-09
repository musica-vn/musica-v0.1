<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiClientError } from '../../api/axios'
import AdminStatCard from '../../components/features/admin-shell/AdminStatCard.vue'
import CorePermissionMobileCardList from '../../components/features/admin-shell/CorePermissionMobileCardList.vue'
import AdminFilterInput from '../../components/shared/admin/AdminFilterInput.vue'
import AdminFilterSelect from '../../components/shared/admin/AdminFilterSelect.vue'
import AdminPageHeader from '../../components/shared/admin/AdminPageHeader.vue'
import AdminPaginationBar from '../../components/shared/admin/AdminPaginationBar.vue'
import { useCorePermissionsStore } from '../../stores/core-permissions.store'
import type { CorePermission, CorePermissionStatus } from '../../types/core-permissions.types'

const fieldClass =
  'h-12 w-full min-w-0 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const textAreaClass =
  'min-h-[132px] w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const selectFieldClass =
  'h-12 w-full min-w-0 appearance-none rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 pr-11 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60'

const confirm = useConfirm()
const store = useCorePermissionsStore()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const filters = reactive<{ keyword: string; status: CorePermissionStatus | '' }>({
  keyword: '',
  status: '',
})

const pagination = reactive({ page: 1, pageSize: 20 })

const permissionDialogVisible = ref(false)
const selectedPermission = ref<CorePermission | null>(null)
const isSubmitting = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

const form = reactive<{
  name: string
  lawReference: string
  description: string
  status: CorePermissionStatus
}>({
  name: '',
  lawReference: '',
  description: '',
  status: 'INACTIVE',
})

const totalPages = computed(() => store.meta?.pagination.totalPages ?? 1)
const totalPermissionCount = computed(() => store.totalItems)
const totalActive = computed(() => store.items.filter((item) => item.status === 'ACTIVE').length)
const totalInactive = computed(() => store.items.filter((item) => item.status === 'INACTIVE').length)
const isCreateMode = computed(() => dialogMode.value === 'create')
const dialogTitle = computed(() => (isCreateMode.value ? 'Thêm quyền cốt lõi' : 'Chỉnh sửa quyền cốt lõi'))
const dialogDescription = computed(() =>
  isCreateMode.value
    ? 'Tạo quyền cốt lõi mới cho luồng Product và Compliance.'
    : 'Cập nhật nội dung và trạng thái trong cùng một form.',
)
const dialogSubmitLabel = computed(() => (isCreateMode.value ? 'Tạo' : 'Lưu'))

const clearGlobalFeedback = () => {
  errorMessage.value = null
  successMessage.value = null
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError) {
      return error.message
  }

  return error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

const setGlobalError = (error: unknown) => {
  errorMessage.value = resolveErrorMessage(error)
}

const formatStatusLabel = (status: CorePermissionStatus) => {
  if (status === 'ACTIVE') return 'Đang hoạt động'
  return 'Ngừng hoạt động'
}

const getStatusClass = (status: CorePermissionStatus) => {
  if (status === 'ACTIVE') {
    return 'bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
  }

  return 'bg-[color:var(--admin-surface-2)] text-[color:var(--admin-text-muted)]'
}

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const resolveIndexLabel = (_permission: CorePermission, index: number) =>
  String((pagination.page - 1) * pagination.pageSize + index + 1)

const resolveStatusLabel = (permission: CorePermission) => formatStatusLabel(permission.status)

const resolveStatusClass = (permission: CorePermission) => getStatusClass(permission.status)

const resolveUpdatedAtLabel = (permission: CorePermission) => formatUpdatedAt(permission.updatedAt)

const statusOptions = [
  { label: 'Tất cả', value: '' as CorePermissionStatus | '' },
  { label: 'Đang hoạt động', value: 'ACTIVE' as CorePermissionStatus },
  { label: 'Ngừng hoạt động', value: 'INACTIVE' as CorePermissionStatus },
]

const fetchList = async () => {
  clearGlobalFeedback()

  try {
    await store.fetchCorePermissions({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
      status: filters.status || undefined,
    })
  } catch (error) {
    setGlobalError(error)
  }
}

const openCreate = () => {
  clearGlobalFeedback()
  dialogMode.value = 'create'
  selectedPermission.value = null
  form.name = ''
  form.lawReference = ''
  form.description = ''
  form.status = 'INACTIVE'
  permissionDialogVisible.value = true
}

const openEdit = (permission: CorePermission) => {
  clearGlobalFeedback()
  dialogMode.value = 'edit'
  selectedPermission.value = permission
  form.name = permission.name
  form.lawReference = permission.lawReference
  form.description = permission.description ?? ''
  form.status = permission.status
  permissionDialogVisible.value = true
}

const submitCreate = async () => {
  clearGlobalFeedback()
  isSubmitting.value = true

  try {
    await store.createOne({
      name: form.name.trim(),
      lawReference: form.lawReference.trim(),
      description: form.description.trim().length > 0 ? form.description.trim() : undefined,
      status: form.status,
    })
    successMessage.value = 'Đã tạo quyền cốt lõi.'
    permissionDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setGlobalError(error)
  } finally {
    isSubmitting.value = false
  }
}

const submitEdit = async () => {
  if (!selectedPermission.value) return

  clearGlobalFeedback()
  isSubmitting.value = true

  try {
    await store.updateOne(selectedPermission.value.id, {
      name: form.name.trim(),
      lawReference: form.lawReference.trim(),
      description: form.description.trim().length > 0 ? form.description.trim() : undefined,
      status: form.status,
    })
    successMessage.value = 'Đã cập nhật quyền cốt lõi.'
    permissionDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setGlobalError(error)
  } finally {
    isSubmitting.value = false
  }
}

const removeOne = async (permission: CorePermission) => {
  clearGlobalFeedback()

  try {
    await store.removeOne(permission.id)
    successMessage.value = 'Đã xoá quyền cốt lõi.'
    await fetchList()
  } catch (error) {
    setGlobalError(error)
  }
}

const confirmDelete = (permission: CorePermission) => {
  confirm.require({
    header: 'Xác nhận xoá quyền cốt lõi',
    message: `Bạn có chắc muốn xoá quyền "${permission.name}" không?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Xoá',
    rejectLabel: 'Huỷ',
    accept: () => void removeOne(permission),
  })
}

const toggleStatus = async (permission: CorePermission) => {
  clearGlobalFeedback()

  try {
    const nextStatus: CorePermissionStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await store.setStatus(permission.id, nextStatus)
    successMessage.value = nextStatus === 'ACTIVE'
      ? 'Đã kích hoạt quyền cốt lõi.'
      : 'Đã tắt quyền cốt lõi.'
    await fetchList()
  } catch (error) {
    setGlobalError(error)
  }
}

const confirmToggleStatus = (permission: CorePermission) => {
  const nextStatus: CorePermissionStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  confirm.require({
    header: nextStatus === 'ACTIVE' ? 'Xác nhận kích hoạt quyền' : 'Xác nhận tắt quyền',
    message: nextStatus === 'ACTIVE'
      ? `Bạn có chắc muốn kích hoạt quyền "${permission.name}" không?`
      : `Bạn có chắc muốn tắt quyền "${permission.name}" không?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: nextStatus === 'ACTIVE' ? 'Kích hoạt' : 'Tắt',
    rejectLabel: 'Huỷ',
    accept: () => void toggleStatus(permission),
  })
}

const submitPermission = async () => {
  if (isCreateMode.value) {
    await submitCreate()
    return
  }

  await submitEdit()
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return

  pagination.page = nextPage
  await fetchList()
}

const handlePageChange = async (page: number) => {
  await goToPage(page)
}

const handlePageSizeChange = async (pageSize: number) => {
  if (pageSize === pagination.pageSize) return
  pagination.pageSize = pageSize
  pagination.page = 1
  await fetchList()
}

let filterDebounceTimer: number | null = null

watch(
  () => [filters.keyword, filters.status] as const,
  () => {
    if (filterDebounceTimer) window.clearTimeout(filterDebounceTimer)

    filterDebounceTimer = window.setTimeout(() => {
      pagination.page = 1
      void fetchList()
    }, 320)
  },
)

onMounted(() => {
  void fetchList()
})

onBeforeUnmount(() => {
  if (filterDebounceTimer) window.clearTimeout(filterDebounceTimer)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <AdminPageHeader
      kicker="Cấu hình"
      title="Quyền cốt lõi"
      description="Quản lý danh mục quyền cốt lõi dùng làm nền cho các gói quyền và luồng Compliance."
      icon-class="pi pi-sliders-h"
    >
      <template #actions>
        <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="store.isLoading" @click="openCreate">
          <i class="pi pi-plus mr-2 text-xs" />
          Thêm quyền
        </button>
      </template>
    </AdminPageHeader>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AdminStatCard
        title="Tổng quyền"
        :value="totalPermissionCount"
        description="Tổng bản ghi phù hợp với bộ lọc hiện tại"
        icon="pi pi-sitemap"
        tone="slate"
      />
      <AdminStatCard
        title="Đang hoạt động"
        :value="totalActive"
        description="Quyền đang sẵn sàng cho Product và Compliance"
        icon="pi pi-check-circle"
        tone="emerald"
      />
      <AdminStatCard
        title="Tạm ngừng"
        :value="totalInactive"
        description="Quyền đang được giữ ở trạng thái an toàn"
        icon="pi pi-ban"
        tone="amber"
      />
    </section>

    <section class="rounded-[32px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-xl font-semibold text-[color:var(--admin-text)]">Danh sách quyền cốt lõi</div>
          <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
            Tìm kiếm nhanh, lọc theo trạng thái và chỉnh sửa trực tiếp trong modal.
          </div>
        </div>

        <div class="flex w-full min-w-0 flex-col gap-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_1fr_auto] xl:items-end">
            <AdminFilterInput
              v-model="filters.keyword"
              icon-class="pi pi-search"
              placeholder="Tìm theo tên quyền hoặc law reference"
              :disabled="store.isLoading"
            />
            <AdminFilterSelect
              v-model="filters.status"
              icon-class="pi pi-tag"
              :options="statusOptions"
              :disabled="store.isLoading"
            />
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <CorePermissionMobileCardList
        class="mt-6"
        :permissions="store.items"
        :is-loading="store.isLoading"
        empty-message="Không có dữ liệu phù hợp với bộ lọc hiện tại."
        :resolve-index-label="resolveIndexLabel"
        :resolve-status-label="resolveStatusLabel"
        :resolve-status-class="resolveStatusClass"
        :resolve-updated-at-label="resolveUpdatedAtLabel"
        @edit="openEdit"
        @toggle="confirmToggleStatus"
        @remove="confirmDelete"
      />

      <div class="mt-6 hidden overflow-hidden rounded-[28px] border border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)] sm:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-[linear-gradient(180deg,var(--admin-surface-3),var(--admin-surface-2))] text-xs uppercase tracking-[0.18em] text-[color:var(--admin-text)]">
              <tr>
                <th class="w-20 px-4 py-4 font-semibold">STT</th>
                <th class="px-4 py-4 font-semibold">Quyền cốt lõi</th>
                <th class="px-4 py-4 font-semibold">Căn cứ pháp lý</th>
                <th class="w-36 px-4 py-4 font-semibold">Trạng thái</th>
                <th class="w-44 px-4 py-4 font-semibold">Cập nhật</th>
                <th class="w-32 px-4 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y [--tw-divide-opacity:1] [border-color:var(--admin-border)] divide-y-[color:var(--admin-border)]">
              <tr
                v-for="(permission, index) in store.items"
                :key="permission.id"
                class="transition"
                :class="index % 2 === 0
                  ? 'bg-[color:var(--admin-surface-0)] hover:bg-[color:var(--admin-surface-2)]'
                  : 'bg-[color:var(--admin-surface-1)] hover:bg-[color:var(--admin-surface-2)]'"
              >
                <td class="px-4 py-4">
                  <div class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--admin-surface-3)] text-sm font-semibold text-[color:var(--admin-primary-800)]">
                    {{ (pagination.page - 1) * pagination.pageSize + index + 1 }}
                  </div>
                </td>
                <td class="px-4 py-4">
                  <div class="break-words font-semibold text-[color:var(--admin-text)]">{{ permission.name }}</div>
                  <div class="mt-1 line-clamp-2 break-words text-xs leading-5 text-[color:var(--admin-text-muted)]">
                    {{ permission.description || 'Chưa có mô tả cho core permission này.' }}
                  </div>
                </td>
                <td class="px-4 py-4 text-[color:var(--admin-text-muted)]">
                  <div class="line-clamp-2 break-words">{{ permission.lawReference }}</div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    :class="getStatusClass(permission.status)"
                  >
                    {{ formatStatusLabel(permission.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 text-[color:var(--admin-text-muted)]">
                  {{ formatUpdatedAt(permission.updatedAt) }}
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)] disabled:opacity-60"
                      :disabled="store.isLoading"
                      @click="openEdit(permission)"
                    >
                      <i class="pi pi-pencil" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)] disabled:opacity-60"
                      :disabled="store.isLoading"
                      @click="confirmToggleStatus(permission)"
                    >
                      <i :class="permission.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-rose-600 transition [border-color:var(--admin-border)] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 dark:hover:bg-rose-500/10"
                      :disabled="store.isLoading"
                      @click="confirmDelete(permission)"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!store.isLoading && store.items.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-sm text-[color:var(--admin-text-muted)]">
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6">
        <AdminPaginationBar
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="store.totalItems"
          :disabled="store.isLoading"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </section>

    <Dialog
      v-model:visible="permissionDialogVisible"
      modal
      class="w-[calc(100vw-0.75rem)] sm:w-[min(920px,94vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
    >
      <template #header>
        <div class="w-full">
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">{{ dialogTitle }}</div>
          <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">{{ dialogDescription }}</div>
        </div>
      </template>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <section class="space-y-6 rounded-[28px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-4 sm:p-6">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">Thông tin chính</div>

          <label class="block">
            <span class="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Name</span>
            <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
          </label>

          <label class="block">
            <span class="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Law Reference</span>
            <input
              v-model="form.lawReference"
              :class="fieldClass"
              placeholder="Khoản 1 Điều 20 Luật SHTT"
              :disabled="isSubmitting"
            />
          </label>
        </section>

        <section class="space-y-6 rounded-[28px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-4 sm:p-6">
          <label class="block">
            <span class="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Description</span>
            <textarea
              v-model="form.description"
              :class="textAreaClass"
              :disabled="isSubmitting"
              placeholder="Mô tả ngắn về phạm vi sử dụng của quyền này"
            />
          </label>

          <div class="space-y-5">
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
              {{ isCreateMode ? 'Trạng thái mặc định' : 'Trạng thái quyền' }}
            </div>

            <button
              type="button"
              class="w-full rounded-[24px] border px-4 py-4 text-left transition"
              :class="
                form.status === 'ACTIVE'
                  ? 'border-[color:rgb(var(--admin-success-rgb)/0.34)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
                  : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:border-[color:rgb(var(--admin-success-rgb)/0.22)]'
              "
              :disabled="isSubmitting"
              @click="form.status = 'ACTIVE'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-2">
                  <div class="font-semibold">Đang hoạt động</div>
                  <div class="text-sm opacity-80">
                    {{ isCreateMode ? 'Cho phép quyền này sẵn sàng dùng ngay sau khi tạo.' : 'Quyền đang sẵn sàng để dùng cho Product và Compliance.' }}
                  </div>
                </div>
                <i class="pi pi-check-circle text-base" />
              </div>
            </button>

            <button
              type="button"
              class="w-full rounded-[24px] border px-4 py-4 text-left transition"
              :class="
                form.status === 'INACTIVE'
                  ? 'border-[color:rgb(var(--admin-danger-rgb)/0.32)] bg-[color:var(--admin-danger-50)] text-[color:var(--admin-danger-700)]'
                  : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:border-[color:rgb(var(--admin-danger-rgb)/0.2)]'
              "
              :disabled="isSubmitting"
              @click="form.status = 'INACTIVE'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-2">
                  <div class="font-semibold">Ngừng hoạt động</div>
                  <div class="text-sm opacity-80">
                    {{ isCreateMode ? 'Mặc định an toàn hơn, chỉ kích hoạt khi bạn sẵn sàng sử dụng.' : 'Ngừng sử dụng quyền này trong các flow mới nếu không còn được tham chiếu.' }}
                  </div>
                </div>
                <i class="pi pi-ban text-base" />
              </div>
            </button>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isSubmitting" @click="permissionDialogVisible = false">Huỷ</button>
          <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isSubmitting" @click="submitPermission">{{ dialogSubmitLabel }}</button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
