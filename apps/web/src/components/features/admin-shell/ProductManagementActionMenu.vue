<script setup lang="ts">
import Dialog from 'primevue/dialog'
import type { Product } from '../../../types/products.types'

defineProps<{
  visible: boolean
  track: Product | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  close: []
  detail: [track: Product]
  edit: [track: Product]
  permissions: [track: Product]
  compliance: [track: Product]
  upload: [track: Product]
}>()

const handleAction = (
  action: 'detail' | 'edit' | 'permissions' | 'compliance' | 'upload',
  track: Product | null,
) => {
  if (!track) return
  if (action === 'detail') {
    emit('detail', track)
    return
  }
  if (action === 'edit') {
    emit('edit', track)
    return
  }
  if (action === 'permissions') {
    emit('permissions', track)
    return
  }
  if (action === 'compliance') {
    emit('compliance', track)
    return
  }
  emit('upload', track)
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
      root: { class: 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950' },
      mask: { class: 'items-end px-2 pb-2 sm:items-center sm:p-6' },
      header: { class: 'px-5 pb-0 pt-5' },
      content: { class: 'max-h-[calc(100svh-6rem)] overflow-y-auto px-5 pb-5 pt-0' },
    }"
    @update:visible="emit('close')"
  >
    <template #header>
      <div class="w-full" v-if="track">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Thao tác nhanh
        </div>
        <div class="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
          {{ track.title }}
        </div>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chọn luồng xử lý phù hợp cho sản phẩm này.
        </div>
      </div>
    </template>

    <div v-if="track" class="space-y-3">
      <div class="grid grid-cols-2 gap-2 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-900/60">
        <div class="rounded-2xl bg-white px-3 py-2 text-xs shadow-sm dark:bg-slate-950/80">
          <div class="font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Trạng thái
          </div>
          <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {{ track.status === 'PUBLISHED' ? 'Đang phát hành' : track.status === 'PENDING' ? 'Chờ kiểm duyệt' : 'Đang ẩn' }}
          </div>
        </div>
        <div class="rounded-2xl bg-white px-3 py-2 text-xs shadow-sm dark:bg-slate-950/80">
          <div class="font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Audio
          </div>
          <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {{ track.originalAudioKey ? 'Đã có file gốc' : 'Chưa có file gốc' }}
          </div>
        </div>
      </div>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('detail', track)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-eye" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Xem chi tiết</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Mở workspace đầy đủ để xem waveform, metadata, licensing và trạng thái compliance.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('edit', track)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-pencil" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Chỉnh sửa metadata</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Cập nhật tên track, thumbnail, mô tả, use-case và các tệp liên quan.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('permissions', track)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-book" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Approved permissions</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Chọn subset quyền bán cuối cùng từ danh sách đã được pháp lý phê duyệt.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('compliance', track)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-verified" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Mở Compliance</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Đi tới dashboard kiểm duyệt để rà hồ sơ pháp lý và quyết định duyệt.</span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30 dark:hover:bg-slate-900"
        :disabled="isLoading"
        @click="handleAction('upload', track)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i class="pi pi-upload" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">Tải audio gốc</span>
          <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Upload nhanh file gốc mới hoặc gắn `1.mp3` cho luồng kiểm thử vận hành.</span>
        </span>
      </button>
    </div>
  </Dialog>
</template>
