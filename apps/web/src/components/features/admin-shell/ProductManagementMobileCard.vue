<script setup lang="ts">
import type { Product } from '../../../types/products.types'
import AdminButton from '../../shared/admin/AdminButton.vue'

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
  <article class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-4 shadow-sm [border-color:var(--admin-border)]">
    <div class="flex items-start gap-3">
      <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border bg-[color:var(--admin-surface-1)] [border-color:var(--admin-border)]">
        <img
          v-if="thumbnailUrl"
          :src="thumbnailUrl"
          alt=""
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-[color:var(--admin-primary-50)] text-sm font-semibold text-[color:var(--admin-text)]"
        >
          {{ track.title.slice(0, 1).toUpperCase() }}
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="line-clamp-2 text-sm font-semibold text-[color:var(--admin-text)]">
          {{ track.title }}
        </h3>
        <p class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">
          {{ artistLabel }}
        </p>
        <p class="mt-1 line-clamp-2 text-xs text-[color:var(--admin-text-muted)]">
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

    <div class="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--admin-text-muted)]">
      <span class="inline-flex items-center gap-1 rounded-full bg-[color:var(--admin-surface-1)] px-2.5 py-1">
        <i class="pi pi-book text-[10px]" />
        {{ permissionCount }} quyền
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
        :class="track.originalAudioKey
          ? track.status === 'PUBLISHED'
            ? 'bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
            : track.status === 'PENDING'
              ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-800)]'
              : 'bg-[color:var(--admin-surface-2)] text-[color:var(--admin-text-muted)]'
          : 'bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text-muted)]'"
      >
        <i :class="track.originalAudioKey ? 'pi pi-wave-pulse text-[10px]' : 'pi pi-ban text-[10px]'" />
        {{
          track.originalAudioKey
            ? track.status === 'PUBLISHED'
              ? 'Waveform phát hành'
              : track.status === 'PENDING'
                ? 'Waveform chờ duyệt'
                : 'Waveform đang ẩn'
            : 'Chưa có audio'
        }}
      </span>
    </div>

    <div class="mt-3 text-xs text-[color:var(--admin-text-muted)]">
      Cập nhật: {{ updatedAtLabel }}
    </div>

    <div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
      <AdminButton variant="primary" class="h-11 w-full" :loading="isLoading" @click="emit('detail', track)">
        Chi tiết
      </AdminButton>
      <AdminButton class="h-11 px-3" :disabled="isLoading" @click="emit('togglePublish', track)">
        {{ track.status === 'PUBLISHED' ? 'Ẩn' : 'Phát hành' }}
      </AdminButton>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        aria-label="Mở thêm thao tác cho sản phẩm"
        @click="emit('more', track)"
      >
        <i class="pi pi-ellipsis-h" />
      </button>
    </div>
  </article>
</template>
