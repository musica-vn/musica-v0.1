<script setup lang="ts">
import type { LicensingConfigResource } from '../../../types/licensing-configs.types'

defineProps<{
  item: any
  resource: LicensingConfigResource
  detailText: string
  priceValue: string
  permissionCountLabel: string
  statusLabel: string
  statusClass: string
  currentIsLoading: boolean
  canOpenPackages: boolean
}>()

const emit = defineEmits<{
  edit: [item: any]
  toggle: [item: any]
  permissions: [item: any]
  packages: [item: any]
  more: [item: any]
}>()
</script>

<template>
  <article class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {{ resource }}
        </div>
        <h3 class="mt-2 line-clamp-2 text-base font-semibold text-slate-950 dark:text-white">
          {{ detailText }}
        </h3>
      </div>

      <span
        class="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2">
      <div class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Giá trị
        </div>
        <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {{ priceValue }}
        </div>
      </div>
      <button
        type="button"
        class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="currentIsLoading"
        @click="emit('permissions', item)"
      >
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Quyền
        </div>
        <div class="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {{ permissionCountLabel }}
        </div>
      </button>
    </div>

    <div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="currentIsLoading"
        @click="emit('edit', item)"
      >
        Chỉnh sửa
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
        :disabled="currentIsLoading"
        @click="emit('toggle', item)"
      >
        {{ item.status === 'ACTIVE' ? 'Tắt' : 'Bật' }}
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
        :disabled="currentIsLoading"
        aria-label="Mở thêm thao tác cấu hình"
        @click="emit('more', item)"
      >
        <i class="pi pi-ellipsis-h" />
      </button>
    </div>

    <button
      v-if="canOpenPackages"
      type="button"
      class="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
      :disabled="currentIsLoading"
      @click="emit('packages', item)"
    >
      Xem sản phẩm tham gia
    </button>
  </article>
</template>
