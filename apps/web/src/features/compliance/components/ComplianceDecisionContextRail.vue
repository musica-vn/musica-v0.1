<script setup lang="ts">
import type {
  ComplianceDetail,
  ComplianceLegalStatus,
  ComplianceReviewStatus,
} from '../compliance.types'

defineProps<{
  detail: ComplianceDetail
  suggestedActionText: string
  formatLegalStatusLabel: (value: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (value: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
}>()
</script>

<template>
  <aside class="space-y-4">
    <section class="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-black/10">
      <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Current Snapshot
      </div>
      <div class="mt-4 space-y-3">
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span class="text-xs text-slate-500 dark:text-slate-400">Trạng thái hồ sơ</span>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ formatLegalStatusLabel(detail.legalStatus) }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span class="text-xs text-slate-500 dark:text-slate-400">Kết quả kiểm duyệt</span>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ formatReviewStatusLabel(detail.reviewStatus) }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span class="text-xs text-slate-500 dark:text-slate-400">Người kiểm duyệt</span>
          <span class="text-right text-sm font-semibold text-slate-900 dark:text-white">
            {{ detail.reviewedByName || detail.reviewedBy || '—' }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-slate-500 dark:text-slate-400">Thời gian duyệt</span>
          <span class="text-right text-sm font-semibold text-slate-900 dark:text-white">
            {{ formatReviewDateTime(detail.reviewedAt) }}
          </span>
        </div>
      </div>
    </section>

    <section
      v-if="detail.rejectReason"
      class="rounded-[28px] border border-rose-100 bg-rose-50/70 p-5 shadow-sm dark:border-rose-950/30 dark:bg-rose-950/10"
    >
      <div class="flex items-start gap-3">
        <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          <i class="pi pi-exclamation-circle text-sm" />
        </span>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-300">
            Ghi chú trước đó
          </div>
          <p class="mt-2 text-sm leading-6 text-rose-900 dark:text-rose-100">
            {{ detail.rejectReason }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-black/10">
      <div class="flex items-center justify-between gap-3">
        <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Quyền hiện tại
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {{ detail.approvedPermissions.length }}
        </span>
      </div>

      <div v-if="detail.approvedPermissions.length === 0" class="mt-4 rounded-2xl border border-dashed border-slate-200/80 px-4 py-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Hồ sơ này chưa có quyền nào đang được cấp.
      </div>

      <div v-else class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="permission in detail.approvedPermissions"
          :key="`${permission.name}-${permission.lawReference}`"
          class="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          :title="permission.lawReference"
        >
          <span class="truncate">{{ permission.name }}</span>
        </span>
      </div>
    </section>

    <section class="rounded-[28px] border border-violet-200/70 bg-[linear-gradient(135deg,rgba(245,243,255,0.95),rgba(255,255,255,0.95))] p-5 shadow-lg shadow-violet-100/50 dark:border-violet-500/20 dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.2),rgba(15,23,42,0.8))] dark:shadow-black/10">
      <div class="flex items-start gap-3">
        <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white dark:bg-violet-500">
          <i class="pi pi-sparkles text-sm" />
        </span>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
            Gợi ý thao tác
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {{ suggestedActionText }}
          </p>
        </div>
      </div>
    </section>
  </aside>
</template>
