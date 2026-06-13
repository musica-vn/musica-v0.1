<script setup lang="ts">
import AdminThemeToggle from '../../admin-shell/AdminThemeToggle.vue'
import type { ProductPlatformKey } from '../../../../types/products.types'

type ProductDetailSectionKey = 'general' | 'rights-license' | 'platforms'

const props = defineProps<{
  activeSection: ProductDetailSectionKey
  activePlatformKey?: ProductPlatformKey
}>()

const emit = defineEmits<{
  back: []
  navigate: [section: ProductDetailSectionKey]
  navigatePlatform: [platformKey: ProductPlatformKey]
}>()

const items: Array<{
  key: ProductDetailSectionKey
  label: string
  icon: string
}> = [
  {
    key: 'general',
    label: 'Thông tin chung',
    icon: 'pi pi-file-edit',
  },
  {
    key: 'rights-license',
    label: 'Quyền và License',
    icon: 'pi pi-book',
  },
  {
    key: 'platforms',
    label: 'Quản lý nền tảng số',
    icon: 'pi pi-desktop',
  },
]

const platformItems: Array<{
  key: ProductPlatformKey
  label: string
}> = [
  {
    key: 'YOUTUBE',
    label: 'YouTube',
  },
]
</script>

<template>
  <aside class="h-full border-r border-border-subtle bg-surface-container-lowest text-on-surface flex flex-col">
    <div class="border-b border-border-subtle px-4 py-4">
      <button
        type="button"
        class="inline-flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-dim"
        @click="emit('back')"
      >
        <i class="pi pi-arrow-left text-sm" />
        Quay lại danh sách
      </button>
    </div>

    <nav class="px-3 py-4">
      <div class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
        Điều hướng
      </div>
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="group relative mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors last:mb-0"
        :class="activeSection === item.key
          ? 'bg-primary text-white shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-dim transition-colors'"
        @click="emit('navigate', item.key)"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center text-base transition"
          :class="activeSection === item.key ? 'text-white' : 'text-on-surface-variant group-hover:text-on-surface'"
        >
          <i :class="item.icon" />
        </span>
        <span class="min-w-0 truncate text-sm font-semibold">{{ item.label }}</span>
      </button>

      <div
        v-if="props.activeSection === 'platforms'"
        class="ml-5 mt-1 space-y-1 border-l pl-3 border-border-subtle"
      >
        <button
          v-for="platformItem in platformItems"
          :key="platformItem.key"
          type="button"
          class="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-medium transition"
          :class="props.activePlatformKey === platformItem.key
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-text-secondary hover:bg-surface-container-low hover:text-on-surface'"
          @click="emit('navigatePlatform', platformItem.key)"
        >
          <span class="inline-flex h-2 w-2 rounded-full bg-[color:var(--admin-primary-500)]" />
          <span class="truncate">{{ platformItem.label }}</span>
        </button>
      </div>
    </nav>

    <div class="border-t border-border-subtle px-4 py-4 mt-auto">
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
        Giao diện
      </div>
      <AdminThemeToggle />
    </div>
  </aside>
</template>
