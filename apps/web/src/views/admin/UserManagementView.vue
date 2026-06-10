<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import type { DataTablePageEvent } from 'primevue/datatable'
import { ApiClientError } from '../../api/axios'
import { useManagedUsersStore } from '../../stores/managed-users.store'
import type {
  CreateManagedUserPayload,
  ManagedRoleName,
  ManagedUser,
  UpdateManagedUserPayload,
} from '../../types/managed-users.types'
import type { UserStatus } from '../../types/auth.types'
import AdminStatCard from '../../components/features/admin-shell/AdminStatCard.vue'
import AdminFilterInput from '../../components/shared/admin/AdminFilterInput.vue'
import AdminFilterSelect from '../../components/shared/admin/AdminFilterSelect.vue'
import AdminPageHeader from '../../components/shared/admin/AdminPageHeader.vue'

const props = defineProps<{
  initialRole: ManagedRoleName
}>()

const managedUsersStore = useManagedUsersStore()

const keyword = ref('')
const statusFilter = ref<UserStatus | ''>('')
const page = ref(1)
const pageSize = ref(20)
const errorMessage = ref<string | null>(null)
const isActionLoading = ref(false)

const roleMeta = computed(() =>
  props.initialRole === 'Buyer'
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
      roleName: props.initialRole,
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
  roleName: props.initialRole,
})

const openCreate = () => {
  createError.value = null
  createForm.value = {
    fullName: '',
    email: '',
    password: '',
    roleName: props.initialRole,
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
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <AdminPageHeader
      :kicker="roleMeta.accentLabel"
      :title="roleMeta.title"
      :description="roleMeta.subtitle"
      icon-class="pi pi-users"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-3 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          :disabled="managedUsersStore.isLoading || isActionLoading"
          @click="openCreate"
        >
          <i class="pi pi-plus" />
          {{ roleMeta.createLabel }}
        </button>
      </template>
    </AdminPageHeader>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        :title="props.initialRole === 'Buyer' ? 'Tổng buyer' : 'Tổng artist'"
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

    <section class="rounded-[32px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-6 shadow-[var(--admin-elev-1)] backdrop-blur">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">Directory user</div>
          <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
            Tìm kiếm, lọc trạng thái và thao tác trực tiếp trên buyer hoặc artist.
          </div>
        </div>

        <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,340px)_190px_auto_auto] xl:items-end">
          <AdminFilterInput
            v-model="keyword"
            icon-class="pi pi-search"
            placeholder="Tìm theo email hoặc họ tên"
            :disabled="managedUsersStore.isLoading || isActionLoading"
          />
          <AdminFilterSelect
            v-model="statusFilter"
            icon-class="pi pi-tag"
            :options="statusOptions"
            :disabled="managedUsersStore.isLoading || isActionLoading"
          />
          <Button
            label="Tìm kiếm"
            severity="secondary"
            class="w-full xl:w-auto"
            :disabled="managedUsersStore.isLoading || isActionLoading"
            @click="loadUsers"
          />
          <Button
            label="Làm mới"
            severity="contrast"
            outlined
            class="w-full xl:w-auto"
            :disabled="managedUsersStore.isLoading || isActionLoading"
            @click="loadUsers"
          />
        </div>
      </div>

      <div class="mt-4">
        <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
      </div>

      <div class="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface-1)] shadow-[var(--admin-elev-1)]">
        <div class="overflow-x-auto">
          <DataTable
            :value="managedUsersStore.items"
            paginator
            lazy
            size="small"
            :rows="pageSize"
            :first="first"
            :totalRecords="managedUsersStore.totalItems"
            :loading="managedUsersStore.isLoading || isActionLoading"
            class="min-w-[960px]"
            @page="onPage"
          >
            <Column field="fullName" header="Tên user" />
            <Column field="email" header="Email" />
            <Column header="Vai trò">
              <template #body="{ data }">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="role in data.roles"
                    :key="`${data.id}-${role.roleId}`"
                    class="rounded-full border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]"
                  >
                    {{ role.roleName }}
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
                <span class="text-sm text-[color:var(--admin-text-muted)]">
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
      </div>
    </section>

    <Dialog
      v-model:visible="createDialogVisible"
      modal
      :header="roleMeta.createLabel"
      class="w-[calc(100vw-1rem)] sm:w-[min(620px,94vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-12rem)] overflow-y-auto' } }"
    >
      <div class="space-y-4 rounded-[28px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-1">
        <Message v-if="createError" severity="error">{{ createError }}</Message>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Họ và tên</span>
            <InputText v-model="createForm.fullName" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Email</span>
            <InputText v-model="createForm.email" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Mật khẩu</span>
            <Password v-model="createForm.password" toggleMask class="w-full" :feedback="false" />
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <Button label="Huỷ" severity="secondary" @click="createDialogVisible = false" />
          <Button :label="roleMeta.createLabel" :loading="isActionLoading" @click="submitCreate" />
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="editDialogVisible"
      modal
      header="Chỉnh sửa user"
      class="w-[calc(100vw-1rem)] sm:w-[min(620px,94vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-12rem)] overflow-y-auto' } }"
    >
      <div class="space-y-4 rounded-[28px] border [border-color:var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-1">
        <Message v-if="editError" severity="error">{{ editError }}</Message>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Họ và tên</span>
            <InputText v-model="editForm.fullName" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Email</span>
            <InputText v-model="editForm.email" class="w-full" />
          </label>
          <label class="grid gap-2 text-sm text-[color:var(--admin-text-muted)]">
            <span class="font-medium">Mật khẩu mới (không bắt buộc)</span>
            <Password v-model="editForm.password" toggleMask class="w-full" :feedback="false" />
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <Button label="Huỷ" severity="secondary" @click="editDialogVisible = false" />
          <Button label="Lưu thay đổi" :loading="isActionLoading" @click="submitEdit" />
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="confirmDialogVisible"
      modal
      :header="confirmTitle"
      class="w-[calc(100vw-1rem)] sm:w-[min(540px,92vw)]"
      :pt="{ content: { class: 'max-h-[calc(100svh-12rem)] overflow-y-auto' } }"
    >
      <div class="space-y-4">
        <div class="text-sm leading-6 text-[color:var(--admin-text-muted)]">
          {{ confirmMessage }}
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
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
