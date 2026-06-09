<script setup lang="ts" generic="T extends string">
const props = defineProps<{
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
    class="flex h-10 w-full items-center overflow-hidden rounded-xl border bg-[color:var(--admin-surface-0)] shadow-sm transition [border-color:var(--admin-border)] focus-within:[border-color:var(--admin-primary-500)] focus-within:ring-2 focus-within:ring-[color:var(--admin-ring)]"
  >
    <span class="flex h-full w-10 shrink-0 items-center justify-center border-r text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]">
      <i :class="props.iconClass" />
    </span>
    <select
      :value="props.modelValue"
      :disabled="props.disabled"
      class="h-full w-full appearance-none border-0 bg-transparent px-3 text-sm text-[color:var(--admin-text)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as T)"
    >
      <option
        v-for="option in props.options"
        :key="`${props.iconClass}-${option.value}`"
        :value="option.value"
        class="bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)]"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="mr-3 text-xs text-[color:var(--admin-text-muted)]">
      <i class="pi pi-chevron-down" />
    </span>
  </label>
</template>
