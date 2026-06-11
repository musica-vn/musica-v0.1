<script setup lang="ts">
import AdminThemeToggle from '../../admin-shell/AdminThemeToggle.vue'

type ProductDetailSectionKey = 'general' | 'rights-license' | 'platforms'

defineProps<{
  activeSection: ProductDetailSectionKey
}>()

const emit = defineEmits<{
  back: []
  navigate: [section: ProductDetailSectionKey]
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
</script>

<template>
  <aside class="rounded-[32px] border bg-[color:var(--admin-sidebar-bg)] text-[color:var(--admin-sidebar-text)] [border-color:var(--admin-sidebar-border)]">
    <div class="border-b px-4 py-4 [border-color:var(--admin-sidebar-border)]">
      <button
        type="button"
        class="inline-flex w-full items-center gap-2 rounded-[20px] border bg-[color:var(--admin-sidebar-surface)] px-3 py-3 text-sm font-semibold text-[color:var(--admin-sidebar-text)] transition hover:bg-[color:var(--admin-sidebar-hover-bg)] [border-color:var(--admin-sidebar-border)]"
        @click="emit('back')"
      >
        <i class="pi pi-arrow-left text-sm" />
        Quay lại danh sách
      </button>
    </div>

    <nav class="px-3 py-4">
      <div class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--admin-sidebar-text-muted)]">
        Điều hướng
      </div>
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="group relative mb-2 flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition duration-150 last:mb-0"
        :class="activeSection === item.key
          ? 'border-transparent bg-[color:var(--admin-primary-600)] text-white'
          : 'border-transparent bg-transparent text-[color:var(--admin-sidebar-text-muted)] hover:bg-[color:var(--admin-sidebar-hover-bg)] hover:text-[color:var(--admin-sidebar-text)]'"
        @click="emit('navigate', item.key)"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center text-base transition"
          :class="activeSection === item.key ? 'text-white' : 'text-[color:var(--admin-sidebar-text-muted)] group-hover:text-[color:var(--admin-sidebar-text)]'"
        >
          <i :class="item.icon" />
        </span>
        <span class="min-w-0 truncate text-sm font-semibold">{{ item.label }}</span>
      </button>
    </nav>

    <div class="border-t px-4 py-4 [border-color:var(--admin-sidebar-border)]">
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--admin-sidebar-text-muted)]">
        Giao diện
      </div>
      <AdminThemeToggle />
    </div>
  </aside>
</template>
