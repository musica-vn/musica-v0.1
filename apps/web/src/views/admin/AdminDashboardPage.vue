<script setup lang="ts">
import Card from 'primevue/card'

const cards = [
  { label: 'Total Tracks', value: 15 },
  { label: 'Total Users', value: 14 },
  { label: 'Total Certificates', value: 10 },
]
</script>

<template>
  <div class="page">
    <div class="grid">
      <Card v-for="item in cards" :key="item.label">
        <template #title>{{ item.label }}</template>
        <template #content>
          <div class="value">{{ item.value }}</div>
          <div class="hint">Dummy data (test UI)</div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.value {
  font-size: 34px;
  font-weight: 700;
  color: var(--text-h);
}

.hint {
  font-size: 13px;
  opacity: 0.8;
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

