# Product Management Hybrid Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu `ProductManagement` cho mobile bằng `card list` và `sheet-like dialogs`, đồng thời giữ `table-first workflow` cho tablet/desktop mà không đổi business logic hay API.

**Architecture:** Tách presentation mobile ra khỏi `ProductManagementPage.vue` thành các component nhỏ, dùng chung source data và action handlers hiện có. Desktop/tablet tiếp tục dùng table hiện tại; mobile chỉ đổi rendering và action hierarchy, còn `detail`, `edit`, `create`, `upload`, `approved permissions` sẽ được chỉnh thành `sheet-like experience` qua responsive dialog behavior và layout sections.

**Tech Stack:** Vue 3, TypeScript, TailwindCSS, PrimeVue, Vue Router, vue-tsc

---

## File Structure
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Create: `apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue`
- Create: `apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue`
- Optional create if extraction becomes necessary during execution:
  - `apps/web/src/features/admin-shell/components/ProductManagementSheetHeader.vue`
  - `apps/web/src/features/admin-shell/components/ProductManagementDetailSummary.vue`

## Constraints
- Không đổi API, store contract, hoặc payload.
- Không phá bỏ `table` trên tablet/desktop.
- Không thêm thư viện mới.
- Verification chính dùng `pnpm --dir apps/web typecheck`, diagnostics, và manual preview trên nhiều viewport vì hiện chưa có test harness UI sẵn trong `apps/web`.

## Validation Commands
- Typecheck:

```bash
pnpm --dir apps/web typecheck
```

- Dev server:

```bash
pnpm --dir apps/web dev --host 0.0.0.0
```

- Viewports cần kiểm tra:
  - `375x812`
  - `390x844`
  - `768x1024`
  - `1024x768`

## Task 1: Tách presentation mobile card list

**Files:**
- Create: `apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`

- [ ] **Step 1: Tạo component `ProductManagementMobileCard.vue`**

```vue
<script setup lang="ts">
import type { Product } from '../../products/products.types'

defineProps<{
  track: Product
  thumbnailUrl: string | null
  isLoading: boolean
  permissionCount: number
  artistLabel: string
  genresLabel: string
  durationLabel: string
  updatedAtLabel: string
  publishStatusLabel: string
  legalStatusLabel: string
  publishStatusClass: string
  legalStatusClass: string
}>()

const emit = defineEmits<{
  detail: [track: Product]
  togglePublish: [track: Product]
  more: [track: Product]
}>()
</script>

<template>
  <article class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
    <!-- card content -->
  </article>
</template>
```

- [ ] **Step 2: Tạo component `ProductManagementMobileCardList.vue`**

```vue
<script setup lang="ts">
import type { Product } from '../../products/products.types'
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
    <!-- mobile cards -->
  </div>
</template>
```

- [ ] **Step 3: Nối mobile list vào `ProductManagementPage.vue` và chỉ hiển thị ở mobile**

```vue
<ProductManagementMobileCardList
  class="sm:hidden"
  :rows="rows"
  :is-loading="isLoading"
  empty-message="Không có sản phẩm phù hợp."
  :resolve-thumbnail-url="(track) => thumbnailUrls[track.id] ?? null"
  :resolve-permission-count="(track) => track.allowedPermissions?.length ?? track.allowedPermissionIds?.length ?? 0"
  :resolve-artist-label="resolveArtistDisplay"
  :resolve-genres-label="formatTrackGenresDisplay"
  :resolve-duration-label="(track) => formatDuration(track.duration)"
  :resolve-updated-at-label="(track) => formatDateTime(track.updatedAt)"
  :resolve-publish-status-label="resolvePublishStatusLabel"
  :resolve-legal-status-label="resolveComplianceLegalStatusLabel"
  :resolve-publish-status-class="resolvePublishStatusClass"
  :resolve-legal-status-class="resolveComplianceLegalStatusClass"
  @detail="openDetailDialog"
  @toggle-publish="confirmTogglePublish"
  @more="openMobileActionMenu"
/>

<div class="hidden sm:block">
  <!-- existing table block -->
</div>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
git commit -m "feat: add mobile card list for product management"
```

## Task 2: Thêm mobile action menu và hierarchy thao tác

**Files:**
- Create: `apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`

- [ ] **Step 1: Tạo component `ProductManagementActionMenu.vue` cho nhóm action phụ**

```vue
<script setup lang="ts">
import type { Product } from '../../products/products.types'

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
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    class="w-[calc(100vw-1rem)] sm:hidden"
    :pt="{ content: { class: 'max-h-[calc(100svh-10rem)] overflow-y-auto' } }"
    @update:visible="emit('close')"
  >
    <!-- action list -->
  </Dialog>
</template>
```

- [ ] **Step 2: Thêm state `mobileActionTrack` và handlers tương ứng trong page**

```ts
const mobileActionTrack = ref<Product | null>(null)

const openMobileActionMenu = (track: Product) => {
  mobileActionTrack.value = track
}

const closeMobileActionMenu = () => {
  mobileActionTrack.value = null
}
```

- [ ] **Step 3: Nối `ProductManagementActionMenu` vào page**

```vue
<ProductManagementActionMenu
  :visible="Boolean(mobileActionTrack)"
  :track="mobileActionTrack"
  :is-loading="isLoading"
  @close="closeMobileActionMenu"
  @detail="openDetailDialog"
  @edit="openEditDialog"
  @permissions="openApprovedPermissionsDialog"
  @compliance="openComplianceDashboard"
  @upload="openUploadDialog"
/>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
git commit -m "feat: add product management mobile action menu"
```

## Task 3: Chuyển `detail` dialog sang sheet-like mobile experience

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Optional create: `apps/web/src/features/admin-shell/components/ProductManagementSheetHeader.vue`

- [ ] **Step 1: Thêm computed class cho detail dialog theo breakpoint**

```ts
const detailDialogClass =
  'w-[calc(100vw-0.75rem)] sm:w-[min(1040px,96vw)]'
```

- [ ] **Step 2: Điều chỉnh `Dialog` detail cho mobile sheet behavior**

```vue
<Dialog
  v-model:visible="detailDialogVisible"
  modal
  :class="detailDialogClass"
  :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
>
  <!-- content -->
</Dialog>
```

- [ ] **Step 3: Tối ưu header + tabs + content stack cho mobile**

```vue
<div class="space-y-4">
  <div class="sticky top-0 z-10 -mx-6 border-b border-slate-100 bg-white/95 px-6 pb-4 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <!-- header + tabs -->
  </div>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
    <!-- sections -->
  </div>
</div>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
git commit -m "refactor: optimize product detail dialog for mobile"
```

## Task 4: Tối ưu `create` và `edit` dialogs cho mobile

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`

- [ ] **Step 1: Chuyển form grids sang 1 cột ở mobile**

```vue
<div class="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
  <section class="space-y-4">
    <!-- basic information -->
  </section>
  <section class="space-y-4">
    <!-- media and licensing -->
  </section>
</div>
```

- [ ] **Step 2: Thêm section headers rõ hơn cho mobile form**

```vue
<div class="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
  <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Thông tin cơ bản</h3>
  <!-- fields -->
</div>
```

- [ ] **Step 3: Cho footer CTA stack trên mobile**

```vue
<template #footer>
  <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
    <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']">Huỷ</button>
    <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']">Lưu thay đổi</button>
  </div>
</template>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
git commit -m "refactor: optimize product create and edit dialogs for mobile"
```

## Task 5: Tối ưu `upload` và `approved permissions` dialogs cho mobile

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`

- [ ] **Step 1: Chuyển `upload` dialog sang layout compact theo mobile**

```vue
<Dialog
  v-model:visible="uploadDialogVisible"
  modal
  class="w-[calc(100vw-0.75rem)] sm:w-[min(720px,92vw)]"
  :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-10rem)]' } }"
>
  <!-- compact upload body -->
</Dialog>
```

- [ ] **Step 2: Chuyển `approved permissions` dialog sang stacked mobile rows**

```vue
<div class="space-y-3 sm:hidden">
  <label
    v-for="permission in approvedPermissionOptions"
    :key="permission.id"
    class="flex items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/40"
  >
    <!-- checkbox + content -->
  </label>
</div>

<div class="hidden sm:block">
  <!-- existing desktop/tablet layout -->
</div>
```

- [ ] **Step 3: Thêm selected summary bar cho mobile permissions**

```vue
<div class="sticky bottom-0 z-10 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
  <div class="text-sm text-slate-600 dark:text-slate-300">
    Đã chọn {{ selectedAllowedPermissionIds.length }} quyền
  </div>
</div>
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
git commit -m "refactor: optimize product secondary dialogs for mobile"
```

## Task 6: Verify mobile/tablet/desktop behavior và sửa regression cuối

**Files:**
- Modify as needed:
  - `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
  - `apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue`
  - `apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue`
  - `apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue`

- [ ] **Step 1: Chạy typecheck cuối**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 2: Kiểm tra diagnostics cho toàn bộ file vừa sửa**

Run using IDE diagnostics on:

```text
apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue
apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue
apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue
```

Expected: no new diagnostics

- [ ] **Step 3: Chạy manual smoke test với preview**

Run:

```bash
pnpm --dir apps/web dev --host 0.0.0.0
```

Verify:

```text
375x812: mobile card list hiển thị tốt, detail/edit/create/upload/actions đều dùng được
390x844: action menu không che CTA quan trọng, publish/hide xác nhận đúng flow
768x1024: table vẫn hiện đúng, không regress spacing và action speed
1024x768: desktop table và dialogs giữ hành vi hiện tại
Dark mode: card list, pills, dialogs, sticky footer đủ contrast
```

- [ ] **Step 4: Sửa regression nhỏ nếu phát hiện**

```ts
// Chỉ sửa regression presentation, không mở rộng scope ra ngoài ProductManagement
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/components/ProductManagementMobileCard.vue apps/web/src/features/admin-shell/components/ProductManagementMobileCardList.vue apps/web/src/features/admin-shell/components/ProductManagementActionMenu.vue
git commit -m "feat: complete product management hybrid mobile experience"
```

## Spec Coverage Check
- `Hybrid list rendering`: covered by Task 1.
- `Mobile action hierarchy`: covered by Task 2.
- `Detail sheet`: covered by Task 3.
- `Create/Edit dialogs`: covered by Task 4.
- `Upload/Approved permissions dialogs`: covered by Task 5.
- `Viewport validation và regression guard`: covered by Task 6.

## Notes For Execution
- Dùng lại tối đa helper/state hiện có trong `ProductManagementPage.vue`.
- Nếu thấy `ProductManagementPage.vue` quá dài sau Task 3, ưu tiên tách component con hơn là nhồi thêm template.
- Không triển khai `mobile card list` cho tablet trong plan này; tablet vẫn bám `table`.
