<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAsyncState } from '@vueuse/core'
import Button from 'primevue/button'
import { listExamples } from '../features/examples/examples.api'

const page = ref(1)
const pageSize = ref(10)

const { state, isLoading, error, execute } = useAsyncState(
  () => listExamples({ page: page.value, pageSize: pageSize.value }),
  null,
  { immediate: false },
)

watch([page, pageSize], () => execute(), { immediate: true })

const pagination = computed(() => state.value?.meta?.pagination)
const items = computed(() => state.value?.items ?? [])
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>Examples</h1>
      <RouterLink to="/">
        <Button label="Về Home" severity="secondary" />
      </RouterLink>
    </header>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error">{{ String(error) }}</div>

    <ul v-else class="list">
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>

    <footer class="pagination" v-if="pagination">
      <Button
        label="Prev"
        severity="secondary"
        :disabled="!pagination.hasPrevPage"
        @click="page = page - 1"
      />
      <div>
        Page {{ pagination.page }} / {{ pagination.totalPages }} (Total:
        {{ pagination.totalItems }})
      </div>
      <Button
        label="Next"
        severity="secondary"
        :disabled="!pagination.hasNextPage"
        @click="page = page + 1"
      />
    </footer>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.error {
  color: #b42318;
}

.list {
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
