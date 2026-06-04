<script setup lang="ts">
import type { Product } from '../../../types/products.types'

defineProps<{
  track: Product
  thumbnailUrl: string | null
  isLoading: boolean
  permissionCount: number
  artistLabel: string
  genresLabel: string
  durationLabel: string
  updatedAtLabel: string
  publishStatusLabel: string
  legalStatusLabel: string
  publishStatusClass: string
  legalStatusClass: string
}>()

const emit = defineEmits<{
  detail: [track: Product]
  togglePublish: [track: Product]
  more: [track: Product]
}>()
</script>

<template>
  <article class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
    <div class="flex items-start gap-3">
      <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
        <img
          v-if="thumbnailUrl"
          :src="thumbnailUrl"
          alt=""
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/25 to-fuchsia-500/15 text-sm font-semibold text-violet-700 dark:text-violet-200"
        >
          {{ track.title.slice(0, 1).toUpperCase() }}
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
          {{ track.title }}
        </h3>
        <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {{ artistLabel }}
        </p>
        <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {{ genresLabel }} · {{ durationLabel }}
        </p>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <span
        class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold"
        :class="publishStatusClass"
      >
        {{ publishStatusLabel }}
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold"
        :class="legalStatusClass"
      >
        {{ legalStatusLabel }}
      </span>
    </div>

    <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
        <i class="pi pi-book text-[10px]" />
        {{ permissionCount }} quyền
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
        <i :class="track.originalAudioKey ? 'pi pi-wave-pulse text-[10px]' : 'pi pi-ban text-[10px]'" />
        {{ track.originalAudioKey ? 'Có waveform' : 'Chưa có audio' }}
      </span>
    </div>

    <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
      Cập nhật: {{ updatedAtLabel }}
    </div>

    <div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="isLoading"
        @click="emit('detail', track)"
      >
        Chi tiết
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
        :disabled="isLoading"
        @click="emit('togglePublish', track)"
      >
        {{ track.status === 'PUBLISHED' ? 'Ẩn' : 'Phát hành' }}
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
        :disabled="isLoading"
        aria-label="Mở thêm thao tác cho sản phẩm"
        @click="emit('more', track)"
      >
        <i class="pi pi-ellipsis-h" />
      </button>
    </div>
  </article>
</template>
