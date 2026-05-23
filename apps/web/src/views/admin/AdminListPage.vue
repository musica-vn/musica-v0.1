<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { useAdminsStore } from '../../features/admins/admins.store'
import { useAuthStore } from '../../features/auth/auth.store'
import type { AdminUser } from '../../features/admins/admins.types'
import type { UserStatus } from '../../features/auth/auth.types'

const authStore = useAuthStore()
const adminsStore = useAdminsStore()

const q = ref('')
const status = ref<UserStatus | ''>('')

const page = ref(1)
const pageSize = ref(20)

const first = computed(() => (page.value - 1) * pageSize.value)

const errorMessage = ref<string | null>(null)
const isMutating = ref(false)

const load = async () => {
  errorMessage.value = null
  try {
    await adminsStore.fetchAdmins({
      page: page.value,
      pageSize: pageSize.value,
      q: q.value.length > 0 ? q.value : undefined,
      status: status.value.length > 0 ? (status.value as UserStatus) : undefined,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Load admin list thất bại'
  }
}

onMounted(async () => {
  await load()
})

const onPage = async (event: DataTablePageEvent) => {
  page.value = event.page + 1
  pageSize.value = event.rows
  await load()
}

const isSuperAdminRow = (row: AdminUser) => row.roleCodes.includes('SUPER_ADMIN')

const createDialogVisible = ref(false)
const createError = ref<string | null>(null)
const createForm = ref({
  fullName: '',
  email: '',
  password: '',
  roleCode: 'ADMIN' as const,
})

const openCreate = () => {
  createError.value = null
  createForm.value = { fullName: '', email: '', password: '', roleCode: 'ADMIN' }
  createDialogVisible.value = true
}

const submitCreate = async () => {
  createError.value = null
  try {
    isMutating.value = true
    await adminsStore.createOne(createForm.value)
    createDialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      createError.value = 'Email đã tồn tại'
      return
    }
    createError.value = error instanceof Error ? error.message : 'Tạo admin thất bại'
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
  roleCode: 'ADMIN' as const,
})

const openEdit = (row: AdminUser) => {
  editError.value = null
  editingAdminId.value = row.id
  editForm.value = {
    fullName: row.fullName,
    email: row.email,
    password: '',
    roleCode: 'ADMIN',
  }
  editDialogVisible.value = true
}

const submitEdit = async () => {
  if (!editingAdminId.value) return
  editError.value = null
  try {
    const payload: any = {
      fullName: editForm.value.fullName,
      email: editForm.value.email,
      roleCode: editForm.value.roleCode,
    }
    if (editForm.value.password.length > 0) payload.password = editForm.value.password
    isMutating.value = true
    await adminsStore.updateOne(editingAdminId.value, payload)
    editDialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      editError.value = 'Email đã tồn tại'
      return
    }
    editError.value = error instanceof Error ? error.message : 'Cập nhật admin thất bại'
  } finally {
    isMutating.value = false
  }
}

const lockConfirmVisible = ref(false)
const lockError = ref<string | null>(null)
const lockTarget = ref<AdminUser | null>(null)
const lockNextStatus = ref<'ACTIVE' | 'LOCKED'>('LOCKED')

const openLockConfirm = (row: AdminUser) => {
  if (isSuperAdminRow(row)) return
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
    await load()
  } catch (error) {
    lockError.value = error instanceof Error ? error.message : 'Cập nhật trạng thái thất bại'
  } finally {
    isMutating.value = false
  }
}

const deleteConfirmVisible = ref(false)
const deleteError = ref<string | null>(null)
const deleteTarget = ref<AdminUser | null>(null)

const openDeleteConfirm = (row: AdminUser) => {
  if (isSuperAdminRow(row)) return
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
    await load()
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Xoá admin thất bại'
  } finally {
    isMutating.value = false
  }
}

const roleOptions = [{ label: 'ADMIN', value: 'ADMIN' as const }]
</script>

<template>
  <div class="page">
    <Card>
      <template #title>Admin List</template>
      <template #subtitle>Chỉ SUPER_ADMIN truy cập</template>
      <template #content>
        <div class="toolbar">
          <div class="filters">
            <InputText v-model="q" placeholder="Search email / full name" class="w-full" />
            <Dropdown
              v-model="status"
              :options="['', 'ACTIVE', 'LOCKED', 'DELETED']"
              placeholder="Status"
              class="status"
            />
            <Button label="Search" severity="secondary" :disabled="adminsStore.isLoading || isMutating" @click="load" />
          </div>
          <Button
            label="Create Admin"
            icon="pi pi-plus"
            :disabled="adminsStore.isLoading || isMutating"
            @click="openCreate"
          />
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <DataTable
          :value="adminsStore.items"
          size="small"
          paginator
          lazy
          :rows="pageSize"
          :first="first"
          :totalRecords="adminsStore.totalItems"
          :loading="adminsStore.isLoading || isMutating"
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
              <Tag
                :value="data.status"
                :severity="data.status === 'ACTIVE' ? 'success' : data.status === 'LOCKED' ? 'danger' : 'secondary'"
              />
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
                <Button
                  label="Edit"
                  size="small"
                  severity="secondary"
                  :disabled="isSuperAdminRow(data) || adminsStore.isLoading || isMutating"
                  @click="openEdit(data)"
                />
                <Button
                  :label="data.status === 'ACTIVE' ? 'Lock' : 'Unlock'"
                  size="small"
                  severity="warning"
                  :disabled="isSuperAdminRow(data) || adminsStore.isLoading || isMutating"
                  @click="openLockConfirm(data)"
                />
                <Button
                  label="Delete"
                  size="small"
                  severity="danger"
                  :disabled="isSuperAdminRow(data) || adminsStore.isLoading || isMutating"
                  @click="openDeleteConfirm(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog v-model:visible="lockConfirmVisible" modal header="Xác nhận" class="dialog">
      <div class="form">
        <div v-if="lockError" class="error">{{ lockError }}</div>
        <div>
          <div>
            {{
              lockNextStatus === 'LOCKED'
                ? 'Bạn có chắc muốn khoá admin này?'
                : 'Bạn có chắc muốn mở khoá admin này?'
            }}
          </div>
          <div class="confirmEmail">{{ lockTarget?.email }}</div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" :disabled="isMutating" @click="lockConfirmVisible = false" />
        <Button label="Confirm" :loading="isMutating" @click="confirmLock" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteConfirmVisible" modal header="Xác nhận" class="dialog">
      <div class="form">
        <div v-if="deleteError" class="error">{{ deleteError }}</div>
        <div>
          <div>Bạn có chắc muốn xoá admin này?</div>
          <div class="confirmEmail">{{ deleteTarget?.email }}</div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" :disabled="isMutating" @click="deleteConfirmVisible = false" />
        <Button label="Delete" severity="danger" :loading="isMutating" @click="confirmDelete" />
      </template>
    </Dialog>

    <Dialog v-model:visible="createDialogVisible" modal header="Create Admin" class="dialog">
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
        <div class="field">
          <label>Role</label>
          <Dropdown v-model="createForm.roleCode" :options="roleOptions" optionLabel="label" optionValue="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="createDialogVisible = false" />
        <Button label="Create" @click="submitCreate" />
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Edit Admin" class="dialog">
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
        <div class="field">
          <label>Role</label>
          <Dropdown v-model="editForm.roleCode" :options="roleOptions" optionLabel="label" optionValue="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="editDialogVisible = false" />
        <Button label="Save" @click="submitEdit" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
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
  grid-template-columns: 280px 160px auto;
  gap: 8px;
  align-items: center;
}

.status {
  width: 160px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dialog {
  width: min(560px, 95vw);
}

.form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.error {
  color: #b91c1c;
  font-size: 14px;
}

.confirmEmail {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.8;
}
</style>
