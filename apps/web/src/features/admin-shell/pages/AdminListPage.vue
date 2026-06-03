<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import { ApiClientError } from '../../../shared/api/http'
import { useAdminsStore } from '../../admins/admins.store'
import { useAuthStore } from '../../auth/auth.store'
import type { AdminUser, UpdateAdminUserPayload } from '../../admins/admins.types'
import type { UserStatus } from '../../auth/auth.types'
import AdminStatCard from '../components/AdminStatCard.vue'

const authStore = useAuthStore()
const adminsStore = useAdminsStore()

const keyword = ref('')
const statusFilter = ref<UserStatus | ''>('')
const page = ref(1)
const pageSize = ref(20)
const errorMessage = ref<string | null>(null)
const isMutating = ref(false)

const activeCount = computed(
  () => adminsStore.items.filter((admin) => admin.status === 'ACTIVE').length,
)
const lockedCount = computed(
  () => adminsStore.items.filter((admin) => admin.status === 'LOCKED').length,
)
const protectedCount = computed(
  () => adminsStore.items.filter((admin) => admin.roles.some((role) => role.roleName === 'Super Admin')).length,
)

const sortValue = ref<
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'fullName:asc'
  | 'fullName:desc'
  | 'email:asc'
  | 'email:desc'
>('createdAt:desc')

const statusOptions = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Đang hoạt động', value: 'ACTIVE' as const },
  { label: 'Đã khoá', value: 'LOCKED' as const },
  { label: 'Đã xoá', value: 'DELETED' as const },
]
const sortOptions = [
  { label: 'Mới nhất', value: 'createdAt:desc' as const },
  { label: 'Cũ nhất', value: 'createdAt:asc' as const },
  { label: 'Tên A-Z', value: 'fullName:asc' as const },
  { label: 'Tên Z-A', value: 'fullName:desc' as const },
  { label: 'Email A-Z', value: 'email:asc' as const },
  { label: 'Email Z-A', value: 'email:desc' as const },
]
const loadAdmins = async () => {
  errorMessage.value = null

  try {
    await adminsStore.fetchAdmins({
      page: page.value,
      pageSize: pageSize.value,
      q: keyword.value.trim().length > 0 ? keyword.value.trim() : undefined,
      status: statusFilter.value.length > 0 ? (statusFilter.value as UserStatus) : undefined,
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không tải được danh sách admin'
  }
}

onMounted(() => {
  void loadAdmins()
})

const totalPages = computed(() => adminsStore.meta?.pagination.totalPages ?? 1)
const pageStart = computed(() =>
  adminsStore.totalItems === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, adminsStore.totalItems))

const goToPage = async (nextPage: number) => {
  const safePage = Math.min(Math.max(nextPage, 1), totalPages.value)
  if (safePage === page.value) return
  page.value = safePage
  await loadAdmins()
}

const setPageSize = async (nextPageSize: number) => {
  pageSize.value = nextPageSize
  page.value = 1
  await loadAdmins()
}

const onPageSizeChange = (value: number) => {
  void setPageSize(value)
}

const sortedAdmins = computed(() => {
  const items = [...adminsStore.items]

  const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

  const compareDate = (a: string, b: string) =>
    new Date(a).getTime() - new Date(b).getTime()

  const [field, dir] = sortValue.value.split(':') as [
    'createdAt' | 'fullName' | 'email',
    'asc' | 'desc',
  ]

  items.sort((left, right) => {
    const result =
      field === 'createdAt'
        ? compareDate(left.createdAt, right.createdAt)
        : compareText(left[field] ?? '', right[field] ?? '')

    return dir === 'asc' ? result : -result
  })

  return items
})

const paginationButtons = computed(() => {
  const maxButtons = 7
  const current = page.value
  const pages = totalPages.value

  if (pages <= maxButtons) {
    return Array.from({ length: pages }, (_, index) => index + 1)
  }

  const start = Math.max(1, Math.min(current - 2, pages - maxButtons + 1))
  return Array.from({ length: maxButtons }, (_, index) => start + index)
})

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const isProtectedRow = (row: AdminUser) =>
  row.roles.some((role) => role.roleName === 'Super Admin')

const createDialogVisible = ref(false)
const createError = ref<string | null>(null)
const createForm = ref({
  fullName: '',
  email: '',
  password: '',
})

const openCreate = () => {
  createError.value = null
  createForm.value = {
    fullName: '',
    email: '',
    password: '',
  }
  createDialogVisible.value = true
}

const submitCreate = async () => {
  createError.value = null

  try {
    isMutating.value = true
    await adminsStore.createOne(createForm.value)
    createDialogVisible.value = false
    await loadAdmins()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      createError.value = 'Email đã tồn tại'
      return
    }

    createError.value = error instanceof Error ? error.message : 'Không tạo được admin'
  } finally {
    isMutating.value = false
  }
}

const editDialogVisible = ref(false)
const editError = ref<string | null>(null)
const editingAdminId = ref<string | null>(null)
const editForm = ref({
  fullName: '',
  email: '',
  password: '',
})

const openEdit = (row: AdminUser) => {
  editError.value = null
  editingAdminId.value = row.id
  editForm.value = {
    fullName: row.fullName,
    email: row.email,
    password: '',
  }
  editDialogVisible.value = true
}

const submitEdit = async () => {
  if (!editingAdminId.value) return

  editError.value = null

  try {
    const payload: UpdateAdminUserPayload = {
      fullName: editForm.value.fullName,
      email: editForm.value.email,
    }

    if (editForm.value.password.length > 0) {
      payload.password = editForm.value.password
    }

    isMutating.value = true
    await adminsStore.updateOne(editingAdminId.value, payload)
    editDialogVisible.value = false
    await loadAdmins()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      editError.value = 'Email đã tồn tại'
      return
    }

    editError.value = error instanceof Error ? error.message : 'Không cập nhật được admin'
  } finally {
    isMutating.value = false
  }
}

const lockConfirmVisible = ref(false)
const lockError = ref<string | null>(null)
const lockTarget = ref<AdminUser | null>(null)
const lockNextStatus = ref<'ACTIVE' | 'LOCKED'>('LOCKED')

const openLockConfirm = (row: AdminUser) => {
  if (isProtectedRow(row)) return

  lockError.value = null
  lockTarget.value = row
  lockNextStatus.value = row.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
  lockConfirmVisible.value = true
}

const confirmLock = async () => {
  if (!lockTarget.value) return

  lockError.value = null

  try {
    isMutating.value = true
    await adminsStore.setStatus(lockTarget.value.id, lockNextStatus.value)
    lockConfirmVisible.value = false
    lockTarget.value = null
    await loadAdmins()
  } catch (error) {
    lockError.value =
      error instanceof Error ? error.message : 'Không cập nhật được trạng thái admin'
  } finally {
    isMutating.value = false
  }
}

const deleteConfirmVisible = ref(false)
const deleteError = ref<string | null>(null)
const deleteTarget = ref<AdminUser | null>(null)

const openDeleteConfirm = (row: AdminUser) => {
  if (isProtectedRow(row)) return

  deleteError.value = null
  deleteTarget.value = row
  deleteConfirmVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  deleteError.value = null

  try {
    isMutating.value = true
    await adminsStore.removeOne(deleteTarget.value.id)

    if (deleteTarget.value.id === authStore.user?.id) {
      authStore.logout()
    }

    deleteConfirmVisible.value = false
    deleteTarget.value = null
    await loadAdmins()
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Không xoá được admin'
  } finally {
    isMutating.value = false
  }
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_34%),radial-gradient(circle_at_70%_120%,rgba(109,74,255,0.14),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.92))] p-5 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_70%_120%,rgba(124,58,237,0.18),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 sm:p-6 xl:flex-row xl:items-center xl:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
          Super Admin Only
        </div>
        <div>
          <h2 class="!m-0 text-2xl font-semibold tracking-tight !text-slate-950 sm:text-3xl dark:!text-white">
            Quản lý admin nội bộ
          </h2>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Khu vực này dùng để kiểm soát tài khoản quản trị, chỉnh sửa thông tin cơ bản,
            khoá/mở khoá và giữ an toàn cho tài khoản SUPER_ADMIN.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400 sm:w-auto"
        :disabled="adminsStore.isLoading || isMutating"
        @click="openCreate"
      >
        <i class="pi pi-plus" />
        Tạo admin mới
      </button>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        title="Tổng admin"
        :value="adminsStore.totalItems"
        description="Số tài khoản quản trị đang có trong hệ thống"
        icon="pi pi-shield"
        tone="amber"
      />
      <AdminStatCard
        title="Hoạt động"
        :value="activeCount"
        description="Số admin ACTIVE trên trang hiện tại"
        icon="pi pi-check-circle"
        tone="emerald"
      />
      <AdminStatCard
        title="Đã khoá"
        :value="lockedCount"
        description="Số admin LOCKED trên trang hiện tại"
        icon="pi pi-lock"
        tone="sky"
      />
      <AdminStatCard
        title="Được bảo vệ"
        :value="protectedCount"
        description="Tài khoản SUPER_ADMIN không cho lock hoặc xoá"
        icon="pi pi-star"
        tone="violet"
      />
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-lg font-semibold text-slate-950 dark:text-white">Directory admin</div>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tìm kiếm theo email, họ tên hoặc lọc theo trạng thái tài khoản.
          </div>
        </div>

        <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,320px)_190px_190px_auto_auto] xl:items-end">
          <InputText v-model="keyword" placeholder="Tìm theo email hoặc họ tên" class="w-full min-w-0" />
          <Dropdown
            v-model="statusFilter"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Trạng thái"
            class="w-full min-w-0"
          />
          <Dropdown
            v-model="sortValue"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Sắp xếp"
            class="w-full min-w-0"
          />
          <Button label="Tìm kiếm" severity="secondary" class="w-full xl:w-auto" :disabled="adminsStore.isLoading || isMutating" @click="loadAdmins" />
          <Button label="Làm mới" severity="contrast" outlined class="w-full xl:w-auto" :disabled="adminsStore.isLoading || isMutating" @click="loadAdmins" />
        </div>
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
        Tài khoản mang role <span class="font-semibold">SUPER_ADMIN</span> được hiển thị để
        quan sát nhưng không cho sửa trạng thái hay xoá trực tiếp trong giao diện này.
      </div>

      <div class="mt-4">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
      </div>

      <div class="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40">
        <div class="overflow-x-auto">
          <table class="min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr>
                <th class="px-5 py-4 font-semibold">Admin</th>
                <th class="px-5 py-4 font-semibold">Email</th>
                <th class="px-5 py-4 font-semibold">Vai trò</th>
                <th class="px-5 py-4 font-semibold">Trạng thái</th>
                <th class="px-5 py-4 font-semibold">Ngày tạo</th>
                <th class="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800">
              <tr
                v-for="admin in sortedAdmins"
                :key="admin.id"
                class="bg-white transition hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-slate-900/30"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-semibold text-white">
                      {{ admin.fullName.slice(0, 1).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-slate-900 dark:text-white">
                        {{ admin.fullName }}
                      </div>
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                        Tạo lúc {{ formatDateTime(admin.createdAt) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">
                  {{ admin.email }}
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="role in admin.roles"
                      :key="`${admin.id}-${role.roleId}`"
                      class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    >
                      {{ role.roleName }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <Tag
                    :value="admin.status"
                    :severity="
                      admin.status === 'ACTIVE'
                        ? 'success'
                        : admin.status === 'LOCKED'
                          ? 'danger'
                          : 'secondary'
                    "
                  />
                </td>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">
                  {{ formatDateTime(admin.createdAt) }}
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      :disabled="isProtectedRow(admin) || adminsStore.isLoading || isMutating"
                      @click="openEdit(admin)"
                    />
                    <Button
                      :icon="admin.status === 'ACTIVE' ? 'pi pi-lock' : 'pi pi-lock-open'"
                      size="small"
                      severity="warning"
                      :disabled="isProtectedRow(admin) || adminsStore.isLoading || isMutating"
                      @click="openLockConfirm(admin)"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      :disabled="isProtectedRow(admin) || adminsStore.isLoading || isMutating"
                      @click="openDeleteConfirm(admin)"
                    />
                  </div>
                </td>
              </tr>

              <tr v-if="!adminsStore.isLoading && sortedAdmins.length === 0">
                <td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Không có admin phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-slate-500 dark:text-slate-400">
          Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ adminsStore.totalItems }} admin
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <Dropdown
            :modelValue="pageSize"
            :options="[
              { label: '10 / trang', value: 10 },
              { label: '20 / trang', value: 20 },
              { label: '50 / trang', value: 50 },
            ]"
            optionLabel="label"
            optionValue="value"
            class="w-[140px]"
            @update:modelValue="onPageSizeChange"
          />

          <Button
            icon="pi pi-angle-left"
            severity="secondary"
            rounded
            :disabled="adminsStore.isLoading || page <= 1"
            @click="() => void goToPage(page - 1)"
          />

          <button
            v-for="value in paginationButtons"
            :key="`admin-page-${value}`"
            type="button"
            class="inline-flex h-10 min-w-[40px] items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition"
            :class="
              value === page
                ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
            "
            :disabled="adminsStore.isLoading"
            @click="() => void goToPage(value)"
          >
            {{ value }}
          </button>

          <Button
            icon="pi pi-angle-right"
            severity="secondary"
            rounded
            :disabled="adminsStore.isLoading || page >= totalPages"
            @click="() => void goToPage(page + 1)"
          />
        </div>
      </div>
    </section>

    <Dialog v-model:visible="lockConfirmVisible" modal header="Cập nhật trạng thái admin" class="w-[min(540px,92vw)]">
      <div class="space-y-4">
        <Message v-if="lockError" severity="error">{{ lockError }}</Message>
        <div class="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{
            lockNextStatus === 'LOCKED'
              ? 'Bạn sắp khoá tài khoản admin bên dưới.'
              : 'Bạn sắp mở khoá lại tài khoản admin bên dưới.'
          }}
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          {{ lockTarget?.email }}
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <Button label="Huỷ" severity="secondary" :disabled="isMutating" @click="lockConfirmVisible = false" />
          <Button label="Xác nhận" :loading="isMutating" @click="confirmLock" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteConfirmVisible" modal header="Xoá admin" class="w-[min(540px,92vw)]">
      <div class="space-y-4">
        <Message v-if="deleteError" severity="error">{{ deleteError }}</Message>
        <div class="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Tài khoản này sẽ bị xoá khỏi danh sách admin nội bộ.
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          {{ deleteTarget?.email }}
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <Button label="Huỷ" severity="secondary" :disabled="isMutating" @click="deleteConfirmVisible = false" />
          <Button label="Xoá admin" severity="danger" :loading="isMutating" @click="confirmDelete" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="createDialogVisible" modal header="Tạo admin mới" class="w-[min(620px,94vw)]">
      <div class="space-y-4">
        <Message v-if="createError" severity="error">{{ createError }}</Message>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Họ và tên</span>
            <InputText v-model="createForm.fullName" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Email</span>
            <InputText v-model="createForm.email" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Mật khẩu</span>
            <Password v-model="createForm.password" toggleMask class="w-full" :feedback="false" />
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <Button label="Huỷ" severity="secondary" @click="createDialogVisible = false" />
          <Button label="Tạo admin" :loading="isMutating" @click="submitCreate" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Chỉnh sửa admin" class="w-[min(620px,94vw)]">
      <div class="space-y-4">
        <Message v-if="editError" severity="error">{{ editError }}</Message>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Họ và tên</span>
            <InputText v-model="editForm.fullName" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Email</span>
            <InputText v-model="editForm.email" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span class="font-medium">Mật khẩu mới (không bắt buộc)</span>
            <Password v-model="editForm.password" toggleMask class="w-full" :feedback="false" />
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <Button label="Huỷ" severity="secondary" @click="editDialogVisible = false" />
          <Button label="Lưu thay đổi" :loading="isMutating" @click="submitEdit" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
