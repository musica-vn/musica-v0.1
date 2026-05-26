<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import type { DataTablePageEvent } from 'primevue/datatable'
import { ApiClientError } from '../../../shared/api/http'
import { useManagedUsersStore } from '../../managed-users/managed-users.store'
import type {
  CreateManagedUserPayload,
  ManagedRoleCode,
  ManagedUser,
  UpdateManagedUserPayload,
} from '../../managed-users/managed-users.types'
import type { UserStatus } from '../../auth/auth.types'
import AdminStatCard from '../components/AdminStatCard.vue'

const props = defineProps<{
  initialRole: ManagedRoleCode
}>()

const managedUsersStore = useManagedUsersStore()

const keyword = ref('')
const statusFilter = ref<UserStatus | ''>('')
const page = ref(1)
const pageSize = ref(20)
const errorMessage = ref<string | null>(null)
const isActionLoading = ref(false)

const roleMeta = computed(() =>
  props.initialRole === 'BUYER'
    ? {
        title: 'Quản lý buyer',
        subtitle: 'Theo dõi tài khoản người mua và tình trạng vận hành',
        accentLabel: 'Buyer Directory',
        createLabel: 'Tạo buyer mới',
        tone: 'sky' as const,
      }
    : {
        title: 'Quản lý artist',
        subtitle: 'Điều phối tài khoản nghệ sĩ và lifecycle nội bộ',
        accentLabel: 'Artist Directory',
        createLabel: 'Tạo artist mới',
        tone: 'violet' as const,
      },
)

const first = computed(() => (page.value - 1) * pageSize.value)
const activeCount = computed(
  () => managedUsersStore.items.filter((user) => user.status === 'ACTIVE').length,
)
const lockedCount = computed(
  () => managedUsersStore.items.filter((user) => user.status === 'LOCKED').length,
)
const deletedCount = computed(
  () => managedUsersStore.items.filter((user) => user.status === 'DELETED').length,
)
const statusOptions = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Đang hoạt động', value: 'ACTIVE' as const },
  { label: 'Đã khoá', value: 'LOCKED' as const },
  { label: 'Đã xoá', value: 'DELETED' as const },
]

const confirmDialogVisible = ref(false)
const confirmTitle = ref('Xác nhận thao tác')
const confirmMessage = ref('')
const confirmConfirmLabel = ref('Xác nhận')
const confirmConfirmSeverity = ref<'secondary' | 'warning' | 'danger'>('warning')
const confirmAction = ref<null | (() => Promise<void>)>(null)

const openConfirm = (payload: {
  title: string
  message: string
  confirmLabel: string
  confirmSeverity: 'secondary' | 'warning' | 'danger'
  action: () => Promise<void>
}) => {
  confirmTitle.value = payload.title
  confirmMessage.value = payload.message
  confirmConfirmLabel.value = payload.confirmLabel
  confirmConfirmSeverity.value = payload.confirmSeverity
  confirmAction.value = payload.action
  confirmDialogVisible.value = true
}

const cancelConfirm = () => {
  confirmDialogVisible.value = false
  confirmAction.value = null
}

const submitConfirm = async () => {
  if (!confirmAction.value) return

  confirmDialogVisible.value = false
  isActionLoading.value = true

  try {
    await confirmAction.value()
  } finally {
    isActionLoading.value = false
    confirmAction.value = null
  }
}

const loadUsers = async () => {
  errorMessage.value = null

  try {
    await managedUsersStore.fetchUsers({
      page: page.value,
      pageSize: pageSize.value,
      q: keyword.value.trim().length > 0 ? keyword.value.trim() : undefined,
      status: statusFilter.value.length > 0 ? (statusFilter.value as UserStatus) : undefined,
      roleCode: props.initialRole,
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không tải được danh sách user'
  }
}

onMounted(() => {
  void loadUsers()
})

watch(
  () => props.initialRole,
  async () => {
    page.value = 1
    await loadUsers()
  },
)

const onPage = async (event: DataTablePageEvent) => {
  page.value = event.page + 1
  pageSize.value = event.rows
  await loadUsers()
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const createDialogVisible = ref(false)
const createError = ref<string | null>(null)
const createForm = ref<CreateManagedUserPayload>({
  fullName: '',
  email: '',
  password: '',
  roleCode: props.initialRole,
})

const openCreate = () => {
  createError.value = null
  createForm.value = {
    fullName: '',
    email: '',
    password: '',
    roleCode: props.initialRole,
  }
  createDialogVisible.value = true
}

const submitCreate = async () => {
  createError.value = null

  try {
    isActionLoading.value = true
    await managedUsersStore.createOne(createForm.value)
    createDialogVisible.value = false
    await loadUsers()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      createError.value = 'Email đã tồn tại'
      return
    }

    createError.value = error instanceof Error ? error.message : 'Không tạo được user'
  } finally {
    isActionLoading.value = false
  }
}

const editDialogVisible = ref(false)
const editError = ref<string | null>(null)
const editingUserId = ref<string | null>(null)
const editForm = ref({
  fullName: '',
  email: '',
  password: '',
})

const openEdit = (row: ManagedUser) => {
  editError.value = null
  editingUserId.value = row.id
  editForm.value = {
    fullName: row.fullName,
    email: row.email,
    password: '',
  }
  editDialogVisible.value = true
}

const submitEdit = async () => {
  if (!editingUserId.value) return

  editError.value = null

  try {
    const payload: UpdateManagedUserPayload = {
      fullName: editForm.value.fullName,
      email: editForm.value.email,
    }

    if (editForm.value.password.length > 0) {
      payload.password = editForm.value.password
    }

    isActionLoading.value = true
    await managedUsersStore.updateOne(editingUserId.value, payload)
    editDialogVisible.value = false
    await loadUsers()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      editError.value = 'Email đã tồn tại'
      return
    }

    editError.value = error instanceof Error ? error.message : 'Không cập nhật được user'
  } finally {
    isActionLoading.value = false
  }
}

const toggleLock = (row: ManagedUser) => {
  const nextStatus = row.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'

  openConfirm({
    title: nextStatus === 'LOCKED' ? 'Khoá user' : 'Mở khoá user',
    message:
      nextStatus === 'LOCKED'
        ? `Bạn sắp khoá tài khoản ${row.email}.`
        : `Bạn sắp mở khoá lại tài khoản ${row.email}.`,
    confirmLabel: nextStatus === 'LOCKED' ? 'Khoá user' : 'Mở khoá',
    confirmSeverity: nextStatus === 'LOCKED' ? 'danger' : 'secondary',
    action: async () => {
      try {
        await managedUsersStore.setStatus(row.id, nextStatus)
        await loadUsers()
      } catch (error) {
        errorMessage.value =
          error instanceof Error ? error.message : 'Không cập nhật được trạng thái user'
      }
    },
  })
}

const removeUser = (row: ManagedUser) => {
  openConfirm({
    title: 'Xoá user',
    message: `Tài khoản ${row.email} sẽ bị soft delete khỏi hệ thống.`,
    confirmLabel: 'Xoá user',
    confirmSeverity: 'danger',
    action: async () => {
      try {
        await managedUsersStore.removeOne(row.id)
        await loadUsers()
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Không xoá được user'
      }
    },
  })
}
</script>

<template>
  <div class="space-y-6 pb-8">
    <section
      class="flex flex-col gap-4 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_75%_120%,rgba(124,58,237,0.14),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.92))] p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_75%_120%,rgba(124,58,237,0.2),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 xl:flex-row xl:items-center xl:justify-between"
    >
      <div class="space-y-3">
        <div class="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
          {{ roleMeta.accentLabel }}
        </div>
        <div>
          <h2 class="!m-0 text-3xl font-semibold tracking-tight !text-slate-950 dark:!text-white">
            {{ roleMeta.title }}
          </h2>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ roleMeta.subtitle }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="managedUsersStore.isLoading || isActionLoading"
        @click="openCreate"
      >
        <i class="pi pi-plus" />
        {{ roleMeta.createLabel }}
      </button>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        :title="props.initialRole === 'BUYER' ? 'Tổng buyer' : 'Tổng artist'"
        :value="managedUsersStore.totalItems"
        description="Tổng bản ghi phù hợp với bộ lọc hiện tại"
        icon="pi pi-users"
        :tone="roleMeta.tone"
      />
      <AdminStatCard
        title="Hoạt động"
        :value="activeCount"
        description="Số user ACTIVE trên trang hiện tại"
        icon="pi pi-check-circle"
        tone="emerald"
      />
      <AdminStatCard
        title="Đã khoá"
        :value="lockedCount"
        description="Số user LOCKED trên trang hiện tại"
        icon="pi pi-lock"
        tone="amber"
      />
      <AdminStatCard
        title="Đã xoá"
        :value="deletedCount"
        description="Số user DELETED trên trang hiện tại"
        icon="pi pi-trash"
        tone="sky"
      />
    </section>

    <section class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-lg font-semibold text-slate-950 dark:text-white">Directory user</div>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tìm kiếm, lọc trạng thái và thao tác trực tiếp trên buyer hoặc artist.
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[340px_190px_auto_auto]">
          <InputText
            v-model="keyword"
            placeholder="Tìm theo email hoặc họ tên"
            class="w-full"
          />
          <Dropdown
            v-model="statusFilter"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Trạng thái"
            class="w-full"
          />
          <Button
            label="Tìm kiếm"
            severity="secondary"
            :disabled="managedUsersStore.isLoading || isActionLoading"
            @click="loadUsers"
          />
          <Button
            label="Làm mới"
            severity="contrast"
            outlined
            :disabled="managedUsersStore.isLoading || isActionLoading"
            @click="loadUsers"
          />
        </div>
      </div>

      <div class="mt-4">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
      </div>

      <div class="mt-6">
        <DataTable
          :value="managedUsersStore.items"
          paginator
          lazy
          size="small"
          :rows="pageSize"
          :first="first"
          :totalRecords="managedUsersStore.totalItems"
          :loading="managedUsersStore.isLoading || isActionLoading"
          class="overflow-hidden rounded-[24px]"
          @page="onPage"
        >
          <Column field="fullName" header="Tên user" />
          <Column field="email" header="Email" />
          <Column header="Vai trò">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="role in data.roleCodes"
                  :key="`${data.id}-${role}`"
                  class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  {{ role }}
                </span>
              </div>
            </template>
          </Column>
          <Column header="Trạng thái">
            <template #body="{ data }">
              <Tag
                :value="data.status"
                :severity="
                  data.status === 'ACTIVE'
                    ? 'success'
                    : data.status === 'LOCKED'
                      ? 'warning'
                      : 'danger'
                "
              />
            </template>
          </Column>
          <Column header="Ngày tạo">
            <template #body="{ data }">
              <span class="text-sm text-slate-600 dark:text-slate-300">
                {{ formatDateTime(data.createdAt) }}
              </span>
            </template>
          </Column>
          <Column header="Thao tác">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <Button
                  label="Sửa"
                  size="small"
                  severity="secondary"
                  :disabled="isActionLoading"
                  @click="openEdit(data)"
                />
                <Button
                  :label="data.status === 'ACTIVE' ? 'Khoá' : 'Mở khoá'"
                  size="small"
                  severity="warning"
                  :disabled="isActionLoading"
                  @click="toggleLock(data)"
                />
                <Button
                  label="Xoá"
                  size="small"
                  severity="danger"
                  :disabled="isActionLoading"
                  @click="removeUser(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </section>

    <Dialog v-model:visible="createDialogVisible" modal :header="roleMeta.createLabel" class="w-[min(620px,94vw)]">
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
          <Button :label="roleMeta.createLabel" :loading="isActionLoading" @click="submitCreate" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Chỉnh sửa user" class="w-[min(620px,94vw)]">
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
          <Button label="Lưu thay đổi" :loading="isActionLoading" @click="submitEdit" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="confirmDialogVisible" modal :header="confirmTitle" class="w-[min(540px,92vw)]">
      <div class="space-y-4">
        <div class="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ confirmMessage }}
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <Button label="Huỷ" severity="secondary" @click="cancelConfirm" />
          <Button
            :label="confirmConfirmLabel"
            :severity="confirmConfirmSeverity"
            :loading="isActionLoading"
            @click="submitConfirm"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
