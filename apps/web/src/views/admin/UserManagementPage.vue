<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import type { DataTablePageEvent } from 'primevue/datatable'
import { ApiClientError } from '../../shared/api/http'
import { useManagedUsersStore } from '../../features/managed-users/managed-users.store'
import type { ManagedRoleCode, ManagedUser } from '../../features/managed-users/managed-users.types'
import type { UserStatus } from '../../features/auth/auth.types'

const props = defineProps<{
  initialRole: ManagedRoleCode
}>()

const managedUsersStore = useManagedUsersStore()

const q = ref('')
const status = ref<UserStatus | ''>('')

const page = ref(1)
const pageSize = ref(20)

const first = computed(() => (page.value - 1) * pageSize.value)

const errorMessage = ref<string | null>(null)
const isActionLoading = ref(false)

const confirmDialogVisible = ref(false)
const confirmTitle = ref('Confirm')
const confirmMessage = ref('')
const confirmConfirmLabel = ref('Confirm')
const confirmConfirmSeverity = ref('warning')
const confirmAction = ref<null | (() => Promise<void>)>(null)

const openConfirm = (payload: {
  title: string
  message: string
  confirmLabel: string
  confirmSeverity: string
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

const load = async () => {
  errorMessage.value = null
  try {
    await managedUsersStore.fetchUsers({
      page: page.value,
      pageSize: pageSize.value,
      q: q.value.length > 0 ? q.value : undefined,
      status: status.value.length > 0 ? (status.value as UserStatus) : undefined,
      roleCode: props.initialRole,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Load user list thất bại'
  }
}

onMounted(async () => {
  await load()
})

watch(
  () => props.initialRole,
  async () => {
    page.value = 1
    await load()
  },
)

const onPage = async (event: DataTablePageEvent) => {
  page.value = event.page + 1
  pageSize.value = event.rows
  await load()
}

const createDialogVisible = ref(false)
const createError = ref<string | null>(null)
const createForm = ref({
  fullName: '',
  email: '',
  password: '',
  roleCode: props.initialRole as ManagedRoleCode,
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
    await managedUsersStore.createOne(createForm.value)
    createDialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      createError.value = 'Email đã tồn tại'
      return
    }
    createError.value = error instanceof Error ? error.message : 'Tạo user thất bại'
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
    const payload: any = {
      fullName: editForm.value.fullName,
      email: editForm.value.email,
    }
    if (editForm.value.password.length > 0) payload.password = editForm.value.password
    await managedUsersStore.updateOne(editingUserId.value, payload)
    editDialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      editError.value = 'Email đã tồn tại'
      return
    }
    editError.value = error instanceof Error ? error.message : 'Cập nhật user thất bại'
  }
}

const toggleLock = async (row: ManagedUser) => {
  const nextStatus = row.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
  openConfirm({
    title: 'Xác nhận',
    message: nextStatus === 'LOCKED' ? 'Khoá user này?' : 'Mở khoá user này?',
    confirmLabel: nextStatus === 'LOCKED' ? 'Lock' : 'Unlock',
    confirmSeverity: nextStatus === 'LOCKED' ? 'danger' : 'secondary',
    action: async () => {
      try {
        await managedUsersStore.setStatus(row.id, nextStatus)
        row.status = nextStatus
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Cập nhật status thất bại'
      }
    },
  })
}

const removeUser = async (row: ManagedUser) => {
  openConfirm({
    title: 'Xác nhận',
    message: 'Xoá user này? (soft delete)',
    confirmLabel: 'Delete',
    confirmSeverity: 'danger',
    action: async () => {
      try {
        await managedUsersStore.removeOne(row.id)
        await load()
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Xoá user thất bại'
      }
    },
  })
}
</script>

<template>
  <div class="page">
    <Card>
      <template #title>User Management</template>
      <template #subtitle>BUYER / ARTIST</template>
      <template #content>
        <div v-if="isActionLoading" class="overlay">
          <i class="pi pi-spinner pi-spin spinner" />
        </div>
        <div class="toolbar">
          <div class="filters">
            <InputText v-model="q" placeholder="Search email / full name" class="searchInput" />
            <Dropdown
              v-model="status"
              :options="['', 'ACTIVE', 'LOCKED', 'DELETED']"
              placeholder="Status"
              class="status"
            />
            <Button label="Search" size="small" severity="secondary" :disabled="isActionLoading" @click="load" />
          </div>
          <Button label="Create User" size="small" icon="pi pi-plus" :disabled="isActionLoading" @click="openCreate" />
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <DataTable
          :value="managedUsersStore.items"
          size="small"
          paginator
          lazy
          :rows="pageSize"
          :first="first"
          :totalRecords="managedUsersStore.totalItems"
          :loading="managedUsersStore.isLoading || isActionLoading"
          @page="onPage"
        >
          <Column field="fullName" header="Tên tài khoản" />
          <Column field="email" header="Email" />
          <Column header="Vai trò">
            <template #body="{ data }">
              <span>{{ (data.roleCodes ?? []).join(', ') }}</span>
            </template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <Tag class="statusTag" :value="data.status" :severity="data.status === 'ACTIVE' ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column header="Ngày tạo">
            <template #body="{ data }">
              <span>{{ new Date(data.createdAt).toLocaleString() }}</span>
            </template>
          </Column>
          <Column header="Actions">
            <template #body="{ data }">
              <div class="actions">
                <Button label="Edit" size="small" severity="secondary" :disabled="isActionLoading" @click="openEdit(data)" />
                <Button
                  class="lockButton"
                  :label="data.status === 'ACTIVE' ? 'Lock' : 'Unlock'"
                  size="small"
                  severity="warning"
                  :disabled="isActionLoading"
                  @click="toggleLock(data)"
                />
                <Button label="Delete" size="small" severity="danger" :disabled="isActionLoading" @click="removeUser(data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog v-model:visible="createDialogVisible" modal header="Create User" class="dialog">
      <div class="form">
        <div v-if="createError" class="error">{{ createError }}</div>
        <div class="field">
          <label>Full name</label>
          <InputText v-model="createForm.fullName" class="w-full" />
        </div>
        <div class="field">
          <label>Email</label>
          <InputText v-model="createForm.email" class="w-full" />
        </div>
        <div class="field">
          <label>Password</label>
          <Password v-model="createForm.password" toggleMask class="w-full" :feedback="false" />
        </div>
        <div class="dialogActions">
          <Button label="Cancel" size="small" severity="secondary" @click="createDialogVisible = false" />
          <Button label="Create" size="small" @click="submitCreate" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Edit User" class="dialog">
      <div class="form">
        <div v-if="editError" class="error">{{ editError }}</div>
        <div class="field">
          <label>Full name</label>
          <InputText v-model="editForm.fullName" class="w-full" />
        </div>
        <div class="field">
          <label>Email</label>
          <InputText v-model="editForm.email" class="w-full" />
        </div>
        <div class="field">
          <label>New password (optional)</label>
          <Password v-model="editForm.password" toggleMask class="w-full" :feedback="false" />
        </div>
        <div class="dialogActions">
          <Button label="Cancel" size="small" severity="secondary" @click="editDialogVisible = false" />
          <Button label="Save" size="small" @click="submitEdit" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="confirmDialogVisible" modal :header="confirmTitle" class="dialog">
      <div class="form">
        <div>{{ confirmMessage }}</div>
        <div class="dialogActions">
          <Button label="Cancel" size="small" severity="secondary" @click="cancelConfirm" />
          <Button :label="confirmConfirmLabel" size="small" :severity="confirmConfirmSeverity" @click="submitConfirm" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  position: relative;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.filters {
  display: grid;
  grid-template-columns: 1fr 160px auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.searchInput {
  width: 360px;
  max-width: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  z-index: 10;
}

.spinner {
  font-size: 28px;
  color: #111827;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.statusTag {
  min-width: 84px;
  display: inline-flex;
  justify-content: center;
}

.lockButton {
  min-width: 84px;
}

.error {
  color: #b91c1c;
  margin-bottom: 12px;
}

.form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.dialogActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1024px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
