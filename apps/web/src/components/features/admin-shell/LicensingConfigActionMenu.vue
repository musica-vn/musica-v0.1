<script setup lang="ts">
import Dialog from 'primevue/dialog'
import type { LicensingConfigResource } from '../../../types/licensing-configs.types'
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  item: any | null
  resource: LicensingConfigResource
  detailText: string
  statusLabel: string
  isLoading: boolean
  canOpenPackages: boolean
}>()

const resourceLabel = computed(() => {
  if (props.resource === 'digital') return 'Nền tảng số'
  if (props.resource === 'physical') return 'Sử dụng vật lý'
  if (props.resource === 'expression') return 'Biểu hiện'
  return 'Biến đổi'
})

const emit = defineEmits<{
  close: []
  edit: [item: any]
  toggle: [item: any]
  permissions: [item: any]
  packages: [item: any]
  remove: [item: any]
}>()

const handleAction = (
  action: 'edit' | 'toggle' | 'permissions' | 'packages' | 'remove',
  item: any | null,
) => {
  if (!item) return
  if (action === 'edit') {
    emit('edit', item)
    return
  }
  if (action === 'toggle') {
    emit('toggle', item)
    return
  }
  if (action === 'permissions') {
    emit('permissions', item)
    return
  }
  if (action === 'packages') {
    emit('packages', item)
    return
  }
  emit('remove', item)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    dismissable-mask
    :draggable="false"
    class="sm:hidden w-[calc(100vw-1rem)] max-w-[28rem]"
    :pt="{
      root: { class: 'overflow-hidden rounded-[28px] border [border-color:var(--admin-border)] bg-[color:var(--admin-surface-0)]' },
      mask: { class: 'items-end px-2 pb-2 sm:items-center sm:p-6' },
      header: { class: 'px-5 pb-0 pt-5' },
      content: { class: 'max-h-[calc(100svh-6rem)] overflow-y-auto px-5 pb-5 pt-0' },
    }"
    @update:visible="emit('close')"
  >
    <template #header>
      <div v-if="item" class="w-full">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {{ resourceLabel }}
        </div>
        <div class="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
          {{ detailText }}
        </div>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ statusLabel }}
        </div>
      </div>
    </template>

    <div v-if="item" class="space-y-3">
      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
        :disabled="isLoading"
        @click="handleAction('edit', item)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-pencil" />
        </span>
        <span>
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Chỉnh sửa</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Mở form đầy đủ để cập nhật cấu hình và permissions.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
        :disabled="isLoading"
        @click="handleAction('toggle', item)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i :class="item.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check'" />
        </span>
        <span>
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ item.status === 'ACTIVE' ? 'Chuyển về nháp' : 'Xuất bản' }}</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Đổi trạng thái cấu hình ngay từ mobile.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
        :disabled="isLoading"
        @click="handleAction('permissions', item)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-book" />
        </span>
        <span>
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Xem quyền tham chiếu</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Mở danh sách quyền được gắn với cấu hình này.</span>
        </span>
      </button>

      <button
        v-if="canOpenPackages"
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-[color:rgb(var(--admin-primary-rgb)/0.28)] hover:bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[color:rgb(var(--admin-primary-rgb)/0.38)] dark:hover:bg-[color:var(--admin-primary-50)]"
        :disabled="isLoading"
        @click="handleAction('packages', item)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-users" />
        </span>
        <span>
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Xem sản phẩm tham gia</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Kiểm tra sản phẩm đang dùng cấu hình này.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-rose-200/80 bg-white px-4 py-4 text-left transition hover:border-rose-300 hover:bg-rose-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/20 dark:bg-slate-950/60 dark:hover:border-rose-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('remove', item)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <i class="pi pi-trash" />
        </span>
        <span>
          <span class="block text-sm font-semibold text-rose-700 dark:text-rose-300">Xóa cấu hình</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Thao tác destructive, sẽ yêu cầu xác nhận lại.</span>
        </span>
      </button>
    </div>
  </Dialog>
</template>
