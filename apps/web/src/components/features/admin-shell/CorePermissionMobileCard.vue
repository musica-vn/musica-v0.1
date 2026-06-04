<script setup lang="ts">
import type { CorePermission } from '../../../types/core-permissions.types'

defineProps<{
  permission: CorePermission
  indexLabel: string
  statusLabel: string
  statusClass: string
  updatedAtLabel: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  edit: [permission: CorePermission]
  toggle: [permission: CorePermission]
  remove: [permission: CorePermission]
}>()
</script>

<template>
  <article class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Permission {{ indexLabel }}
        </div>
        <h3 class="mt-2 line-clamp-2 text-base font-semibold text-slate-950 dark:text-white">
          {{ permission.name }}
        </h3>
      </div>

      <span
        class="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="mt-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Law Reference
      </div>
      <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        {{ permission.lawReference }}
      </div>
    </div>

    <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
      {{ permission.description || 'Chưa có mô tả cho core permission này.' }}
    </p>

    <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
      Cập nhật: {{ updatedAtLabel }}
    </div>

    <div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="isLoading"
        @click="emit('edit', permission)"
      >
        Chỉnh sửa
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
        :disabled="isLoading"
        @click="emit('toggle', permission)"
      >
        {{ permission.status === 'ACTIVE' ? 'Tắt' : 'Bật' }}
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/20 dark:bg-slate-900 dark:text-rose-300 dark:hover:border-rose-500/40 dark:hover:text-rose-200"
        :disabled="isLoading"
        aria-label="Xóa core permission"
        @click="emit('remove', permission)"
      >
        <i class="pi pi-trash" />
      </button>
    </div>
  </article>
</template>
