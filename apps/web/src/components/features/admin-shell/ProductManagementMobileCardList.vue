<script setup lang="ts">
import type { Product } from '../../../types/products.types'
import ProductManagementMobileCard from './ProductManagementMobileCard.vue'

defineProps<{
  rows: Product[]
  isLoading: boolean
  emptyMessage: string
  resolveThumbnailUrl: (track: Product) => string | null
  resolvePermissionCount: (track: Product) => number
  resolveArtistLabel: (track: Product) => string
  resolveGenresLabel: (track: Product) => string
  resolveDurationLabel: (track: Product) => string
  resolveUpdatedAtLabel: (track: Product) => string
  resolvePublishStatusLabel: (track: Product) => string
  resolveLegalStatusLabel: (track: Product) => string
  resolvePublishStatusClass: (track: Product) => string
  resolveLegalStatusClass: (track: Product) => string
}>()

const emit = defineEmits<{
  detail: [track: Product]
  togglePublish: [track: Product]
  more: [track: Product]
}>()
</script>

<template>
  <div class="space-y-3 sm:hidden">
    <ProductManagementMobileCard
      v-for="track in rows"
      :key="track.id"
      :track="track"
      :thumbnail-url="resolveThumbnailUrl(track)"
      :is-loading="isLoading"
      :permission-count="resolvePermissionCount(track)"
      :artist-label="resolveArtistLabel(track)"
      :genres-label="resolveGenresLabel(track)"
      :duration-label="resolveDurationLabel(track)"
      :updated-at-label="resolveUpdatedAtLabel(track)"
      :publish-status-label="resolvePublishStatusLabel(track)"
      :legal-status-label="resolveLegalStatusLabel(track)"
      :publish-status-class="resolvePublishStatusClass(track)"
      :legal-status-class="resolveLegalStatusClass(track)"
      @detail="emit('detail', $event)"
      @toggle-publish="emit('togglePublish', $event)"
      @more="emit('more', $event)"
    />

    <div
      v-if="!isLoading && rows.length === 0"
      class="rounded-[28px] border border-dashed bg-[color:var(--admin-surface-0)] px-4 py-10 text-center text-sm text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)]"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>
