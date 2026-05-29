<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiClientError } from '../../../shared/api/http'
import { useCorePermissionsStore } from '../../core-permissions/core-permissions.store'
import type { CorePermission, CorePermissionStatus } from '../../core-permissions/core-permissions.types'

const fieldClass =
  'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
const textAreaClass =
  'min-h-[132px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
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

const form = reactive<{
  code: string
  name: string
  lawReference: string
  description: string
  status: CorePermissionStatus
}>({
  code: '',
  name: '',
  lawReference: '',
  description: '',
  status: 'ACTIVE',
})

const totalPages = computed(() => store.meta?.pagination.totalPages ?? 1)
const pageStart = computed(() => (store.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1))
const pageEnd = computed(() => Math.min(pagination.page * pagination.pageSize, store.totalItems))
const totalActive = computed(() => store.items.filter((item) => item.status === 'ACTIVE').length)
const totalInactive = computed(() => store.items.filter((item) => item.status === 'INACTIVE').length)

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
  selectedPermission.value = null
  form.code = ''
  form.name = ''
  form.lawReference = ''
  form.description = ''
  form.status = 'ACTIVE'
  editDialogVisible.value = false
  createDialogVisible.value = true
}

const openEdit = (permission: CorePermission) => {
  clearGlobalFeedback()
  selectedPermission.value = permission
  form.code = permission.code
  form.name = permission.name
  form.lawReference = permission.lawReference
  form.description = permission.description ?? ''
  form.status = permission.status
  createDialogVisible.value = false
  editDialogVisible.value = true
}

const submitCreate = async () => {
  clearGlobalFeedback()
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
    successMessage.value = 'Đã cập nhật core permission.'
    editDialogVisible.value = false
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
    successMessage.value = 'Đã xoá core permission.'
    await fetchList()
  } catch (error) {
    setGlobalError(error)
  }
}

const goToPage = async (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === pagination.page) return

  pagination.page = nextPage
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
  <div class="space-y-6">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(109,74,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.92))] p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="space-y-3">
        <div class="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Master Data
        </div>
        <div>
          <h1 class="m-0 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Core Permission Settings</h1>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Quản lý quyền cốt lõi cho Product và Compliance, đồng bộ trạng thái ngay trong form chỉnh sửa.
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <article class="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active</div>
          <div class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ totalActive }}</div>
        </article>
        <article class="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Inactive</div>
          <div class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ totalInactive }}</div>
        </article>
      </div>
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-950 dark:text-white">Danh sách core permission</div>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tìm kiếm tự động bằng debounce, lọc nhanh theo trạng thái và chỉnh sửa trực tiếp trong modal.
          </div>
        </div>

        <div class="flex w-full flex-col gap-3 xl:max-w-[760px]">
          <div class="grid gap-3 md:grid-cols-[1.7fr_1fr_auto]">
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keyword</span>
              <input
                v-model="filters.keyword"
                :class="fieldClass"
                placeholder="Tìm theo tên quyền hoặc law reference"
                :disabled="store.isLoading"
              />
            </label>
            <label class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</span>
              <select v-model="filters.status" :class="fieldClass" :disabled="store.isLoading">
                <option value="">Tất cả</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <div class="flex items-end">
              <button type="button" :class="primaryButtonClass" :disabled="store.isLoading" @click="openCreate">
                <i class="pi pi-plus mr-2" />
                Thêm quyền
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
      </div>

      <div class="mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40">
        <div class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="w-20 px-4 py-4 font-semibold">STT</th>
                <th class="px-4 py-4 font-semibold">Core Permission</th>
                <th class="px-4 py-4 font-semibold">Law Reference</th>
                <th class="w-36 px-4 py-4 font-semibold">Trạng thái</th>
                <th class="w-44 px-4 py-4 font-semibold">Cập nhật</th>
                <th class="w-32 px-4 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr
                v-for="(permission, index) in store.items"
                :key="permission.id"
                class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30"
              >
                <td class="px-4 py-4">
                  <div class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {{ (pagination.page - 1) * pagination.pageSize + index + 1 }}
                  </div>
                </td>
                <td class="px-4 py-4">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ permission.name }}</div>
                  <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {{ permission.description || 'Chưa có mô tả cho core permission này.' }}
                  </div>
                </td>
                <td class="px-4 py-4 text-slate-600 dark:text-slate-300">
                  <div class="line-clamp-2">{{ permission.lawReference }}</div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    :class="
                      permission.status === 'ACTIVE'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    "
                  >
                    {{ permission.status }}
                  </span>
                </td>
                <td class="px-4 py-4 text-slate-500 dark:text-slate-400">
                  {{ new Date(permission.updatedAt).toLocaleString() }}
                </td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                      :disabled="store.isLoading"
                      @click="openEdit(permission)"
                    >
                      <i class="pi pi-pencil" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-rose-300 dark:hover:border-rose-500/30 dark:hover:text-rose-200"
                      :disabled="store.isLoading"
                      @click="removeOne(permission)"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!store.isLoading && store.items.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
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
          <button type="button" :class="secondaryButtonClass" :disabled="store.isLoading || pagination.page <= 1" @click="goToPage(pagination.page - 1)">
            Trước
          </button>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {{ pagination.page }} / {{ totalPages }}
          </div>
          <button type="button" :class="secondaryButtonClass" :disabled="store.isLoading || pagination.page >= totalPages" @click="goToPage(pagination.page + 1)">
            Sau
          </button>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="createDialogVisible" modal class="w-[min(820px,94vw)]">
      <template #header>
        <div class="flex w-full items-center justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">Thêm core permission</div>
            <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">Tạo quyền cốt lõi mới cho luồng Product và Compliance.</div>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <i class="pi pi-plus" />
          </div>
        </div>
      </template>

      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Thông tin chính</div>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Code</span>
            <input v-model="form.code" :class="fieldClass" placeholder="PERFORM_PUBLIC" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Name</span>
            <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Law Reference</span>
            <input
              v-model="form.lawReference"
              :class="fieldClass"
              placeholder="Khoản 1 Điều 20 Luật SHTT"
              :disabled="isSubmitting"
            />
          </label>
        </section>

        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Mô tả</div>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</span>
            <textarea v-model="form.description" :class="textAreaClass" :disabled="isSubmitting" placeholder="Mô tả ngắn về phạm vi sử dụng của quyền này" />
          </label>
          <div class="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            Core permission mới sẽ khởi tạo với trạng thái `ACTIVE`.
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button type="button" :class="secondaryButtonClass" :disabled="isSubmitting" @click="createDialogVisible = false">Huỷ</button>
          <button type="button" :class="primaryButtonClass" :disabled="isSubmitting" @click="submitCreate">Tạo</button>
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal class="w-[min(860px,94vw)]">
      <template #header>
        <div class="flex w-full items-center justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">Chỉnh sửa core permission</div>
            <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">Cập nhật nội dung và trạng thái ngay trong cùng một form.</div>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <i class="pi pi-pencil" />
          </div>
        </div>
      </template>

      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Code</div>
            <div class="mt-2 font-mono text-sm font-semibold uppercase text-violet-600 dark:text-violet-300">{{ form.code }}</div>
          </div>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Name</span>
            <input v-model="form.name" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Law Reference</span>
            <input v-model="form.lawReference" :class="fieldClass" :disabled="isSubmitting" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</span>
            <textarea v-model="form.description" :class="textAreaClass" :disabled="isSubmitting" placeholder="Mô tả ngắn về phạm vi sử dụng của quyền này" />
          </label>
        </section>

        <section class="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Trạng thái quyền</div>
          <button
            type="button"
            class="w-full rounded-[24px] border px-4 py-4 text-left transition"
            :class="
              form.status === 'ACTIVE'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200'
            "
            :disabled="isSubmitting"
            @click="form.status = 'ACTIVE'"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold">ACTIVE</div>
                <div class="mt-1 text-sm opacity-80">Quyền đang sẵn sàng để dùng cho Product và Compliance.</div>
              </div>
              <i class="pi pi-check-circle text-base" />
            </div>
          </button>
          <button
            type="button"
            class="w-full rounded-[24px] border px-4 py-4 text-left transition"
            :class="
              form.status === 'INACTIVE'
                ? 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200'
            "
            :disabled="isSubmitting"
            @click="form.status = 'INACTIVE'"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold">INACTIVE</div>
                <div class="mt-1 text-sm opacity-80">Ngừng sử dụng quyền này trong các flow mới nếu không còn được tham chiếu.</div>
              </div>
              <i class="pi pi-ban text-base" />
            </div>
          </button>

          <div class="rounded-[24px] border border-dashed border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Khi chuyển sang `INACTIVE`, hệ thống sẽ chặn nếu quyền này vẫn đang được sử dụng.
          </div>
        </section>
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
