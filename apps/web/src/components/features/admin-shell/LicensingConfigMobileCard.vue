<script setup lang="ts">
import type { LicensingConfigResource } from '../../../types/licensing-configs.types'
import { computed } from 'vue'

const props = defineProps<{
  item: any
  resource: LicensingConfigResource
  detailText: string
  platformLabel?: string | null
  platformDotClass?: string | null
  durationLabel?: string | null
  referenceCode?: string | null
  priceValue: string
  permissionCountLabel: string
  statusLabel: string
  statusClass: string
  currentIsLoading: boolean
  canOpenPackages: boolean
}>()

const resourceLabel = computed(() => {
  if (props.resource === 'digital') return 'Nền tảng số'
  if (props.resource === 'physical') return 'Sử dụng vật lý'
  if (props.resource === 'expression') return 'Biểu hiện'
  return 'Biến đổi'
})

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
          {{ resourceLabel }}
        </div>
        <h3 class="mt-2 line-clamp-2 text-base font-semibold text-slate-950 dark:text-white">
          {{ detailText }}
        </h3>
        <div v-if="platformLabel || durationLabel" class="mt-3 flex flex-wrap items-center gap-2">
          <span
            v-if="platformLabel"
            class="inline-flex items-center gap-2 rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]"
          >
            <span class="inline-flex h-2.5 w-2.5 rounded-full" :class="platformDotClass || ''" />
            {{ platformLabel }}
          </span>
          <span
            v-if="durationLabel"
            class="inline-flex items-center rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]"
          >
            {{ durationLabel }}
          </span>
        </div>
        <div v-if="referenceCode" class="mt-2 font-mono text-[11px] text-[color:var(--admin-text-muted)]">
          #{{ referenceCode }}
        </div>
      </div>

      <span
        class="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold"
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
        class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
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
        class="inline-flex h-11 items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="currentIsLoading"
        @click="emit('edit', item)"
      >
        Chỉnh sửa
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-3 text-sm font-semibold text-[color:var(--admin-text)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
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
      class="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-3 text-sm font-semibold text-[color:var(--admin-text)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="currentIsLoading"
      @click="emit('packages', item)"
    >
      Xem sản phẩm tham gia
    </button>
  </article>
</template>
