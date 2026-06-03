<script setup lang="ts">
import type { LicensingConfigResource } from '../../licensing-configs/licensing-configs.types'
import LicensingConfigMobileCard from './LicensingConfigMobileCard.vue'

defineProps<{
  items: any[]
  resource: LicensingConfigResource
  isLoading: boolean
  emptyMessage: string
  resolveDetailText: (item: any) => string
  resolvePriceValue: (item: any) => string
  resolvePermissionCountLabel: (item: any) => string
  resolveStatusLabel: (item: any) => string
  resolveStatusClass: (item: any) => string
  canOpenPackages: boolean
}>()

const emit = defineEmits<{
  edit: [item: any]
  toggle: [item: any]
  permissions: [item: any]
  packages: [item: any]
  more: [item: any]
}>()
</script>

<template>
  <div class="space-y-3 sm:hidden">
    <LicensingConfigMobileCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :resource="resource"
      :detail-text="resolveDetailText(item)"
      :price-value="resolvePriceValue(item)"
      :permission-count-label="resolvePermissionCountLabel(item)"
      :status-label="resolveStatusLabel(item)"
      :status-class="resolveStatusClass(item)"
      :current-is-loading="isLoading"
      :can-open-packages="canOpenPackages"
      @edit="emit('edit', $event)"
      @toggle="emit('toggle', $event)"
      @permissions="emit('permissions', $event)"
      @packages="emit('packages', $event)"
      @more="emit('more', $event)"
    />

    <div
      v-if="!isLoading && items.length === 0"
      class="rounded-[28px] border border-dashed border-slate-200/80 bg-white/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>
