<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: string
  options: Array<{
    value: string
    label: string
    tone: 'neutral' | 'success' | 'danger'
  }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const getButtonClass = (isActive: boolean, tone: 'neutral' | 'success' | 'danger') => {
  if (!isActive) {
    return 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-950/60 dark:hover:text-slate-200'
  }

  if (tone === 'success') {
    return 'border border-emerald-200 bg-white text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300'
  }

  if (tone === 'danger') {
    return 'border border-rose-200 bg-white text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-300'
  }

  return 'border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200'
}
</script>

<template>
  <div class="space-y-2.5">
    <div class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      {{ label }}
    </div>
    <div
      class="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-900/80"
      role="radiogroup"
      :aria-label="label"
    >
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        class="rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200/80 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-violet-500/20"
        :class="getButtonClass(props.modelValue === option.value, option.tone)"
        role="radio"
        :aria-checked="props.modelValue === option.value"
        :disabled="props.disabled"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
