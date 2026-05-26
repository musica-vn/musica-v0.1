<script setup lang="ts">
import { computed } from 'vue'
import { useAppTheme } from '../../../shared/theme/app-theme'

defineProps<{
  compact?: boolean
}>()

const { isDarkTheme, toggleTheme } = useAppTheme()

const buttonLabel = computed(() => (isDarkTheme.value ? 'Chế độ sáng' : 'Chế độ tối'))
const buttonIcon = computed(() => (isDarkTheme.value ? 'pi pi-sun' : 'pi pi-moon'))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
    @click="toggleTheme"
  >
    <i :class="buttonIcon" />
    <span v-if="!compact">{{ buttonLabel }}</span>
  </button>
</template>
