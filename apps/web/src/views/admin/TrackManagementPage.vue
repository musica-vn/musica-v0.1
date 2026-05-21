<script setup lang="ts">
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

type TrackItem = {
  title: string
  artist: string
  genre: string
  status: 'PUBLISHED' | 'HIDDEN'
}

const rows: TrackItem[] = [
  { title: 'Midnight Pulse (Seed)', artist: 'Artist 01', genre: 'Electronic', status: 'PUBLISHED' },
  { title: 'Hidden Draft 01 (Seed)', artist: 'Artist 01', genre: 'Electronic', status: 'HIDDEN' },
  { title: 'Pop Spark (Seed)', artist: 'Artist 03', genre: 'Pop', status: 'PUBLISHED' },
]
</script>

<template>
  <div class="page">
    <Card>
      <template #title>Track Management</template>
      <template #subtitle>Dummy data</template>
      <template #content>
        <DataTable :value="rows" size="small">
          <Column field="title" header="Title" />
          <Column field="artist" header="Artist" />
          <Column field="genre" header="Genre" />
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'PUBLISHED' ? 'success' : 'warning'" />
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

