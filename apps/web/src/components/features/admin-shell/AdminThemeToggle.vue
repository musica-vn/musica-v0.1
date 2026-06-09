<script setup lang="ts">
import { computed } from 'vue'
import { useAppTheme } from '../../../plugins/app-theme'

const props = defineProps<{
  compact?: boolean
}>()

const { isDarkTheme, themeMode, setTheme, toggleTheme } = useAppTheme()

const buttonLabel = computed(() => (isDarkTheme.value ? 'Đổi sang sáng' : 'Đổi sang tối'))
const buttonIcon = computed(() => (isDarkTheme.value ? 'pi pi-sun' : 'pi pi-moon'))
</script>

<template>
  <button
    v-if="props.compact"
    type="button"
    class="inline-flex items-center gap-2 rounded-2xl border bg-[color:var(--admin-surface-0)] px-3 py-2 text-sm font-medium text-[color:var(--admin-text)] shadow-sm transition duration-150 hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[linear-gradient(135deg,var(--admin-surface-1),var(--admin-accent-50))] hover:text-[color:var(--admin-primary-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-offset-color:var(--admin-surface-0)]"
    :aria-label="buttonLabel"
    :title="buttonLabel"
    @click="toggleTheme"
  >
    <i :class="buttonIcon" />
  </button>

  <div
    v-else
    class="inline-flex items-center rounded-[20px] border bg-[color:var(--admin-surface-0)] p-1 shadow-sm [border-color:var(--admin-border)]"
    role="group"
    aria-label="Chuyển chế độ giao diện"
  >
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-0)]"
      :class="themeMode === 'light'
        ? 'bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] text-[color:var(--admin-primary-800)] shadow-sm'
        : 'text-[color:var(--admin-text-muted)] hover:text-[color:var(--admin-text)]'"
      :aria-pressed="themeMode === 'light'"
      @click="setTheme('light')"
    >
      <i class="pi pi-sun" />
      <span>Sáng</span>
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-0)]"
      :class="themeMode === 'dark'
        ? 'bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] text-[color:var(--admin-primary-800)] shadow-sm'
        : 'text-[color:var(--admin-text-muted)] hover:text-[color:var(--admin-text)]'"
      :aria-pressed="themeMode === 'dark'"
      @click="setTheme('dark')"
    >
      <i class="pi pi-moon" />
      <span>Tối</span>
    </button>
  </div>
</template>
