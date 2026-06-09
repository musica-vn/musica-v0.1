<script setup lang="ts">
import { computed } from 'vue'
import type {
  ComplianceDetail,
  ComplianceLegalStatus,
  ComplianceReviewStatus,
  ProductStatus,
} from '../../../types/compliance.types'

const props = defineProps<{
  detail: ComplianceDetail
  formatProductStatusLabel: (status: ProductStatus) => string
  formatLegalStatusLabel: (status: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (status: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
  getProductStatusClass: (status: ProductStatus) => string
  getLegalStatusClass: (status: ComplianceLegalStatus) => string
  getReviewStatusClass: (status: ComplianceReviewStatus) => string
}>()

const latestReviewParts = computed(() => {
  const formattedValue = props.formatReviewDateTime(props.detail.reviewedAt)
  if (formattedValue === '—') {
    return {
      time: '—',
      date: 'Chưa có dữ liệu',
    }
  }

  const [time, ...dateParts] = formattedValue.split(' ')
  return {
    time,
    date: dateParts.join(' ') || formattedValue,
  }
})
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-4 lg:gap-5">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-start lg:gap-10">
      <div class="min-w-0 space-y-4">
        <div class="inline-flex items-center gap-2 rounded-full bg-[color:var(--admin-surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-primary-700)]">
          <i class="pi pi-shield text-[10px]" />
          Khu vực đánh giá quyết định
        </div>

        <div>
          <h2 class="m-0 line-clamp-2 text-[2.1rem] font-extrabold tracking-tight text-slate-950 dark:text-white lg:text-[2.55rem]">
            {{ props.detail.product.title }}
          </h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 lg:text-[15px]">
            Nghệ sĩ:
            <span class="font-semibold text-slate-700 dark:text-slate-300">
              {{ props.detail.product.artistName || props.detail.product.artistId }}
            </span>
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              :class="props.getProductStatusClass(props.detail.product.status)"
            >
              {{ props.formatProductStatusLabel(props.detail.product.status) }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              :class="props.getLegalStatusClass(props.detail.legalStatus)"
            >
              {{ props.formatLegalStatusLabel(props.detail.legalStatus) }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              :class="props.getReviewStatusClass(props.detail.reviewStatus)"
            >
              {{ props.formatReviewStatusLabel(props.detail.reviewStatus) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex min-h-[96px] w-full flex-col justify-start lg:items-end lg:pt-2">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:text-right">
          Lần review gần nhất
        </div>
        <div class="mt-2 text-[2.1rem] font-bold tracking-tight text-slate-900 dark:text-white lg:text-right">
          {{ latestReviewParts.time }}
        </div>
        <div class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 lg:text-right">
          {{ latestReviewParts.date }}
        </div>
      </div>
    </div>
  </div>
</template>
