<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

type CertificateItem = {
  id: string
  trackName: string
  buyerEmail: string
  status: 'ACTIVE'
  createdAt: string
}

const rows: CertificateItem[] = [
  { id: 'cert-0001', trackName: 'Midnight Pulse (Seed)', buyerEmail: 'buyer01@musica.local', status: 'ACTIVE', createdAt: '2026-05-20' },
  { id: 'cert-0002', trackName: 'Neon Skyline (Seed)', buyerEmail: 'buyer02@musica.local', status: 'ACTIVE', createdAt: '2026-05-19' },
  { id: 'cert-0003', trackName: 'Cinematic Rise (Seed)', buyerEmail: 'buyer03@musica.local', status: 'ACTIVE', createdAt: '2026-05-18' },
]
</script>

<template>
  <div class="page">
    <Card>
      <template #title>Certificate Management</template>
      <template #subtitle>Dummy data</template>
      <template #content>
        <DataTable :value="rows" size="small">
          <Column field="id" header="ID" />
          <Column field="trackName" header="Track" />
          <Column field="buyerEmail" header="Buyer" />
          <Column field="createdAt" header="Created At" />
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" severity="success" />
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

