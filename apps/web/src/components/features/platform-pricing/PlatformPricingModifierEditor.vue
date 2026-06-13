<script setup lang="ts">
import { computed } from 'vue'
import {
  PLATFORM_PRICING_GROUPS,
  buildCompletePlatformPricingModifiers,
  sortPlatformPricingModifiers,
  type PlatformPricingModifierValue,
} from '../../../constants/platform-pricing'

const props = withDefaults(defineProps<{
  modelValue: PlatformPricingModifierValue[]
  disabled?: boolean
  readonly?: boolean
}>(), {
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: PlatformPricingModifierValue[]]
}>()

const fieldClass =
  'h-11 w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 text-sm text-[color:var(--admin-text)] outline-none transition [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)] disabled:cursor-not-allowed disabled:opacity-60'

const modifiers = computed(() => buildCompletePlatformPricingModifiers(props.modelValue))

const updateMultiplier = (key: PlatformPricingModifierValue['key'], rawValue: string) => {
  const parsedValue = Number(rawValue)
  const nextValue = Number.isFinite(parsedValue) && parsedValue >= 1 ? parsedValue : 1
  const nextModifiers = modifiers.value.map((item) =>
    item.key === key ? { ...item, multiplier: nextValue } : item,
  )

  emit('update:modelValue', sortPlatformPricingModifiers(nextModifiers))
}
</script>

<template>
  <div class="space-y-4">
    <article
      v-for="group in PLATFORM_PRICING_GROUPS"
      :key="group.id"
      class="overflow-hidden rounded-[24px] border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)]"
    >
      <div class="border-b [border-color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4">
        <div class="text-sm font-semibold text-[color:var(--admin-text)]">
          {{ group.label }}
        </div>
        <div class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
          {{ group.description }}
        </div>
      </div>

      <div class="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label
          v-for="item in group.items"
          :key="item.key"
          class="rounded-[20px] border bg-[linear-gradient(180deg,var(--admin-surface-0),var(--admin-surface-1))] p-4 [border-color:var(--admin-border)]"
        >
          <span class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
            {{ item.label }}
          </span>
          <input
            :value="modifiers.find((modifier) => modifier.key === item.key)?.multiplier ?? 1"
            type="number"
            min="1"
            step="0.0001"
            :class="[fieldClass, 'mt-3']"
            :disabled="props.disabled || props.readonly"
            @input="updateMultiplier(item.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </article>
  </div>
</template>
