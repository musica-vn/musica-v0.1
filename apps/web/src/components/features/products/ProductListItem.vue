<script setup lang="ts">
import type { Product } from '../../../types/products.types'
import ProductWavePreview from './ProductWavePreview.vue'

const props = defineProps<{
  track: Product
  audioUrl: string | null
  thumbnailUrl?: string | null
  durationLabel: string
  isBusy?: boolean
}>()

const emit = defineEmits<{
  (event: 'detail', track: Product): void
  (event: 'upload-original', track: Product): void
  (event: 'toggle-publish', track: Product): void
  (event: 'preload-original', track: Product): void
}>()

</script>

<template>
  <article
    class="group grid gap-4 rounded-[28px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-4 shadow-[var(--admin-elev-1)] backdrop-blur transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--admin-elev-2)] lg:grid-cols-[minmax(0,1fr)_auto]"
    @mouseenter="emit('preload-original', props.track)"
  >
    <div class="flex min-w-0 gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-lg font-semibold text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]"
      >
        <img
          v-if="props.thumbnailUrl"
          :src="props.thumbnailUrl"
          alt=""
          class="h-full w-full rounded-2xl object-cover"
        />
        <span v-else>{{ props.track.title.slice(0, 1).toUpperCase() }}</span>
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div class="min-w-0">
          <div class="truncate text-base font-semibold text-[color:var(--admin-text)]">
            {{ props.track.title }}
          </div>
          <div class="mt-1 truncate text-sm text-[color:var(--admin-text-muted)]">
            {{ props.track.authorName || 'Chưa có tác giả' }} · {{ props.track.genre || 'Chưa có thể loại' }}
          </div>
        </div>

        <ProductWavePreview
          :audio-url="props.audioUrl"
          compact
          :disabled="!props.track.originalAudioKey"
          :right-label="props.durationLabel"
          :track-status="props.track.status"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 lg:w-[270px] lg:flex-col lg:items-end">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="
          props.track.status === 'PUBLISHED'
            ? 'border-transparent bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
            : 'border-transparent bg-[color:var(--admin-surface-2)] text-[color:var(--admin-text-muted)]'
        "
        :disabled="props.isBusy"
        @click="emit('toggle-publish', props.track)"
      >
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="props.track.status === 'PUBLISHED' ? 'bg-[color:var(--admin-success-500)]' : 'bg-[color:var(--admin-neutral-200)]'"
        />
        {{ props.track.status === 'PUBLISHED' ? 'Đang phát hành' : 'Đang ẩn' }}
      </button>

      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isBusy"
          @click="emit('detail', props.track)"
        >
          <i class="pi pi-eye" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isBusy"
          @click="emit('upload-original', props.track)"
        >
          <i class="pi pi-upload" />
        </button>
      </div>
    </div>
  </article>
</template>
