# Compliance Decision Premium Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến phần `Đánh giá & Duyệt` của màn `Pháp lý & Kiểm duyệt` thành một `Premium Split Workspace` đẹp hơn, rõ ràng hơn và thuận tiện hơn cho việc cấp quyền sử dụng sản phẩm.

**Architecture:** Giữ nguyên API và state nghiệp vụ hiện có trong `ComplianceManagementPage.vue`, nhưng tách phần decision UI thành các component nhỏ, có ranh giới rõ ràng giữa `Context Rail` và `Decision Workspace`. Dùng `computed props + emits` để nối các component mới với state hiện tại, tránh thêm dependency hoặc thay đổi contract backend.

**Tech Stack:** Vue 3, TypeScript, TailwindCSS, PrimeVue, vue-tsc

---

## File Structure
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionHeader.vue`
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionContextRail.vue`
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionWorkspace.vue`
- Create: `apps/web/src/features/compliance/components/ComplianceStatusSegmentedField.vue`
- Create: `apps/web/src/features/compliance/components/CompliancePermissionCard.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Optional create if needed during execution: `apps/web/src/features/compliance/components/ComplianceSelectedPermissionsTray.vue`

## Constraints
- Không đổi `submitAdminComplianceDecision` payload.
- Không đổi `ComplianceDetail` types.
- Không đổi tab `Hồ sơ & Tài liệu`, trừ header/footer thị giác tối thiểu.
- Không thêm thư viện test/UI mới.
- Verification dùng `pnpm --dir apps/web typecheck` và manual smoke check trên local UI.

### Task 1: Chuẩn bị state và view model cho workspace mới

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`

- [ ] **Step 1: Thêm computed cho helper text, selected permissions và summary footer**

```ts
const selectedPermissionItems = computed(() =>
  corePermissionsStore.activeItems.filter((permission) =>
    decisionForm.approvedPermissionIds.includes(permission.id),
  ),
)

const decisionSummaryText = computed(() => {
  if (decisionForm.reviewStatus === 'REJECTED') return 'Quyết định từ chối sẽ được lưu'
  if (selectedPermissionItems.value.length === 0) return 'Chưa chọn quyền nào'
  return `${selectedPermissionItems.value.length} quyền sẽ được cấp`
})

const suggestedActionText = computed(() => {
  if (selectedDetail.value?.reviewStatus === 'REJECTED') {
    return 'Hồ sơ từng bị từ chối. Kiểm tra lại lý do trước khi cấp quyền.'
  }
  return 'Hồ sơ đang chờ duyệt. Chọn trạng thái và quyền để hoàn tất.'
})
```

- [ ] **Step 2: Chạy typecheck để xác nhận state mới chưa làm vỡ file**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue
git commit -m "refactor: prepare compliance decision view model"
```

### Task 2: Tạo primitive cho status selector và permission card

**Files:**
- Create: `apps/web/src/features/compliance/components/ComplianceStatusSegmentedField.vue`
- Create: `apps/web/src/features/compliance/components/CompliancePermissionCard.vue`

- [ ] **Step 1: Tạo `ComplianceStatusSegmentedField.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: string
  options: Array<{ value: string; label: string; tone: 'neutral' | 'success' | 'danger' }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="space-y-2">
    <div class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      {{ label }}
    </div>
    <div class="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="rounded-xl px-3 py-2 text-sm font-semibold transition"
        :data-active="modelValue === option.value"
        :disabled="disabled"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Tạo `CompliancePermissionCard.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  id: string
  name: string
  lawReference: string
  selected: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle', id: string): void
}>()
</script>

<template>
  <button
    type="button"
    class="group rounded-2xl border px-4 py-4 text-left transition"
    :class="selected
      ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm dark:bg-violet-950/25 dark:text-violet-100'
      : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/40'"
    :disabled="disabled"
    @click="emit('toggle', id)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold">{{ name }}</div>
        <div class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ lawReference }}</div>
      </div>
      <span v-if="selected" class="rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white">
        Đã chọn
      </span>
    </div>
  </button>
</template>
```

- [ ] **Step 3: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/compliance/components/ComplianceStatusSegmentedField.vue apps/web/src/features/compliance/components/CompliancePermissionCard.vue
git commit -m "feat: add compliance decision ui primitives"
```

### Task 3: Tạo `Context Rail` và `Decision Workspace`

**Files:**
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionHeader.vue`
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionContextRail.vue`
- Create: `apps/web/src/features/compliance/components/ComplianceDecisionWorkspace.vue`

- [ ] **Step 1: Tạo header component cho dialog**

```vue
<script setup lang="ts">
import type { ComplianceDetail, ProductStatus, ComplianceLegalStatus, ComplianceReviewStatus } from '../compliance.types'

defineProps<{
  detail: ComplianceDetail
  formatProductStatusLabel: (status: ProductStatus) => string
  formatLegalStatusLabel: (status: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (status: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
  getProductStatusClass: (status: ProductStatus) => string
  getLegalStatusClass: (status: ComplianceLegalStatus) => string
  getReviewStatusClass: (status: ComplianceReviewStatus) => string
}>()
</script>
```

- [ ] **Step 2: Tạo `ComplianceDecisionContextRail.vue`**

```vue
<script setup lang="ts">
defineProps<{
  detail: ComplianceDetail
  suggestedActionText: string
  formatLegalStatusLabel: (value: ComplianceLegalStatus) => string
  formatReviewStatusLabel: (value: ComplianceReviewStatus) => string
  formatReviewDateTime: (value: string | null) => string
}>()
</script>

<template>
  <aside class="space-y-4">
    <!-- Snapshot card -->
    <!-- Previous note card -->
    <!-- Current granted permissions card -->
    <!-- Suggested next action card -->
  </aside>
</template>
```

- [ ] **Step 3: Tạo `ComplianceDecisionWorkspace.vue`**

```vue
<script setup lang="ts">
import CompliancePermissionCard from './CompliancePermissionCard.vue'
import ComplianceStatusSegmentedField from './ComplianceStatusSegmentedField.vue'

defineProps<{
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  rejectReason: string
  requiresRejectReason: boolean
  approvedPermissionIds: string[]
  selectedCount: number
  decisionSummaryText: string
  isSubmittingDecision: boolean
  activePermissions: Array<{ id: string; name: string; lawReference: string }>
}>()

defineEmits<{
  (event: 'update:legalStatus', value: ComplianceLegalStatus): void
  (event: 'update:reviewStatus', value: ComplianceReviewStatus): void
  (event: 'update:rejectReason', value: string): void
  (event: 'toggle-permission', id: string): void
  (event: 'clear-permissions'): void
  (event: 'submit'): void
}>()
</script>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/compliance/components/ComplianceDecisionHeader.vue apps/web/src/features/compliance/components/ComplianceDecisionContextRail.vue apps/web/src/features/compliance/components/ComplianceDecisionWorkspace.vue
git commit -m "feat: add compliance decision workspace components"
```

### Task 4: Tích hợp layout `Premium Split` vào `ComplianceManagementPage`

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`

- [ ] **Step 1: Import và dùng các component mới trong dialog**

```ts
import ComplianceDecisionContextRail from '../../compliance/components/ComplianceDecisionContextRail.vue'
import ComplianceDecisionHeader from '../../compliance/components/ComplianceDecisionHeader.vue'
import ComplianceDecisionWorkspace from '../../compliance/components/ComplianceDecisionWorkspace.vue'
```

```vue
<template #header>
  <ComplianceDecisionHeader
    v-if="selectedDetail"
    :detail="selectedDetail"
    :format-product-status-label="formatProductStatusLabel"
    :format-legal-status-label="formatLegalStatusLabel"
    :format-review-status-label="formatReviewStatusLabel"
    :format-review-date-time="formatReviewDateTime"
    :get-product-status-class="getProductStatusClass"
    :get-legal-status-class="getLegalStatusClass"
    :get-review-status-class="getReviewStatusClass"
  />
</template>
```

- [ ] **Step 2: Thay markup tab `decision` bằng layout 2 cột theo spec**

```vue
<div v-else-if="activeTab === 'decision'" class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
  <ComplianceDecisionContextRail
    :detail="selectedDetail"
    :suggested-action-text="suggestedActionText"
    :format-legal-status-label="formatLegalStatusLabel"
    :format-review-status-label="formatReviewStatusLabel"
    :format-review-date-time="formatReviewDateTime"
  />

  <ComplianceDecisionWorkspace
    :legal-status="decisionForm.legalStatus"
    :review-status="decisionForm.reviewStatus"
    :reject-reason="decisionForm.rejectReason"
    :requires-reject-reason="requiresRejectReason"
    :approved-permission-ids="decisionForm.approvedPermissionIds"
    :selected-count="selectedPermissionItems.length"
    :decision-summary-text="decisionSummaryText"
    :active-permissions="corePermissionsStore.activeItems"
    :is-submitting-decision="isSubmittingDecision"
    @update:legal-status="decisionForm.legalStatus = $event"
    @update:review-status="decisionForm.reviewStatus = $event"
    @update:reject-reason="decisionForm.rejectReason = $event"
    @toggle-permission="togglePermissionSelection"
    @clear-permissions="decisionForm.approvedPermissionIds = []"
    @submit="submitDecision"
  />
</div>
```

- [ ] **Step 3: Thêm helper toggle selection ở page**

```ts
const togglePermissionSelection = (permissionId: string) => {
  decisionForm.approvedPermissionIds = decisionForm.approvedPermissionIds.includes(permissionId)
    ? decisionForm.approvedPermissionIds.filter((id) => id !== permissionId)
    : [...decisionForm.approvedPermissionIds, permissionId]
}
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Chạy local preview nhanh nếu cần kiểm tra UI**

Run:

```bash
pnpm --dir apps/web dev
```

Expected: Vite dev server chạy được, dialog mở bình thường, tab `Đánh giá & Duyệt` hiển thị layout 2 cột ở desktop

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue
git commit -m "feat: integrate premium split compliance decision workspace"
```

### Task 5: Polish responsive, wording và manual verification

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/compliance/components/ComplianceDecisionContextRail.vue`
- Modify: `apps/web/src/features/compliance/components/ComplianceDecisionWorkspace.vue`
- Modify: `apps/web/src/features/compliance/components/ComplianceStatusSegmentedField.vue`
- Modify: `apps/web/src/features/compliance/components/CompliancePermissionCard.vue`

- [ ] **Step 1: Việt hóa label thô còn sót và chốt microcopy**

```vue
<ComplianceStatusSegmentedField label="Trạng thái hồ sơ" />
<ComplianceStatusSegmentedField label="Kết quả kiểm duyệt" />
```

```vue
<div class="text-sm text-slate-600 dark:text-slate-300">
  {{ decisionSummaryText }}
</div>
```

- [ ] **Step 2: Hoàn thiện responsive behavior**

```vue
<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
  <CompliancePermissionCard />
</div>
```

```vue
<div class="sticky bottom-0 mt-6 border-t border-slate-200 bg-white/95 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
  <!-- footer -->
</div>
```

- [ ] **Step 3: Chạy typecheck cuối**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 4: Manual smoke checklist**

Check:
- Mở dialog chi tiết một hồ sơ compliance.
- Chuyển sang tab `Đánh giá & Duyệt`.
- Xác nhận desktop hiển thị 2 cột, mobile/tablet co lại hợp lý.
- Chọn `INSUFFICIENT` hoặc `REJECTED` thì `Lý do từ chối` xuất hiện.
- Chọn/bỏ chọn permission bằng click toàn card đều hoạt động.
- Footer luôn hiển thị summary đúng với state hiện tại.
- Nút `Lưu quyết định` vẫn gọi `submitDecision`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/compliance/components/ComplianceDecisionContextRail.vue apps/web/src/features/compliance/components/ComplianceDecisionWorkspace.vue apps/web/src/features/compliance/components/ComplianceStatusSegmentedField.vue apps/web/src/features/compliance/components/CompliancePermissionCard.vue
git commit -m "refactor: polish compliance decision premium split ui"
```

## Self-Review

- Spec coverage:
  - `Premium Split layout`: Task 3, Task 4
  - `Segmented status controls`: Task 2, Task 5
  - `Permission card selection`: Task 2, Task 3, Task 5
  - `Selected tray + sticky footer`: Task 1, Task 3, Task 5
  - `Responsive + accessibility-sensitive interactions`: Task 5
- Placeholder scan:
  - Không dùng `TBD`, `TODO`, hoặc “similar to”.
  - Mỗi task đều có file path, code snippet, command và expected result.
- Type consistency:
  - Chỉ dùng các field state đang tồn tại: `legalStatus`, `reviewStatus`, `approvedPermissionIds`, `rejectReason`.
  - Không thêm type backend mới.
