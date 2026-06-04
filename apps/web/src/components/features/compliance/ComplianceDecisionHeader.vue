<script setup lang="ts">
import type {
  ComplianceDetail,
  ComplianceLegalStatus,
  ComplianceReviewStatus,
  ProductStatus,
} from '../../../types/compliance.types'

defineProps<{
  detail: ComplianceDetail
  formatProductStatusLabel: (status: ProductStatus) => string
  formatLegalStatusLabel: (status: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (status: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
  getProductStatusClass: (status: ProductStatus) => string
  getLegalStatusClass: (status: ComplianceLegalStatus) => string
  getReviewStatusClass: (status: ComplianceReviewStatus) => string
}>()
</script>

<template>
  <div class="flex w-full flex-col gap-4 pr-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <i class="pi pi-shield text-[10px]" />
          Khu Vực Đánh Giá Quyết Định
        </div>
        <div>
          <h2 class="m-0 text-xl font-bold tracking-tight text-slate-950 dark:text-white lg:text-2xl">
            {{ detail.product.title }}
          </h2>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Nghệ sĩ:
            <span class="font-semibold text-slate-700 dark:text-slate-300">
              {{ detail.product.artistName || detail.product.artistId }}
            </span>
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900/60">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Lần review gần nhất
        </div>
        <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
          {{ formatReviewDateTime(detail.reviewedAt) }}
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2.5">
      <span
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
        :class="getProductStatusClass(detail.product.status)"
      >
        {{ formatProductStatusLabel(detail.product.status) }}
      </span>
      <span
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
        :class="getLegalStatusClass(detail.legalStatus)"
      >
        {{ formatLegalStatusLabel(detail.legalStatus) }}
      </span>
      <span
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
        :class="getReviewStatusClass(detail.reviewStatus)"
      >
        {{ formatReviewStatusLabel(detail.reviewStatus) }}
      </span>
    </div>
  </div>
</template>
