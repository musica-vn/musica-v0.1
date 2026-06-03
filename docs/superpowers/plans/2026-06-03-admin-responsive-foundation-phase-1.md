# Admin Responsive Foundation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm cho toàn bộ khu vực admin không còn vỡ layout trên mobile và tablet bằng cách triển khai responsive foundation cho `AdminLayout`, navigation, page containers, filter/action bars, table wrappers và dialog sizing.

**Architecture:** Giữ nguyên business logic, API calls và page flows hiện có; chỉ thay đổi `layout structure`, `responsive classes`, và các wrapper/primitive dùng chung ở tầng admin shell. Triển khai theo hướng `foundation-first`: xử lý `AdminLayout` trước, sau đó chuẩn hóa shared responsive patterns và áp vào từng admin page đại diện để toàn bộ admin shell có cùng contract hiển thị.

**Tech Stack:** Vue 3, TypeScript, TailwindCSS, PrimeVue, Vue Router, vue-tsc

---

## File Structure
- Modify: `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`
- Modify: `apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Optional create if extraction becomes worthwhile during execution:
  - `apps/web/src/features/admin-shell/components/AdminMobileDrawer.vue`
  - `apps/web/src/features/admin-shell/components/AdminPageContainer.vue`
  - `apps/web/src/features/admin-shell/components/AdminResponsiveTableShell.vue`

## Constraints
- Không thay API contract hoặc store contract.
- Không rewrite table sang card mobile ở phase này.
- Không đổi route structure hoặc information architecture.
- Không thêm thư viện mới.
- Verification chính dùng `pnpm --dir apps/web typecheck`, diagnostics và manual viewport smoke test.

## Validation Commands
- Typecheck:

```bash
pnpm --dir apps/web typecheck
```

- Dev server:

```bash
pnpm --dir apps/web dev --host 0.0.0.0
```

- Viewport cần kiểm tra:
  - `375x812`
  - `390x844`
  - `768x1024`
  - `1024x768`
  - `1280x800`

## Task 1: Nâng cấp `AdminLayout` thành responsive shell

**Files:**
- Modify: `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`

- [ ] **Step 1: Thêm state cho mobile drawer và route-close behavior**

```ts
const isMobileDrawerOpen = ref(false)

const openMobileDrawer = () => {
  isMobileDrawerOpen.value = true
}

const closeMobileDrawer = () => {
  isMobileDrawerOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    isMobileDrawerOpen.value = false
  },
)
```

- [ ] **Step 2: Thêm body scroll lock cho drawer**

```ts
watch(isMobileDrawerOpen, (nextValue) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = nextValue ? 'hidden' : ''
})
```

- [ ] **Step 3: Tách navigation rendering để dùng lại cho desktop sidebar và mobile drawer**

```ts
const navLinkClass = (targetPath: string) => [
  'group flex items-center gap-3 rounded-[22px] border px-3 py-3 transition',
  isRouteActive(targetPath)
    ? 'border-transparent bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-500/10 dark:text-violet-200'
    : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950/60 dark:hover:text-white',
]
```

- [ ] **Step 4: Cập nhật template shell cho mobile/tablet**

```vue
<div class="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:grid lg:gap-6 lg:px-6 lg:py-6" :class="sidebarGridClass">
  <aside class="hidden lg:block lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)]">
    <!-- desktop sidebar -->
  </aside>

  <div
    v-if="isMobileDrawerOpen"
    class="fixed inset-0 z-50 lg:hidden"
  >
    <button
      type="button"
      class="absolute inset-0 bg-slate-950/50"
      aria-label="Đóng menu điều hướng"
      @click="closeMobileDrawer"
    />
    <aside class="relative h-[100svh] w-[min(88vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <!-- drawer nav -->
    </aside>
  </div>

  <main class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <!-- responsive header + router view -->
  </main>
</div>
```

- [ ] **Step 5: Thêm mobile header entry point với menu button**

```vue
<header class="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 lg:rounded-[28px] lg:px-5 lg:py-4">
  <div class="flex items-start justify-between gap-3 sm:flex-wrap">
    <div class="flex min-w-0 items-center gap-3">
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
        aria-label="Mở menu điều hướng"
        @click="openMobileDrawer"
      >
        <i class="pi pi-bars" />
      </button>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <i class="pi pi-compass" />
          <span class="truncate">{{ pageTitle }}</span>
        </div>
      </div>
    </div>
    <!-- right cluster -->
  </div>
</header>
```

- [ ] **Step 6: Chạy typecheck cho `AdminLayout`**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/admin-shell/layouts/AdminLayout.vue
git commit -m "feat: add responsive admin shell foundation"
```

## Task 2: Chuẩn hóa header cluster và nhịp container cho admin pages

**Files:**
- Modify: `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`
- Modify: `apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Dùng page container rhythm thống nhất cho các page**

```vue
<template>
  <section class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
    <!-- page intro -->
    <!-- summary cards -->
    <!-- filters -->
    <!-- content blocks -->
  </section>
</template>
```

- [ ] **Step 2: Chuyển summary cards sang grid responsive**

```vue
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <AdminStatCard
    v-for="card in statCards"
    :key="card.title"
    v-bind="card"
  />
</div>
```

- [ ] **Step 3: Cho page intro và action heading wrap an toàn**

```vue
<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
  <div class="min-w-0 space-y-2">
    <h1 class="text-xl font-semibold text-slate-900 sm:text-2xl lg:text-[28px] dark:text-white">
      {{ title }}
    </h1>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      {{ description }}
    </p>
  </div>
  <div class="flex flex-wrap gap-2">
    <!-- action buttons -->
  </div>
</div>
```

- [ ] **Step 4: Chạy typecheck sau khi chạm toàn bộ page containers**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/layouts/AdminLayout.vue apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue apps/web/src/features/admin-shell/pages/AdminListPage.vue apps/web/src/features/admin-shell/pages/UserManagementPage.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "refactor: unify admin page responsive rhythm"
```

## Task 3: Chuẩn hóa `filter bars` và `action bars`

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Chuyển các khối filter sang grid responsive**

```vue
<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-end">
  <div class="min-w-0">
    <ProductFilterInput v-model="filters.keyword" />
  </div>
  <div>
    <ProductFilterSelect v-model="filters.status" :options="statusOptions" />
  </div>
  <div>
    <ProductFilterSelect v-model="filters.sort" :options="sortOptions" />
  </div>
  <div class="flex flex-wrap gap-2">
    <button :class="primaryButtonClass">Tạo mới</button>
  </div>
</div>
```

- [ ] **Step 2: Cho action clusters wrap hoặc full-width trên mobile**

```vue
<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
  <button :class="primaryButtonClass + ' w-full sm:w-auto'">
    Lưu thay đổi
  </button>
  <button :class="secondaryButtonClass + ' w-full sm:w-auto'">
    Hủy
  </button>
</div>
```

- [ ] **Step 3: Giữ width field an toàn trên mobile**

```ts
const fieldClass =
  'h-12 w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20'
```

- [ ] **Step 4: Chạy typecheck**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/pages/AdminListPage.vue apps/web/src/features/admin-shell/pages/UserManagementPage.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "refactor: make admin filters and actions responsive"
```

## Task 4: Bọc an toàn mọi `table zone` và nội dung wide-first

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Thêm shell cho table/list content**

```vue
<div class="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 dark:border-slate-800 dark:bg-slate-900/88">
  <div class="overflow-x-auto">
    <div class="min-w-[960px]">
      <!-- existing table or DataTable -->
    </div>
  </div>
</div>
```

- [ ] **Step 2: Với page dùng PrimeVue `DataTable`, bọc bên ngoài thay vì rewrite table**

```vue
<div class="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40">
  <div class="overflow-x-auto">
    <DataTable
      class="min-w-[960px]"
      :value="managedUsersStore.items"
      paginator
      :rows="pageSize"
      :first="first"
    >
      <!-- columns -->
    </DataTable>
  </div>
</div>
```

- [ ] **Step 3: Với card/list page như certificate, đảm bảo khối preview/list không ép ngang viewport**

```vue
<div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
  <div class="min-w-0">
    <!-- list -->
  </div>
  <aside class="min-w-0">
    <!-- preview / side tools -->
  </aside>
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
git add apps/web/src/features/admin-shell/pages/AdminListPage.vue apps/web/src/features/admin-shell/pages/UserManagementPage.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "refactor: add safe responsive shells for admin tables"
```

## Task 5: Chuẩn hóa dialog sizing và overflow behavior

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Áp dụng responsive width và max-height cho dialog panels**

```vue
<Dialog
  v-model:visible="detailDialogVisible"
  modal
  :style="{ width: 'min(92vw, 1100px)' }"
  content-class="max-h-[calc(100svh-2rem)] overflow-y-auto"
>
  <!-- dialog body -->
</Dialog>
```

- [ ] **Step 2: Với form dialogs, chuyển grid hai cột sang một cột ở mobile**

```vue
<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <div class="min-w-0">
    <!-- field -->
  </div>
  <div class="min-w-0">
    <!-- field -->
  </div>
</div>
```

- [ ] **Step 3: Với dialog có footer action mạnh, giữ footer không tràn ngang**

```vue
<div class="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
  <button :class="secondaryButtonClass + ' w-full sm:w-auto'">Đóng</button>
  <button :class="primaryButtonClass + ' w-full sm:w-auto'">Lưu</button>
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
git add apps/web/src/features/admin-shell/pages/AdminListPage.vue apps/web/src/features/admin-shell/pages/UserManagementPage.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "refactor: make admin dialogs responsive"
```

## Task 6: Verify toàn bộ admin shell theo viewport và sửa regression cuối

**Files:**
- Modify as needed:
  - `apps/web/src/features/admin-shell/layouts/AdminLayout.vue`
  - `apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue`
  - `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
  - `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
  - `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
  - `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
  - `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
  - `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
  - `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

- [ ] **Step 1: Chạy typecheck cuối**

Run:

```bash
pnpm --dir apps/web typecheck
```

Expected: PASS

- [ ] **Step 2: Kiểm tra diagnostics cho toàn bộ file vừa sửa**

Run using IDE diagnostics on:

```text
apps/web/src/features/admin-shell/layouts/AdminLayout.vue
apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue
apps/web/src/features/admin-shell/pages/AdminListPage.vue
apps/web/src/features/admin-shell/pages/UserManagementPage.vue
apps/web/src/features/admin-shell/pages/ProductManagementPage.vue
apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue
apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue
apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue
apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
```

Expected: no new diagnostics

- [ ] **Step 3: Chạy manual smoke test với dev server**

Run:

```bash
pnpm --dir apps/web dev --host 0.0.0.0
```

Verify:

```text
375x812: drawer mở/đóng ổn, header không vỡ, filters stack đúng, dialog không vượt màn hình
768x1024: summary cards và filter bars wrap đúng, table có horizontal scroll trong shell
1024x768: desktop shell vẫn đúng, sidebar collapse không regress
Dark mode: navigation, dialogs, wrappers vẫn đủ contrast
```

- [ ] **Step 4: Sửa các regression nhỏ phát hiện trong smoke test**

```ts
// Chỉ sửa các class/layout regressions nhỏ, không đổi scope phase 1
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin-shell/layouts/AdminLayout.vue apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue apps/web/src/features/admin-shell/pages/AdminListPage.vue apps/web/src/features/admin-shell/pages/UserManagementPage.vue apps/web/src/features/admin-shell/pages/ProductManagementPage.vue apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue
git commit -m "feat: complete admin responsive foundation phase 1"
```

## Spec Coverage Check
- `AdminLayout responsive shell`: covered by Task 1.
- `Container rhythm, summary cards, page headers`: covered by Task 2.
- `Filter bars và action bars`: covered by Task 3.
- `Table wrappers và wide-first zones`: covered by Task 4.
- `Dialog sizing và overflow`: covered by Task 5.
- `Viewport validation và regression pass`: covered by Task 6.

## Notes For Execution
- Không mở rộng scope sang rewrite mobile card layouts trong phase này.
- Nếu một page có cấu trúc quá đặc biệt, ưu tiên bọc bằng responsive shell thay vì tách component lớn.
- Nếu cần tách `AdminMobileDrawer` hoặc `AdminResponsiveTableShell`, chỉ làm khi nó thực sự giảm duplication trong cùng phase này.
