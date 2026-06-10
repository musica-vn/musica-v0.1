<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="rounded-2xl border bg-[color:var(--admin-surface-0)] p-4 shadow-sm backdrop-blur [border-color:var(--admin-border)]">
    <header v-if="props.title || $slots.actions" class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div v-if="props.title" class="min-w-0">
        <div class="text-lg font-semibold text-[color:var(--admin-text)]">{{ props.title }}</div>
        <div v-if="props.description" class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
          {{ props.description }}
        </div>
      </div>

      <div v-if="$slots.actions" class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <slot name="actions" />
      </div>
    </header>

    <div :class="props.title || $slots.actions ? 'mt-4' : ''">
      <slot />
    </div>
  </section>
</template>
