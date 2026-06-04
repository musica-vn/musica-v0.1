<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComplianceLegalStatus, ComplianceReviewStatus } from '../../../types/compliance.types'
import CompliancePermissionCard from './CompliancePermissionCard.vue'
import ComplianceStatusSegmentedField from './ComplianceStatusSegmentedField.vue'

const props = defineProps<{
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  rejectReason: string
  requiresRejectReason: boolean
  approvedPermissionIds: string[]
  selectedCount: number
  decisionSummaryText: string
  isSubmittingDecision: boolean
  activePermissions: Array<{ id: string; name: string; lawReference: string }>
  selectedPermissions: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  (event: 'update:legalStatus', value: ComplianceLegalStatus): void
  (event: 'update:reviewStatus', value: ComplianceReviewStatus): void
  (event: 'update:rejectReason', value: string): void
  (event: 'toggle-permission', id: string): void
  (event: 'clear-permissions'): void
  (event: 'submit'): void
}>()

const permissionQuery = ref('')

const filteredPermissions = computed(() =>
  props.activePermissions.filter((permission) => {
    const normalizedQuery = permissionQuery.value.trim().toLowerCase()
    if (!normalizedQuery) return true

    return (
      permission.name.toLowerCase().includes(normalizedQuery) ||
      permission.lawReference.toLowerCase().includes(normalizedQuery)
    )
  }),
)

const legalStatusOptions: Array<{ value: ComplianceLegalStatus; label: string; tone: 'neutral' | 'success' | 'danger' }> = [
  { value: 'PENDING', label: 'Chờ pháp lý', tone: 'neutral' },
  { value: 'SUFFICIENT', label: 'Hồ sơ đủ', tone: 'success' },
  { value: 'INSUFFICIENT', label: 'Hồ sơ thiếu', tone: 'danger' },
]

const reviewStatusOptions: Array<{ value: ComplianceReviewStatus; label: string; tone: 'neutral' | 'success' | 'danger' }> = [
  { value: 'PENDING', label: 'Chờ duyệt', tone: 'neutral' },
  { value: 'APPROVED', label: 'Đã duyệt', tone: 'success' },
  { value: 'REJECTED', label: 'Từ chối', tone: 'danger' },
]

const updateLegalStatus = (value: string) => {
  emit('update:legalStatus', value as ComplianceLegalStatus)
}

const updateReviewStatus = (value: string) => {
  emit('update:reviewStatus', value as ComplianceReviewStatus)
}
</script>

<template>
  <section class="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/35 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
    <div class="space-y-6">
      <div class="grid gap-4 xl:grid-cols-2">
        <ComplianceStatusSegmentedField
          label="Trạng thái hồ sơ"
          :model-value="legalStatus"
          :options="legalStatusOptions"
          :disabled="isSubmittingDecision"
          @update:model-value="updateLegalStatus"
        />
        <ComplianceStatusSegmentedField
          label="Kết quả kiểm duyệt"
          :model-value="reviewStatus"
          :options="reviewStatusOptions"
          :disabled="isSubmittingDecision"
          @update:model-value="updateReviewStatus"
        />
      </div>

      <div
        v-if="requiresRejectReason"
        class="rounded-[24px] border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-950/30 dark:bg-rose-950/10"
      >
        <div class="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <i class="pi pi-exclamation-triangle text-sm" />
          <span class="text-xs font-bold uppercase tracking-[0.12em]">Lý do từ chối bắt buộc</span>
        </div>
        <textarea
          :value="rejectReason"
          class="mt-3 min-h-[132px] w-full rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-500 dark:focus:ring-rose-500/20"
          :disabled="isSubmittingDecision"
          placeholder="Nhập lý do từ chối hoặc lý do cần bổ sung hồ sơ..."
          @input="emit('update:rejectReason', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Quyền sẽ được cấp
            </div>
            <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Chọn các quyền admin muốn cấp cho sản phẩm trên nền tảng.
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              Đã chọn: {{ selectedCount }}
            </span>
            <button
              type="button"
              class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-violet-500 dark:hover:text-violet-300"
              :disabled="isSubmittingDecision || approvedPermissionIds.length === 0"
              @click="emit('clear-permissions')"
            >
              Xóa tất cả
            </button>
          </div>
        </div>

        <div class="mt-4">
          <div class="relative">
            <i class="pi pi-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500" />
            <input
              v-model="permissionQuery"
              class="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
              :disabled="isSubmittingDecision"
              placeholder="Tìm quyền theo tên hoặc điều luật"
            >
          </div>
        </div>

        <div v-if="selectedPermissions.length > 0" class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="permission in selectedPermissions"
            :key="permission.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/30"
            :disabled="isSubmittingDecision"
            @click="emit('toggle-permission', permission.id)"
          >
            <span class="truncate max-w-[180px]">{{ permission.name }}</span>
            <i class="pi pi-times text-[10px]" />
          </button>
        </div>
      </div>

      <div
        v-if="filteredPermissions.length === 0"
        class="rounded-[24px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
      >
        Không tìm thấy quyền phù hợp với từ khóa hiện tại.
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <CompliancePermissionCard
          v-for="permission in filteredPermissions"
          :id="permission.id"
          :key="permission.id"
          :name="permission.name"
          :law-reference="permission.lawReference"
          :selected="approvedPermissionIds.includes(permission.id)"
          :disabled="isSubmittingDecision"
          @toggle="emit('toggle-permission', $event)"
        />
      </div>

      <div class="sticky bottom-0 -mx-5 mt-2 border-t border-slate-200 bg-white/95 px-5 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Tóm tắt quyết định
            </div>
            <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ decisionSummaryText }}
            </div>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
            :disabled="isSubmittingDecision"
            @click="emit('submit')"
          >
            <i v-if="isSubmittingDecision" class="pi pi-spin pi-spinner mr-2 text-xs" />
            <i v-else class="pi pi-check mr-2 text-xs" />
            Lưu quyết định
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
