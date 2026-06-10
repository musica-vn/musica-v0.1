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
    class="flex h-10 w-full items-center overflow-hidden rounded-xl border bg-[color:var(--admin-surface-0)] shadow-sm transition [border-color:var(--admin-border)] focus-within:[border-color:var(--admin-primary-500)] focus-within:ring-2 focus-within:ring-[color:var(--admin-ring)]"
  >
    <span class="flex h-full w-10 shrink-0 items-center justify-center border-r text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">
      <i :class="props.iconClass" />
    </span>
    <input
      :value="props.modelValue"
      type="text"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="h-full w-full border-0 bg-transparent px-3 text-sm text-[color:var(--admin-text)] outline-none placeholder:text-[color:var(--admin-text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
