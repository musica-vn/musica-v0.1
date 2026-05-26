<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    description: string
    icon: string
    tone?: 'violet' | 'emerald' | 'sky' | 'amber'
  }>(),
  {
    tone: 'violet',
  },
)

const toneClassMap = {
  violet:
    'border-violet-200/70 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 dark:border-violet-500/20',
  emerald:
    'border-emerald-200/70 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 dark:border-emerald-500/20',
  sky:
    'border-sky-200/70 bg-gradient-to-br from-sky-500/15 to-cyan-500/10 dark:border-sky-500/20',
  amber:
    'border-amber-200/70 bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:border-amber-500/20',
} as const

const iconToneClassMap = {
  violet: 'text-violet-600 dark:text-violet-300',
  emerald: 'text-emerald-600 dark:text-emerald-300',
  sky: 'text-sky-600 dark:text-sky-300',
  amber: 'text-amber-600 dark:text-amber-300',
} as const
</script>

<template>
  <article
    class="rounded-[28px] border p-5 shadow-sm backdrop-blur"
    :class="toneClassMap[props.tone]"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {{ props.title }}
        </div>
        <div class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {{ props.value }}
        </div>
      </div>
      <div
        class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 shadow-sm dark:bg-slate-950/70"
        :class="iconToneClassMap[props.tone]"
      >
        <i :class="props.icon" />
      </div>
    </div>
    <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
      {{ props.description }}
    </p>
  </article>
</template>
