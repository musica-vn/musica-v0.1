<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

type AdminItem = {
  email: string
  fullName: string
  status: 'ACTIVE' | 'LOCKED'
}

const rows: AdminItem[] = [
  { email: 'admin01@musica.local', fullName: 'Admin 01', status: 'ACTIVE' },
  { email: 'admin02@musica.local', fullName: 'Admin 02', status: 'ACTIVE' },
]
</script>

<template>
  <div class="page">
    <Card>
      <template #title>Admin List</template>
      <template #subtitle>Dummy data</template>
      <template #content>
        <DataTable :value="rows" size="small">
          <Column field="email" header="Email" />
          <Column field="fullName" header="Full Name" />
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'ACTIVE' ? 'success' : 'danger'" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
</style>

