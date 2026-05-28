<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiClientError } from '../../../shared/api/http'
import { useCorePermissionsStore } from '../../core-permissions/core-permissions.store'
import type { CorePermission, CorePermissionStatus } from '../../core-permissions/core-permissions.types'

const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300'

const store = useCorePermissionsStore()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const filters = reactive<{ keyword: string; status: CorePermissionStatus | '' }>({
  keyword: '',
  status: '',
})

const pagination = reactive({ page: 1, pageSize: 20 })

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedPermission = ref<CorePermission | null>(null)
const isSubmitting = ref(false)

const form = reactive<{ code: string; name: string; lawReference: string; description: string }>({
  code: '',
  name: '',
  lawReference: '',
  description: '',
})

const totalPages = computed(() => store.meta?.pagination.totalPages ?? 1)
const pageStart = computed(() => (store.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, store.totalItems))

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
  await store.fetchCorePermissions({
    page: pagination.page,
    pageSize: pagination.pageSize,
    keyword: filters.keyword.trim().length > 0 ? filters.keyword.trim() : undefined,
    status: filters.status || undefined,
  })
}

const openCreate = () => {
  clearMessages()
  selectedPermission.value = null
  form.code = ''
  form.name = ''
  form.lawReference = ''
  form.description = ''
  editDialogVisible.value = false
  createDialogVisible.value = true
}

const openEdit = (permission: CorePermission) => {
  clearMessages()
  selectedPermission.value = permission
  form.code = permission.code
  form.name = permission.name
  form.lawReference = permission.lawReference
  form.description = permission.description ?? ''
  createDialogVisible.value = false
  editDialogVisible.value = true
}

const submitCreate = async () => {
  clearMessages()
  isSubmitting.value = true
  try {
    await store.createOne({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      lawReference: form.lawReference.trim(),
      description: form.description.trim().length > 0 ? form.description.trim() : undefined,
    })
    successMessage.value = 'Đã tạo core permission.'
    createDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmitting.value = false
  }
}

const submitEdit = async () => {
  if (!selectedPermission.value) return
  clearMessages()
  isSubmitting.value = true
  try {
    await store.updateOne(selectedPermission.value.id, {
      name: form.name.trim(),
      lawReference: form.lawReference.trim(),
      description: form.description.trim().length > 0 ? form.description.trim() : undefined,
    })
    successMessage.value = 'Đã cập nhật core permission.'
    editDialogVisible.value = false
    await fetchList()
  } catch (error) {
    setError(error)
  } finally {
    isSubmitting.value = false
  }
}

const toggleStatus = async (permission: CorePermission) => {
  clearMessages()
  const nextStatus: CorePermissionStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  try {
    await store.setStatus(permission.id, nextStatus)
    successMessage.value = 'Đã cập nhật trạng thái.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const removeOne = async (permission: CorePermission) => {
  clearMessages()
  try {
    await store.removeOne(permission.id)
    successMessage.value = 'Đã xoá core permission.'
    await fetchList()
  } catch (error) {
    setError(error)
  }
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return
  pagination.page = nextPage
  await fetchList()
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="text-xl font-semibold text-slate-950 dark:text-white">Core Permission Settings</div>
        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">Quản lý danh sách quyền cốt lõi (ACTIVE/INACTIVE) dùng cho Product & Compliance.</div>
      </div>
      <button type="button" :class="primaryButtonClass" :disabled="store.isLoading" @click="openCreate">
        <i class="pi pi-plus mr-2" />
        Thêm quyền
      </button>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="grid gap-3 md:grid-cols-3">
        <label class="space-y-2 md:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keyword</span>
          <input v-model="filters.keyword" :class="fieldClass" placeholder="Tìm theo code / name / law reference" :disabled="store.isLoading" />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</span>
          <select v-model="filters.status" :class="fieldClass" :disabled="store.isLoading">
            <option value="">Tất cả</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
      </div>

      <div class="mt-3 flex justify-end">
        <button type="button" :class="secondaryButtonClass" :disabled="store.isLoading" @click="fetchList">
          <i class="pi pi-filter mr-2" />
          Lọc
        </button>
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
                <th class="px-4 py-4 font-semibold">Code</th>
                <th class="px-4 py-4 font-semibold">Name</th>
                <th class="px-4 py-4 font-semibold">Law Reference</th>
                <th class="px-4 py-4 font-semibold">Status</th>
                <th class="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr v-for="permission in store.items" :key="permission.id" class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30">
                <td class="px-4 py-4">
                  <div class="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                    {{ permission.code }}
                  </div>
                </td>
                <td class="px-4 py-4">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ permission.name }}</div>
                  <div class="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{{ permission.description || '—' }}</div>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">{{ permission.lawReference }}</td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    :class="permission.status === 'ACTIVE'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'"
                  >
                    {{ permission.status }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="store.isLoading" @click="openEdit(permission)">
                      <i class="pi pi-pencil" />
                    </button>
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white" :disabled="store.isLoading" @click="toggleStatus(permission)">
                      <i :class="permission.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
                    </button>
                    <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-rose-300 dark:hover:border-rose-500/30 dark:hover:text-rose-200" :disabled="store.isLoading" @click="removeOne(permission)">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!store.isLoading && store.items.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có dữ liệu.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ store.totalItems }}
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" :class="secondaryButtonClass" :disabled="store.isLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">Trước</button>
          <button type="button" :class="secondaryButtonClass" :disabled="store.isLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">Sau</button>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="createDialogVisible" modal class="w-[min(760px,94vw)]" header="Thêm core permission">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Code</span>
          <input v-model="form.code" :class="fieldClass" placeholder="PERFORM_PUBLIC" :disabled="isSubmitting" />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Name</span>
          <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Law reference</span>
          <input v-model="form.lawReference" :class="fieldClass" placeholder="Khoản 1 Điều 20 Luật SHTT" :disabled="isSubmitting" />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</span>
          <input v-model="form.description" :class="fieldClass" :disabled="isSubmitting" />
        </label>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" :disabled="isSubmitting" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isSubmitting" @click="submitCreate">Tạo</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal class="w-[min(760px,94vw)]" header="Cập nhật core permission">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Code</span>
          <input v-model="form.code" :class="fieldClass" disabled />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Name</span>
          <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Law reference</span>
          <input v-model="form.lawReference" :class="fieldClass" :disabled="isSubmitting" />
        </label>
        <label class="space-y-2 sm:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</span>
          <input v-model="form.description" :class="fieldClass" :disabled="isSubmitting" />
        </label>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" :disabled="isSubmitting" @click="editDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isSubmitting" @click="submitEdit">Lưu</button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
