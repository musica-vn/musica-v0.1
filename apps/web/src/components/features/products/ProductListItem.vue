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
    class="group grid gap-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-[minmax(0,1fr)_auto]"
    @mouseenter="emit('preload-original', props.track)"
  >
    <div class="flex min-w-0 gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg font-semibold text-white shadow-lg shadow-violet-500/20"
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
          <div class="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
            {{ props.track.title }}
          </div>
          <div class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {{ props.track.authorName || 'Chưa có tác giả' }} · {{ props.track.genre || 'Chưa có thể loại' }}
          </div>
        </div>

        <ProductWavePreview
          :audio-url="props.audioUrl"
          compact
          :disabled="!props.track.originalAudioKey"
          :right-label="props.durationLabel"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 lg:w-[270px] lg:flex-col lg:items-end">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="
          props.track.status === 'PUBLISHED'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
        "
        :disabled="props.isBusy"
        @click="emit('toggle-publish', props.track)"
      >
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="props.track.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-slate-400'"
        />
        {{ props.track.status === 'PUBLISHED' ? 'Đang phát hành' : 'Đang ẩn' }}
      </button>

      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          :disabled="props.isBusy"
          @click="emit('detail', props.track)"
        >
          <i class="pi pi-eye" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          :disabled="props.isBusy"
          @click="emit('upload-original', props.track)"
        >
          <i class="pi pi-upload" />
        </button>
      </div>
    </div>
  </article>
</template>
