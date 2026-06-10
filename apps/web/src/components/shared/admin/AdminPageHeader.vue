<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    kicker?: string
    title: string
    description?: string
    iconClass?: string
  }>(),
  {
    kicker: 'Quản trị viên',
    iconClass: 'pi pi-shield',
  },
)

const wrapperClassName = computed(
  () =>
    'flex flex-col gap-4 rounded-[28px] border bg-[linear-gradient(135deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-1)] backdrop-blur [border-color:var(--admin-border)] sm:flex-row sm:items-start sm:justify-between',
)
</script>

<template>
  <section :class="wrapperClassName">
    <div class="min-w-0 space-y-2">
      <div class="inline-flex items-center gap-2">
        <span class="inline-flex items-center rounded-full bg-[color:var(--admin-primary-50)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--admin-primary-700)]">
          {{ props.kicker }}
        </span>
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--admin-primary-100)] text-[color:var(--admin-primary-700)]">
          <i :class="props.iconClass" />
        </span>
      </div>
      <div class="min-w-0">
        <h1 class="m-0 truncate text-xl font-semibold tracking-tight text-[color:var(--admin-text)] sm:text-2xl">
          {{ props.title }}
        </h1>
        <p v-if="props.description" class="mt-1 text-sm text-[color:var(--admin-text-muted)]">
          {{ props.description }}
        </p>
      </div>
    </div>

    <div class="flex shrink-0 items-center justify-end gap-2">
      <slot name="actions" />
    </div>
  </section>
</template>
