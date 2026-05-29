# Core Permission Confirm + Admin Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm confirm cho xóa và đổi trạng thái trong `core permission`, đồng thời Việt hóa điều hướng admin liên quan.

**Architecture:** Giữ nguyên API và cấu trúc route hiện có. Thay đổi tập trung ở Vue page `CorePermissionSettingsPage.vue` để dùng `PrimeVue ConfirmDialog`, sau đó cập nhật label trong `AdminLayout.vue` và `router/index.ts` để header/sidebar đồng bộ tiếng Việt.

**Tech Stack:** Vue 3, TypeScript, PrimeVue, Vue Router, Pinia

---

### Task 1: Cập nhật màn Core Permission

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`

- [ ] **Step 1: Thêm confirm pattern và state hiển thị trạng thái trong form sửa**

```ts
import { useConfirm } from 'primevue/useconfirm'

const confirm = useConfirm()

const statusLabelMap: Record<CorePermissionStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
}
```

- [ ] **Step 2: Bỏ toggle status khỏi bảng và thay bằng helper confirm**

```ts
const confirmDelete = (permission: CorePermission) => {
  confirm.require({
    header: 'Xác nhận xoá quyền cốt lõi',
    message: `Bạn có chắc muốn xoá quyền "${permission.name}" (${permission.code})?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Xoá',
    rejectLabel: 'Huỷ',
    accept: () => void removeOne(permission),
  })
}
```

- [ ] **Step 3: Thêm helper confirm đổi trạng thái trong form sửa**

```ts
const confirmStatusChange = (permission: CorePermission) => {
  const nextStatus: CorePermissionStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  confirm.require({
    header: 'Xác nhận đổi trạng thái',
    message:
      nextStatus === 'ACTIVE'
        ? `Bạn có chắc muốn chuyển quyền "${permission.name}" sang hoạt động?`
        : `Bạn có chắc muốn chuyển quyền "${permission.name}" sang ngừng hoạt động?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: nextStatus === 'ACTIVE' ? 'Chuyển sang hoạt động' : 'Ngừng hoạt động',
    rejectLabel: 'Huỷ',
    accept: () => void updateStatusFromEdit(permission, nextStatus),
  })
}
```

- [ ] **Step 4: Cập nhật template tiếng Việt và nút hành động**

```vue
<div class="text-xl font-semibold text-slate-950 dark:text-white">Quyền cốt lõi</div>

<th class="px-4 py-4 font-semibold">Mã quyền</th>
<th class="px-4 py-4 font-semibold">Tên quyền</th>
<th class="px-4 py-4 font-semibold">Điều luật tham chiếu</th>
<th class="px-4 py-4 font-semibold">Trạng thái</th>
<th class="px-4 py-4 text-right font-semibold">Thao tác</th>
```

- [ ] **Step 5: Chạy kiểm tra type/lint cấp file**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: không có lỗi mới từ `CorePermissionSettingsPage.vue`

### Task 2: Việt hóa sidebar admin

**Files:**
- Modify: `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`

- [ ] **Step 1: Đổi label menu sang tiếng Việt**

```ts
{
  label: 'Bảng điều khiển',
  icon: 'pi pi-chart-bar',
  to: '/admin/dashboard',
}
```

- [ ] **Step 2: Cập nhật các item settings/admin sang tiếng Việt**

```ts
{
  label: 'Quyền cốt lõi',
  icon: 'pi pi-sliders-h',
  to: '/admin/settings/permissions',
}
```

- [ ] **Step 3: Chạy kiểm tra type/lint cấp file**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: không có lỗi mới từ `AdminLayout.vue`

### Task 3: Việt hóa tiêu đề route

**Files:**
- Modify: `apps/web/src/router/index.ts`

- [ ] **Step 1: Cập nhật meta.title sang tiếng Việt**

```ts
{ path: 'dashboard', component: AdminDashboardPage, meta: { title: 'Bảng điều khiển' } }
{ path: 'settings/permissions', component: CorePermissionSettingsPage, meta: { title: 'Quyền cốt lõi' } }
```

- [ ] **Step 2: Cập nhật title cho admin/users/settings còn lại**

```ts
meta: { title: 'Quản trị viên', requiresSuperAdmin: true }
meta: { title: 'Quyền nền tảng số' }
meta: { title: 'Quyền sử dụng vật lý' }
meta: { title: 'Hình thức biểu hiện' }
meta: { title: 'Mức độ biến đổi' }
meta: { title: 'Quản lý người mua' }
meta: { title: 'Quản lý nghệ sĩ' }
```

- [ ] **Step 3: Chạy kiểm tra type/lint cấp file**

Run: `pnpm -C apps/web exec vue-tsc --noEmit`
Expected: không có lỗi mới từ `router/index.ts`

### Task 4: Xác minh thay đổi

**Files:**
- Verify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Verify: `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`
- Verify: `apps/web/src/router/index.ts`

- [ ] **Step 1: Chạy typecheck frontend**

Run: `pnpm -C apps/web typecheck`
Expected: PASS

- [ ] **Step 2: Kiểm tra diagnostics**

Run tool: `GetDiagnostics` cho 3 file đã sửa
Expected: không có lỗi mới

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/layouts/AdminLayout.vue apps/web/src/router/index.ts docs/superpowers/specs/2026-05-28-core-permission-admin-nav-design.md docs/superpowers/plans/2026-05-28-core-permission-admin-nav.md
git commit -m "feat: improve core permission confirmations and admin labels"
```
