<script setup lang="ts">
import { computed } from 'vue'
import AdminButton from './AdminButton.vue'

const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    totalItems: number
    pageSizeOptions?: number[]
    disabled?: boolean
  }>(),
  {
    pageSizeOptions: () => [10, 20, 50],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:page-size': [pageSize: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))
const pageStart = computed(() => (props.totalItems === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const pageEnd = computed(() => Math.min(props.page * props.pageSize, props.totalItems))

const canPrev = computed(() => props.page > 1 && !props.disabled)
const canNext = computed(() => props.page < totalPages.value && !props.disabled)

const handlePrev = () => {
  if (!canPrev.value) return
  emit('update:page', props.page - 1)
}

const handleNext = () => {
  if (!canNext.value) return
  emit('update:page', props.page + 1)
}

const handlePageSizeChange = (event: Event) => {
  const rawValue = (event.target as HTMLSelectElement).value
  const nextPageSize = Number(rawValue)
  if (Number.isNaN(nextPageSize)) return
  emit('update:page-size', nextPageSize)
}
</script>

<template>
  <div class="flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between [border-color:var(--admin-border)]">
    <div class="text-sm text-[color:var(--admin-text-muted)]">Hiển thị {{ pageStart }}-{{ pageEnd }} / {{ props.totalItems }}</div>

    <div class="flex flex-wrap items-center justify-end gap-2">
      <label class="flex h-10 items-center overflow-hidden rounded-xl border bg-[color:var(--admin-surface-0)] px-3 shadow-sm transition [border-color:var(--admin-border)] focus-within:[border-color:var(--admin-primary-500)] focus-within:ring-2 focus-within:ring-[color:var(--admin-ring)]">
        <span class="mr-2 text-[color:var(--admin-text-muted)]">
          <i class="pi pi-list" />
        </span>
        <select
          :value="String(props.pageSize)"
          :disabled="props.disabled"
          class="h-full bg-transparent text-sm font-semibold text-[color:var(--admin-text)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
          @change="handlePageSizeChange"
        >
          <option v-for="size in props.pageSizeOptions" :key="`page-size-${size}`" :value="String(size)">{{ size }} / trang</option>
        </select>
        <span class="ml-2 text-xs text-[color:var(--admin-text-muted)]">
          <i class="pi pi-chevron-down" />
        </span>
      </label>

      <AdminButton size="sm" :disabled="!canPrev" @click="handlePrev">
        <i class="pi pi-angle-left" />
        Trước
      </AdminButton>

      <div class="rounded-xl border bg-[color:var(--admin-surface-1)] px-3 py-2 text-sm font-medium text-[color:var(--admin-text)] [border-color:var(--admin-border)]">
        {{ props.page }} / {{ totalPages }}
      </div>

      <AdminButton size="sm" :disabled="!canNext" @click="handleNext">
        Sau
        <i class="pi pi-angle-right" />
      </AdminButton>
    </div>
  </div>
</template>
