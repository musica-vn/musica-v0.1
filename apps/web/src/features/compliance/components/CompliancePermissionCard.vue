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
    class="group relative rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200/80 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-violet-500/20"
    :class="props.selected
      ? 'border-violet-500 bg-violet-50/80 text-violet-950 shadow-sm dark:border-violet-500/50 dark:bg-violet-950/25 dark:text-violet-100'
      : 'border-slate-200/80 bg-white text-slate-700 hover:border-violet-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-500/40'"
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
        <div class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {{ props.lawReference }}
        </div>
      </div>

      <span
        v-if="props.selected"
        class="inline-flex shrink-0 items-center rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white"
      >
        Đã chọn
      </span>
      <span
        v-else
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-300 transition group-hover:border-violet-300 group-hover:text-violet-400 dark:border-slate-700 dark:text-slate-600 dark:group-hover:border-violet-500/40 dark:group-hover:text-violet-300"
      >
        <i class="pi pi-plus text-[10px]" />
      </span>
    </div>
  </button>
</template>
