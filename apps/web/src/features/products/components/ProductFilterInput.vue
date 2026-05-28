<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder: string
  iconClass: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
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
    <input
      :value="props.modelValue"
      type="text"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="h-full w-full border-0 bg-transparent px-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
