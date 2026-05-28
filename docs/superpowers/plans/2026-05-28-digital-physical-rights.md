# Digital + Physical Rights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển UI chọn quyền phụ thuộc của `Digital rights` và `Physical rights` sang kiểu tick chọn nhiều giá trị, đồng thời Việt hóa wording theo đặc tả.

**Architecture:** Giữ nguyên page dùng chung `LicensingConfigManagementPage.vue`, mở rộng `resourceConfigMap` và các helper format để chỉ áp dụng wording/behavior mới cho `digital` và `physical`. Dữ liệu submit vẫn dùng `referencedPermissionIds` như hiện tại để không đổi API hoặc store.

**Tech Stack:** Vue 3, TypeScript, PrimeVue, Pinia

---

### Task 1: Cập nhật cấu hình wording cho digital và physical

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Bổ sung wording riêng trong `resourceConfigMap`**

```ts
digital: {
  title: 'Cấu hình quyền nền tảng số',
  description: 'Quản lý cấu hình bản quyền nền tảng số theo từng nền tảng, thời hạn áp dụng và quyền phụ thuộc.',
  createLabel: 'Thêm cấu hình quyền số',
  detailColumnLabel: 'Nền tảng / Thời hạn',
  detailPlaceholder: 'Nền tảng áp dụng và thời hạn',
  priceLabel: 'Hệ số giá cơ sở',
  emptyState: 'Chưa có cấu hình quyền nền tảng số nào.',
  supportsDigitalFilters: true,
}
```

- [ ] **Step 2: Giữ `expression` và `modification` nguyên trạng**

```ts
expression: {
  title: 'Expression Configs',
  // giữ nguyên wording hiện có
}
```

- [ ] **Step 3: Chạy typecheck để bắt lỗi map config**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: PASS

### Task 2: Thay permission picker từ `select multiple` sang tick chọn

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Thêm helper toggle chọn quyền**

```ts
const toggleReferencedPermission = (permissionId: string) => {
  form.referencedPermissionIds = form.referencedPermissionIds.includes(permissionId)
    ? form.referencedPermissionIds.filter((item) => item !== permissionId)
    : [...form.referencedPermissionIds, permissionId]
}
```

- [ ] **Step 2: Thêm helper kiểm tra resource mục tiêu**

```ts
const isDigitalOrPhysicalResource = computed(
  () => props.resource === 'digital' || props.resource === 'physical',
)
```

- [ ] **Step 3: Render permission picker dạng tick chọn**

```vue
<div class="grid gap-2">
  <button
    v-for="permission in mergedPermissionOptions"
    :key="permission.id"
    type="button"
    class="rounded-2xl border px-4 py-3 text-left"
    @click="toggleReferencedPermission(permission.id)"
  >
    <div>{{ permission.code }} - {{ permission.name }}</div>
    <div>{{ permission.lawReference }}</div>
  </button>
</div>
```

- [ ] **Step 4: Thêm empty state khi không có quyền active**

```vue
<div v-if="mergedPermissionOptions.length === 0" class="text-sm text-slate-500">
  Hiện chưa có quyền cốt lõi đang hoạt động để lựa chọn.
</div>
```

- [ ] **Step 5: Chạy typecheck để xác minh form vẫn hợp lệ**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: PASS

### Task 3: Việt hóa list/form của digital và physical

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Thêm helper format hiển thị enum**

```ts
const formatDigitalPlatformLabel = (value: DigitalPlatform) => value
const formatDurationTypeLabel = (value: DigitalDurationType) =>
  value === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'
const formatStatusLabel = (value: LicensingConfigStatus) =>
  value === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'
```

- [ ] **Step 2: Đổi nhãn filter/table sang tiếng Việt cho digital và physical**

```vue
<span>Từ khoá</span>
<span>Trạng thái</span>
<th>Mã cấu hình</th>
<th>Quyền phụ thuộc</th>
<th>Thao tác</th>
```

- [ ] **Step 3: Đổi nhãn create/edit form cho digital**

```vue
<span>Nền tảng áp dụng</span>
<span>Thời hạn áp dụng</span>
<span>Hệ số giá cơ sở</span>
<span>Quyền phụ thuộc</span>
```

- [ ] **Step 4: Đổi nhãn create/edit form cho physical**

```vue
<span>Loại hình sử dụng thực tế</span>
<span>Hệ số giá cơ sở</span>
<span>Quyền phụ thuộc</span>
```

- [ ] **Step 5: Chạy typecheck sau khi đổi wording**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: PASS

### Task 4: Xác minh thay đổi

**Files:**
- Verify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Verify: `docs/superpowers/specs/2026-05-28-digital-physical-rights-design.md`
- Verify: `docs/superpowers/plans/2026-05-28-digital-physical-rights.md`

- [ ] **Step 1: Chạy typecheck frontend**

Run: `pnpm -C apps/web typecheck`
Expected: PASS

- [ ] **Step 2: Kiểm tra diagnostics file đã sửa**

Run tool: `GetDiagnostics` cho `LicensingConfigManagementPage.vue`
Expected: không có lỗi mới

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue docs/superpowers/specs/2026-05-28-digital-physical-rights-design.md docs/superpowers/plans/2026-05-28-digital-physical-rights.md
git commit -m "feat: improve digital and physical rights forms"
```
