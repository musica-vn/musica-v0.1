<script setup lang="ts">
const props = defineProps<{
  id: string
  name: string
  lawReference: string
  selected: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle', id: string): void
}>()
</script>

<template>
  <button
    type="button"
    class="group relative rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60"
    :class="props.selected
      ? 'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] text-[color:var(--admin-primary-900)] shadow-sm'
      : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:shadow-sm'"
    :disabled="props.disabled"
    @click="emit('toggle', props.id)"
  >
    <input
      class="sr-only"
      type="checkbox"
      :checked="props.selected"
      :disabled="props.disabled"
      tabindex="-1"
      aria-hidden="true"
      readonly
    >

    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold">{{ props.name }}</div>
        <div class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">
          {{ props.lawReference }}
        </div>
      </div>

      <span
        v-if="props.selected"
        class="inline-flex shrink-0 items-center rounded-full bg-[color:var(--admin-primary-button-bg)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--admin-primary-button-text)]"
      >
        Đã chọn
      </span>
      <span
        v-else
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border [border-color:var(--admin-border)] text-[color:var(--admin-text-muted)] transition group-hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] group-hover:text-[color:var(--admin-primary-700)]"
      >
        <i class="pi pi-plus text-[10px]" />
      </span>
    </div>
  </button>
</template>
