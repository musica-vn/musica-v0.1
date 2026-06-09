<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    description: string
    icon: string
    tone?: 'violet' | 'emerald' | 'sky' | 'amber' | 'slate'
  }>(),
  {
    tone: 'violet',
  },
)

const toneClassMap = {
  violet:
    'border-[color:rgb(var(--admin-primary-rgb)/0.34)] bg-[radial-gradient(circle_at_top_left,var(--admin-primary-200),transparent_48%),radial-gradient(circle_at_bottom_right,var(--admin-accent-100),transparent_34%),linear-gradient(180deg,var(--admin-surface-0),var(--admin-primary-50))] shadow-[0_24px_52px_rgb(var(--admin-primary-rgb)/0.14)]',
  emerald:
    'border-[color:rgb(var(--admin-success-rgb)/0.34)] bg-[radial-gradient(circle_at_top_left,rgb(var(--admin-success-rgb)/0.22),transparent_46%),linear-gradient(180deg,var(--admin-surface-0),var(--admin-success-50))] shadow-[0_24px_52px_rgb(var(--admin-success-rgb)/0.14)]',
  sky:
    'border-[color:rgb(var(--admin-accent-rgb)/0.32)] bg-[radial-gradient(circle_at_top_left,var(--admin-accent-200),transparent_48%),linear-gradient(180deg,var(--admin-surface-0),var(--admin-accent-50))] shadow-[0_24px_52px_rgb(var(--admin-accent-rgb)/0.14)]',
  amber:
    'border-[color:rgb(var(--admin-warning-rgb)/0.34)] bg-[radial-gradient(circle_at_top_left,rgb(var(--admin-warning-rgb)/0.18),transparent_46%),linear-gradient(180deg,var(--admin-surface-0),var(--admin-warning-50))] shadow-[0_24px_52px_rgb(var(--admin-warning-rgb)/0.14)]',
  slate:
    'border-[color:rgb(var(--admin-slate-rgb)/0.3)] bg-[radial-gradient(circle_at_top_left,var(--admin-slate-100),transparent_46%),linear-gradient(180deg,var(--admin-surface-0),var(--admin-slate-50))] shadow-[0_24px_52px_rgb(var(--admin-slate-rgb)/0.12)]',
} as const

const iconToneClassMap = {
  violet: 'text-[color:var(--admin-primary-700)]',
  emerald: 'text-[color:var(--admin-success-700)]',
  sky: 'text-[color:var(--admin-accent-700)]',
  amber: 'text-[color:var(--admin-warning-700)]',
  slate: 'text-[color:var(--admin-slate-700)]',
} as const

const iconSurfaceClassMap = {
  violet: 'bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))]',
  emerald: 'bg-[linear-gradient(135deg,var(--admin-success-50),var(--admin-surface-0))]',
  sky: 'bg-[linear-gradient(135deg,var(--admin-accent-50),var(--admin-surface-0))]',
  amber: 'bg-[linear-gradient(135deg,var(--admin-warning-50),var(--admin-surface-0))]',
  slate: 'bg-[linear-gradient(135deg,var(--admin-slate-50),var(--admin-surface-0))]',
} as const

const titleClassMap = {
  violet: 'text-[color:var(--admin-primary-700)]',
  emerald: 'text-[color:var(--admin-success-700)]',
  sky: 'text-[color:var(--admin-accent-700)]',
  amber: 'text-[color:var(--admin-warning-700)]',
  slate: 'text-[color:var(--admin-slate-700)]',
} as const
</script>

<template>
  <article
    class="rounded-[28px] border p-5 shadow-[var(--admin-elev-1)] backdrop-blur transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--admin-elev-2)]"
    :class="toneClassMap[props.tone]"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <div
          class="text-xs font-bold uppercase tracking-[0.22em]"
          :class="titleClassMap[props.tone]"
        >
          {{ props.title }}
        </div>
        <div class="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--admin-text)]">
          {{ props.value }}
        </div>
      </div>
      <div
        class="flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_12px_24px_rgb(var(--admin-slate-rgb)/0.16)]"
        :class="[iconSurfaceClassMap[props.tone], iconToneClassMap[props.tone]]"
      >
        <i :class="props.icon" />
      </div>
    </div>
    <p class="mt-3 text-sm text-[color:var(--admin-text-muted)]">
      {{ props.description }}
    </p>
  </article>
</template>
