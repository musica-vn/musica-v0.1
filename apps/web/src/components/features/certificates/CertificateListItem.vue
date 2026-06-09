<script setup lang="ts">
import type { CertificateListItem } from '../../../types/certificates.types'

const props = defineProps<{
  certificate: CertificateListItem
  isBusy?: boolean
}>()

const emit = defineEmits<{
  (event: 'detail', certificateId: string): void
  (event: 'preview', certificateId: string): void
  (event: 'download', certificateId: string): void
}>()

const formatDateTime = (value: string | null) => {
  if (typeof value !== 'string' || value.length === 0) return 'Chưa có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatCertificateStatus = (value: string) => (value === 'ACTIVE' ? 'Đang hiệu lực' : value)
</script>

<template>
  <article
    class="grid gap-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-[minmax(0,1fr)_auto]"
  >
    <div class="flex min-w-0 gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-primary-600),var(--admin-accent-400))] text-lg font-semibold text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]"
      >
        C
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div class="min-w-0">
          <div class="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
            {{ props.certificate.trackSnapshotName }}
          </div>
          <div class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {{ props.certificate.buyerSnapshotName }} · {{ props.certificate.artistSnapshotName }}
          </div>
        </div>

        <div class="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <span class="font-semibold text-slate-900 dark:text-white">Trạng thái:</span>
            {{ formatCertificateStatus(props.certificate.status) }}
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <span class="font-semibold text-slate-900 dark:text-white">Ngày cấp:</span>
            {{ formatDateTime(props.certificate.validFrom) }}
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <span class="font-semibold text-slate-900 dark:text-white">Email người mua:</span>
            {{ props.certificate.buyerEmail || 'Chưa có email' }}
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <span class="font-semibold text-slate-900 dark:text-white">Tạo lúc:</span>
            {{ formatDateTime(props.certificate.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 lg:w-[220px] lg:flex-col lg:items-end">
      <span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:bg-emerald-500/12 dark:text-emerald-200">
        {{ formatCertificateStatus(props.certificate.status) }}
      </span>

      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isBusy"
          @click="emit('detail', props.certificate.id)"
        >
          <i class="pi pi-eye" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isBusy"
          @click="emit('preview', props.certificate.id)"
        >
          <i class="pi pi-code" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isBusy"
          @click="emit('download', props.certificate.id)"
        >
          <i class="pi pi-download" />
        </button>
      </div>
    </div>
  </article>
</template>
