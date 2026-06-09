<script setup lang="ts">
import type {
  ComplianceDetail,
  ComplianceLegalStatus,
  ComplianceReviewStatus,
} from '../../../types/compliance.types'

defineProps<{
  detail: ComplianceDetail
  suggestedActionText: string
  formatLegalStatusLabel: (value: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (value: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
}>()
</script>

<template>
  <section class="rounded-[28px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-5 shadow-[var(--admin-elev-1)] sm:p-6">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Thông tin tham chiếu
        </div>
        <p class="text-sm text-[color:var(--admin-text-muted)]">
          Tổng hợp thông tin kiểm duyệt hiện tại để đối chiếu nhanh trước khi lưu quyết định.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section class="rounded-[24px] bg-[color:var(--admin-surface-1)] p-4 sm:p-5">
          <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Tổng Quan Hiện Tại
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">Trạng thái hồ sơ</div>
              <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">{{ formatLegalStatusLabel(detail.legalStatus) }}</div>
            </div>
            <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">Kết quả kiểm duyệt</div>
              <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">{{ formatReviewStatusLabel(detail.reviewStatus) }}</div>
            </div>
            <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">Người kiểm duyệt</div>
              <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
                {{ detail.reviewedByName || detail.reviewedBy || '—' }}
              </div>
            </div>
            <div class="rounded-2xl bg-[color:var(--admin-surface-0)] px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.12em] text-[color:var(--admin-text-muted)]">Thời gian duyệt</div>
              <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">{{ formatReviewDateTime(detail.reviewedAt) }}</div>
            </div>
          </div>
        </section>

        <div class="grid gap-4">
          <section
            v-if="detail.rejectReason"
            class="rounded-[24px] bg-rose-50/80 p-4 dark:bg-rose-950/10 sm:p-5"
          >
            <div class="flex items-start gap-3">
              <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <i class="pi pi-exclamation-circle text-sm" />
              </span>
              <div>
                <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-300">
                  Ghi Chú Trước Đó
                </div>
                <p class="mt-2 text-sm leading-6 text-rose-900 dark:text-rose-100">
                  {{ detail.rejectReason }}
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-[24px] bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--admin-primary-700)] text-white">
                <i class="pi pi-sparkles text-sm" />
              </span>
              <div>
                <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--admin-primary-700)]">
                  Gợi Ý Thao Tác
                </div>
                <p class="mt-2 text-sm leading-6 text-[color:var(--admin-text)]">
                  {{ suggestedActionText }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
