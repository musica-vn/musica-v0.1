<script setup lang="ts">
import type { CorePermission } from '../../core-permissions/core-permissions.types'
import CorePermissionMobileCard from './CorePermissionMobileCard.vue'

defineProps<{
  permissions: CorePermission[]
  isLoading: boolean
  emptyMessage: string
  resolveIndexLabel: (permission: CorePermission, index: number) => string
  resolveStatusLabel: (permission: CorePermission) => string
  resolveStatusClass: (permission: CorePermission) => string
  resolveUpdatedAtLabel: (permission: CorePermission) => string
}>()

const emit = defineEmits<{
  edit: [permission: CorePermission]
  toggle: [permission: CorePermission]
  remove: [permission: CorePermission]
}>()
</script>

<template>
  <div class="space-y-3 sm:hidden">
    <CorePermissionMobileCard
      v-for="(permission, index) in permissions"
      :key="permission.id"
      :permission="permission"
      :index-label="resolveIndexLabel(permission, index)"
      :status-label="resolveStatusLabel(permission)"
      :status-class="resolveStatusClass(permission)"
      :updated-at-label="resolveUpdatedAtLabel(permission)"
      :is-loading="isLoading"
      @edit="emit('edit', $event)"
      @toggle="emit('toggle', $event)"
      @remove="emit('remove', $event)"
    />

    <div
      v-if="!isLoading && permissions.length === 0"
      class="rounded-[28px] border border-dashed border-slate-200/80 bg-white/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>
