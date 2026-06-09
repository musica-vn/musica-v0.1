<script setup lang="ts" generic="T extends string">
import AdminFilterSelect from '../../shared/admin/AdminFilterSelect.vue'

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
  <AdminFilterSelect
    :model-value="modelValue"
    :icon-class="iconClass"
    :options="options"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
