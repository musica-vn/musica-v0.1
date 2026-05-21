<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

type ArtistItem = {
  email: string
  fullName: string
  status: 'ACTIVE' | 'LOCKED'
}

const rows: ArtistItem[] = [
  { email: 'artist01@musica.local', fullName: 'Artist 01', status: 'ACTIVE' },
  { email: 'artist02@musica.local', fullName: 'Artist 02', status: 'ACTIVE' },
  { email: 'artist03@musica.local', fullName: 'Artist 03', status: 'ACTIVE' },
]
</script>

<template>
  <div class="page">
    <Card>
      <template #title>User Management - Artists</template>
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

