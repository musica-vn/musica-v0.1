<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const attrs = useAttrs()

const className = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-0)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none'

  const sizeClassMap: Record<Size, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
  }

  const variantClassMap: Record<Variant, string> = {
    primary:
      'border border-transparent bg-[color:var(--admin-primary-button-bg)] text-[color:var(--admin-primary-button-text)] shadow-[0_14px_30px_rgb(var(--admin-primary-rgb)/0.24)] hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)]',
    secondary:
      'border bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text)] shadow-sm [border-color:var(--admin-border-strong)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-surface-2),var(--admin-primary-50))] active:bg-[color:var(--admin-surface-2)]',
    ghost:
      'text-[color:var(--admin-text)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)] active:bg-[color:var(--admin-primary-100)]',
    danger:
      'border border-transparent bg-[color:var(--admin-danger-500)] text-[color:var(--admin-primary-contrast)] shadow-[0_14px_30px_rgb(var(--admin-danger-rgb)/0.22)] hover:bg-[color:var(--admin-danger-700)] active:bg-[color:var(--admin-danger-700)]',
  }

  return [base, sizeClassMap[props.size], variantClassMap[props.variant], attrs.class]
})

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button :type="props.type" :disabled="isDisabled" :class="className" @click="emit('click', $event)">
    <i v-if="props.loading" class="pi pi-spin pi-spinner text-sm" />
    <slot />
  </button>
</template>
