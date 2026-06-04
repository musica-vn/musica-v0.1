<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  iconClass: string
  options: Array<{ label: string; value: T }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: T): void
}>()
</script>

<template>
  <label
    class="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 dark:border-slate-800 dark:bg-slate-950/70 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-500/20"
  >
    <span
      class="flex h-full w-12 shrink-0 items-center justify-center border-r border-slate-200/80 text-slate-400 dark:border-slate-800 dark:text-slate-500"
    >
      <i :class="iconClass" />
    </span>
    <select
      :value="modelValue"
      :disabled="disabled"
      class="h-full w-full appearance-none border-0 bg-transparent px-4 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as T)"
    >
      <option
        v-for="option in options"
        :key="`${iconClass}-${option.value}`"
        :value="option.value"
        class="bg-white text-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="mr-4 text-xs text-slate-400 dark:text-slate-500">
      <i class="pi pi-chevron-down" />
    </span>
  </label>
</template>
