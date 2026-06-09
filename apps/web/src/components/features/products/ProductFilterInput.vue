<script setup lang="ts">
import AdminFilterInput from '../../shared/admin/AdminFilterInput.vue'

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
  <AdminFilterInput
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :icon-class="props.iconClass"
    :disabled="props.disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
