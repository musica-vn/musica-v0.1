# Core Settings Hybrid Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu `CorePermissionSettingsPage` và `LicensingConfigManagementPage` cho mobile bằng card-first list, action hierarchy rõ hơn, và sheet-like dialogs, trong khi vẫn giữ `table-first workflow` cho tablet/desktop.

**Architecture:** Tách presentation mobile thành các component card list chuyên biệt, dùng lại source data và handlers hiện có trong từng page. `CorePermissionSettings` sẽ áp dụng card-first ở list và dialog single-column; `LicensingConfigManagement` sẽ dùng card list + mobile action menu cho các resource `digital`, `physical`, `expression`, `modification`, đồng thời tối ưu create/edit/permissions/package dialogs thành sheet-like flows.

**Tech Stack:** Vue 3, TypeScript, TailwindCSS, PrimeVue, vue-tsc

---

## File Structure

- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Create: `apps/web/src/features/admin-shell/components/CorePermissionMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/CorePermissionMobileCardList.vue`
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigMobileCardList.vue`
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigActionMenu.vue`

## Constraints

- Không đổi API/store/business logic.
- Không thêm dependency mới.
- Không thay table desktop/tablet bằng cards.
- Verification chính: `pnpm --dir apps/web typecheck`, diagnostics, manual preview.

## Validation Commands

- Typecheck:

```bash
pnpm --dir apps/web typecheck
```

- Dev server:

```bash
pnpm --dir apps/web dev --host 0.0.0.0
```

## Task 1: CorePermissionSettings mobile card list

**Files:**
- Create: `apps/web/src/features/admin-shell/components/CorePermissionMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/CorePermissionMobileCardList.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`

- [ ] Tạo `CorePermissionMobileCard.vue` để hiển thị `name`, `description`, `lawReference`, `status`, `updatedAt` và action row trên mobile.
- [ ] Tạo `CorePermissionMobileCardList.vue` để render danh sách cards ở `sm:hidden` và empty state riêng.
- [ ] Nối mobile card list vào `CorePermissionSettingsPage.vue`, giữ table hiện tại ở `sm:block`.
- [ ] Thêm helper format/status class nếu cần để card dùng chung với table.
- [ ] Chạy `pnpm --dir apps/web typecheck` và sửa lỗi nếu có.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/components/CorePermissionMobileCard.vue apps/web/src/features/admin-shell/components/CorePermissionMobileCardList.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue
git commit -m "feat: add mobile card list for core permission settings"
```

## Task 2: CorePermissionSettings dialog mobile

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`

- [ ] Đổi dialog create/edit sang kích thước mobile-friendly `w-[calc(100vw-0.75rem)]`.
- [ ] Giảm grid cứng của form về single-column tốt hơn trên mobile và chỉ chia cột từ tablet/desktop.
- [ ] Tối ưu footer CTA thành stack dọc trên mobile.
- [ ] Chạy `pnpm --dir apps/web typecheck`.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue
git commit -m "refactor: optimize core permission dialog for mobile"
```

## Task 3: LicensingConfigManagement mobile card list

**Files:**
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigMobileCard.vue`
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigMobileCardList.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] Tạo `LicensingConfigMobileCard.vue` cho list mobile, nhận props đủ để render mọi `resource`.
- [ ] Tạo `LicensingConfigMobileCardList.vue` để bọc card list và empty state riêng.
- [ ] Thêm các helper adapter trong page để resolve label/status/permission count/detail text cho card list.
- [ ] Mount mobile card list trước table, ẩn table ở mobile.
- [ ] Chạy `pnpm --dir apps/web typecheck`.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/components/LicensingConfigMobileCard.vue apps/web/src/features/admin-shell/components/LicensingConfigMobileCardList.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "feat: add mobile card list for licensing config settings"
```

## Task 4: LicensingConfigManagement mobile action hierarchy

**Files:**
- Create: `apps/web/src/features/admin-shell/components/LicensingConfigActionMenu.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] Tạo `LicensingConfigActionMenu.vue` dạng bottom-sheet cho action phụ theo từng resource.
- [ ] Thêm state `mobileActionItem` và handlers mở/đóng trong page.
- [ ] Nối `edit`, `toggle`, `permissions`, `package products`, `delete` qua action menu cho mobile.
- [ ] Đảm bảo mọi flow mở dialog khác sẽ đóng action menu trước.
- [ ] Chạy `pnpm --dir apps/web typecheck`.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/components/LicensingConfigActionMenu.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "feat: add licensing config mobile action menu"
```

## Task 5: LicensingConfigManagement dialogs for mobile

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] Tối ưu create dialog cho mobile:
  - giảm grid cứng
  - stack sections
  - full-width CTA
  - price modifier blocks dễ đọc hơn
- [ ] Tối ưu edit dialog theo cùng pattern với create dialog.
- [ ] Tối ưu permissions dialog và package products dialog thành sheet-like mobile dialogs.
- [ ] Chạy `pnpm --dir apps/web typecheck`.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "refactor: optimize licensing config dialogs for mobile"
```

## Task 6: Verify and regression pass

**Files:**
- Modify if needed: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify if needed: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Modify if needed: `apps/web/src/features/admin-shell/components/*.vue`

- [ ] Chạy `pnpm --dir apps/web typecheck`.
- [ ] Chạy diagnostics cho các file đã sửa/tạo.
- [ ] Mở preview bằng `pnpm --dir apps/web dev --host 0.0.0.0`.
- [ ] Smoke test các viewport mobile/tablet/desktop cho:
  - `CorePermissionSettings`
  - `digital-rights`
  - `physical-rights`
  - `expression-configs`
  - `modification-configs`
- [ ] Sửa regression cuối nếu có.
- [ ] Commit với message:

```bash
git add apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue apps/web/src/features/admin-shell/components/CorePermissionMobileCard.vue apps/web/src/features/admin-shell/components/CorePermissionMobileCardList.vue apps/web/src/features/admin-shell/components/LicensingConfigMobileCard.vue apps/web/src/features/admin-shell/components/LicensingConfigMobileCardList.vue apps/web/src/features/admin-shell/components/LicensingConfigActionMenu.vue
git commit -m "feat: complete core settings hybrid mobile experience"
```
