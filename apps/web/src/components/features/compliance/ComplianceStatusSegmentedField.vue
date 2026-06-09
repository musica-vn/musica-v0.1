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
    return 'border border-transparent text-[color:var(--admin-text-muted)] hover:border-[color:var(--admin-border)] hover:bg-[color:var(--admin-surface-0)] hover:text-[color:var(--admin-text)]'
  }

  if (tone === 'success') {
    return 'border border-emerald-200 bg-[color:var(--admin-surface-0)] text-emerald-800 shadow-sm'
  }

  if (tone === 'danger') {
    return 'border border-rose-200 bg-[color:var(--admin-surface-0)] text-rose-800 shadow-sm'
  }

  return 'border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] shadow-sm'
}
</script>

<template>
  <div class="space-y-2.5">
    <div class="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">
      {{ label }}
    </div>
    <div
      class="grid grid-cols-3 gap-2 rounded-2xl bg-[color:var(--admin-surface-2)] p-1.5"
      role="radiogroup"
      :aria-label="label"
    >
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        class="rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60"
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
