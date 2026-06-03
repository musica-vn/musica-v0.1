# Admin Responsive Foundation Phase 1 Design

## Goal

- Làm cho toàn bộ khu vực admin không còn vỡ layout khi viewport nhỏ hơn desktop.
- Xây nền responsive thống nhất cho `AdminLayout` và các pattern dùng chung trước khi tối ưu từng page sâu hơn ở các phase sau.
- Giữ trải nghiệm desktop hiện tại gần như nguyên vẹn, chỉ cải thiện khả năng co giãn và tính ổn định.
- Ưu tiên `layout integrity`, `readability`, `tap targets`, và `safe overflow` hơn là rewrite mobile-native toàn bộ ngay trong phase này.

## Scope

- Áp dụng cho [AdminLayout.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/layouts/AdminLayout.vue).
- Áp dụng cho tất cả admin pages đang được render bên trong `RouterView`.
- Chuẩn hóa các pattern dùng chung đang lặp lại ở:
  - summary cards
  - page headers
  - filter bars
  - action bars
  - stats rows
  - table wrappers
  - dialog sizing
- Các page đại diện đã được rà để làm reference cho spec:
  - [AdminDashboardPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/AdminDashboardPage.vue)
  - [AdminListPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/AdminListPage.vue)
  - [UserManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/UserManagementPage.vue)
  - [ProductManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)
  - [ComplianceManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue)
  - [CertificateManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue)
  - [CorePermissionSettingsPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue)
  - [LicensingConfigManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue)
- Không thay API backend.
- Không đổi business flow từng page ngoài các chỉnh sửa markup/UI cần thiết để đạt responsive an toàn.
- Không rewrite table sang card mobile trong phase này.

## Success Criteria

- Không còn sidebar, header, content hoặc dialog nào tràn ngoài viewport ở mobile và tablet.
- Các thanh filter và action không bị ép thành một hàng quá chật; chúng tự wrap hoặc stack theo breakpoint.
- Mọi vùng bảng dữ liệu nằm trong wrapper có chủ đích với `overflow-x-auto`, không kéo vỡ layout tổng.
- Dialog luôn nằm trong viewport với `max-height` hợp lý và scroll nội bộ.
- Các page admin có cùng nhịp spacing, container width và behavior trên breakpoint, tránh mỗi màn một kiểu.

## Current Problems

- `AdminLayout` hiện được thiết kế `desktop-first`, sidebar chỉ có `collapsed state` cho `lg`, chưa có chiến lược mobile navigation.
- Header admin chứa nhiều phần tử ngang như title, profile, role badge, theme toggle, logout; trên màn nhỏ dễ chật hoặc wrap thiếu kiểm soát.
- Nhiều page admin dùng các cụm `filter + button + summary` theo hàng ngang rộng, dễ vỡ khi viewport giảm.
- Một số page có `table` hoặc `DataTable` rộng hơn viewport; nếu không bọc đúng, toàn bộ trang bị tràn ngang.
- Các dialog detail/create/edit có nguy cơ vượt chiều ngang hoặc chiều cao trên mobile nếu giữ kích thước desktop.
- Các page hiện có visual language khá đồng đều nhưng chưa có responsive contract chung ở cấp admin shell.

## Product Intent

- Admin là không gian thao tác nghiệp vụ dày thông tin, nên mobile phase đầu không cần biến thành app-native hoàn chỉnh.
- Điều quan trọng nhất là:
  - không vỡ layout
  - không mất khả năng thao tác
  - không làm user lạc navigation
  - vẫn giữ được hierarchy cao cấp của giao diện admin hiện tại
- Vì vậy phase đầu chọn chiến lược `Foundation-First`:
  - navigation mobile bằng `drawer`
  - container co giãn an toàn
  - stack/filter/table/dialog behavior thống nhất
  - chưa chuyển mọi bảng sang card layout

## Chosen Direction

### Foundation-First Responsive Shell

- `Desktop >= 1024px`: giữ sidebar cố định và khả năng collapse như hiện tại.
- `Tablet 640-1023px`: bỏ sidebar cố định khỏi flow chính, dùng top header với nút mở navigation.
- `Mobile < 640px`: dùng `left drawer` full-height với overlay và khóa scroll nền khi mở.
- Main content sử dụng một container rhythm thống nhất để các page co giãn an toàn.
- Tất cả `table zones` dùng `overflow-x-auto` có chủ đích.
- Tất cả `dialogs` dùng width theo viewport, `max-height` theo màn hình và scroll nội bộ.

### Why this direction

- Giải quyết lỗi vỡ layout trên toàn admin nhanh và ít rủi ro hơn việc rewrite từng page độc lập.
- Tạo một responsive contract rõ ràng cho các phase sau.
- Bảo toàn phần lớn UI desktop mà user đã quen.
- Tránh over-engineer khi chưa cần đổi sâu information architecture của từng màn.

## Breakpoints

- `Mobile`: `< 640px`
- `Tablet`: `640px - 1023px`
- `Desktop`: `>= 1024px`

## Information Architecture

### Desktop

- Sidebar nằm trái, sticky.
- Main content nằm phải, gồm:
  - admin header
  - page content
- Sidebar collapse vẫn chỉ áp dụng cho desktop.

### Tablet and Mobile

- Header trở thành entry point chính cho navigation.
- Sidebar desktop biến thành drawer mở từ trái.
- Content chiếm trọn chiều ngang còn lại.
- Các page section đi theo vertical rhythm rõ ràng:
  - page intro
  - summary cards
  - filters/actions
  - table or content blocks

## Text-Based Wireframes

### Desktop

```text
+---------------- Sidebar ----------------+------------------- Main --------------------+
| logo + collapse button                 | header: title / profile / theme / logout    |
| nav item                               |---------------------------------------------|
| nav item                               | page intro                                   |
| nav item                               | summary cards grid                           |
| nav item                               | filters + action row                         |
| nav item                               | data table / content cards / dialogs         |
+-----------------------------------------+----------------------------------------------+
```

### Tablet

```text
+----------------------------------------------------------------+
| menu button | page title | theme | profile | logout            |
+----------------------------------------------------------------+
| page intro                                                     |
| summary cards grid 2 columns                                   |
| filters stacked into 2-column grid where possible              |
| action buttons wrap                                            |
| table wrapper with horizontal scroll                           |
+----------------------------------------------------------------+

drawer:
+------------------------+
| Musica Admin           |
| nav item               |
| nav item               |
| nav item               |
+------------------------+
```

### Mobile

```text
+----------------------------------------------+
| menu | page title                            |
| user row / compact actions                   |
+----------------------------------------------+
| page intro                                   |
| summary cards 1 column                       |
| filters stacked                              |
| action buttons full width or wrap 2 rows     |
| table wrapper scroll ngang có chủ đích       |
+----------------------------------------------+

drawer:
+----------------------+
| logo                 |
| current user         |
| nav items            |
| nav items            |
+----------------------+
```

## Component Structure

### Parent-child map

```text
AdminLayout
  AdminMobileTopBar
    AdminMenuButton
    AdminPageTitle
    AdminProfileCluster
    AdminThemeToggle
    AdminLogoutButton
  AdminSidebar
    AdminBrand
    AdminNavList
      AdminNavItem
  AdminMobileDrawer
    AdminDrawerHeader
    AdminNavList
  AdminMainContent
    RouterView
      AdminPageSection
        PageIntro
        SummaryCardsGrid
        FilterBar
        ActionBar
        ResponsiveTableShell
        ResponsiveDialogShell
```

### Boundary recommendations

- `AdminLayout` không nên tiếp tục tự ôm toàn bộ logic desktop và mobile trong một khối template lớn khó đọc.
- Nên tách các primitive responsive dùng chung ở admin shell hoặc shared admin components:
  - `AdminMobileDrawer`
  - `AdminPageContainer`
  - `AdminFilterBar`
  - `AdminActionBar`
  - `AdminTableShell`
  - `AdminDialogShell`
- Nếu chưa tách component ngay trong phase 1, vẫn phải quy định class contract thống nhất để phase 2 có thể tái dùng.

## Layout Specification

### 1. Admin shell container

- Outer shell:
  - background: `slate-100` / `slate-950`
  - min height: `min-h-screen`
- Desktop main grid:
  - collapsed sidebar: `lg:grid-cols-[96px_minmax(0,1fr)]`
  - expanded sidebar: `lg:grid-cols-[300px_minmax(0,1fr)]`
- Mobile/tablet:
  - bỏ grid 2 cột cố định
  - content layout trở thành 1 cột
- Content padding:
  - mobile: `px-3 py-3`
  - tablet: `px-4 py-4`
  - desktop: `px-6 py-6`
- Content gap:
  - mobile: `gap-4`
  - tablet: `gap-5`
  - desktop: `gap-6`

### 2. Sidebar and drawer

- Desktop sidebar:
  - giữ sticky behavior
  - giữ rounded panel và brand treatment hiện tại
- Mobile drawer:
  - width: `w-[min(88vw,320px)]`
  - height: `h-[100svh]`
  - overlay: `bg-slate-950/50`
  - close on overlay click
  - close on route change
  - body scroll lock khi mở
- Navigation items:
  - minimum touch target: `44px`
  - icon và label luôn căn trái trong drawer
  - active item dùng cùng tone violet như desktop

### 3. Admin header

- Desktop:
  - giữ card header hiện tại
  - cho cluster bên phải wrap an toàn hơn khi thiếu chỗ
- Tablet:
  - title chiếm full row nếu cần
  - profile card, theme toggle và logout được phép wrap xuống hàng 2
- Mobile:
  - bỏ profile layout quá ngang
  - chuyển thành `compact user row`
  - role badges chuyển xuống dòng riêng hoặc ẩn bớt nếu không quan trọng
- Header card padding:
  - mobile: `p-4`
  - tablet: `p-4.5`
  - desktop: `px-5 py-4`

### 4. Page content rhythm

- Page intro block:
  - title size:
    - mobile: `text-xl`
    - tablet: `text-2xl`
    - desktop: `text-[28px]`
  - description: `text-sm` đến `text-base`
- Summary cards:
  - mobile: `grid-cols-1`
  - tablet: `grid-cols-2`
  - desktop: `grid-cols-3` hoặc `grid-cols-4`
- Section stacks:
  - dùng `space-y-4` mobile
  - `space-y-5` tablet
  - `space-y-6` desktop

## Shared Responsive Rules

### 1. Filter bars

- Filter bars phải chuyển từ hàng ngang rộng sang grid responsive:
  - mobile: `grid-cols-1`
  - tablet: `sm:grid-cols-2`
  - desktop: `xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]` hoặc tương đương theo page
- Input/select/button không được phụ thuộc vào width cố định chỉ hợp desktop.
- Nút primary trên mobile có thể full width nếu đứng một mình.

### 2. Action bars

- Action buttons phải `flex-wrap`.
- Trên mobile:
  - nếu chỉ có 1 CTA chính, CTA đó có thể full width
  - nếu có nhiều CTA, nhóm thành 2 hàng thay vì nén một hàng
- Secondary actions nên xuống dòng trước khi làm vỡ layout.

### 3. Summary and stat cards

- Card padding:
  - mobile: `p-4`
  - desktop: `p-5`
- Icon container nên giữ tối thiểu `40x40`.
- Description có thể clamp 2 dòng để tránh card cao lệch quá mạnh.

### 4. Tables

- Mọi vùng table phải dùng wrapper kiểu:
  - `overflow-x-auto`
  - `rounded-3xl`
  - `min-w-max` hoặc `min-w-[960px]` theo data density
- Không cho toàn bộ page scroll ngang vì table không được bọc.
- Trên mobile/tablet, user chấp nhận scroll ngang trong zone của table ở phase này.
- Table header và row actions phải giữ được click target tối thiểu `40px`.

### 5. Dialogs

- Dialog width:
  - mobile: `w-[calc(100vw-1rem)]`
  - tablet: `w-[min(92vw,960px)]`
  - desktop: theo loại dialog hiện có
- Dialog max height:
  - `max-h-[calc(100svh-1rem)]` mobile
  - `max-h-[calc(100svh-2rem)]` tablet/desktop
- Dialog body:
  - có `overflow-y-auto`
  - footer sticky nếu dialog có CTA quan trọng
- Forms bên trong dialog phải stack 1 cột ở mobile trừ khi field cực ngắn.

## Accessibility

- Tất cả text chính phải đạt contrast tối thiểu `4.5:1`.
- Drawer mở phải:
  - trap focus
  - đóng bằng `Esc`
  - có `aria-label` cho nút menu và nút đóng
- Overlay click không phải cách duy nhất để đóng drawer.
- Các action icon-only phải có label hoặc `aria-label`.
- Table wrapper cần hint trực quan nhẹ như gradient fade hoặc helper text nếu cuộn ngang là cần thiết.
- Dialog và drawer phải dùng semantic focus order hợp lý, không nhảy focus ra nền.

## Visual System

- Màu chủ đạo:
  - primary accent: `violet-600`
  - hover accent: `violet-500`
  - success: `emerald-600`
  - warning: `amber-600`
  - danger: `rose-600`
  - neutral text: `slate-700` / `slate-200`
- Radius system:
  - shell cards: `rounded-[28px]` đến `rounded-[32px]`
  - controls: `rounded-2xl`
  - pills/badges: `rounded-full`
- Spacing system:
  - base: `4px`
  - key steps: `8, 12, 16, 20, 24`
- Typography:
  - heading page: `font-semibold`
  - card title: `text-sm` to `text-base`
  - metadata: `text-xs` to `text-sm`

## Tailwind-Oriented Snippets

### Responsive page container

```html
<section class="flex min-w-0 flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:gap-6 lg:px-6 lg:py-6">
  <!-- page content -->
</section>
```

### Responsive filter bar

```html
<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-end">
  <div class="min-w-0">
    <!-- keyword input -->
  </div>
  <div>
    <!-- status select -->
  </div>
  <div>
    <!-- sort select -->
  </div>
  <div class="flex flex-wrap gap-2">
    <!-- actions -->
  </div>
</div>
```

### Safe table shell

```html
<div class="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 dark:border-slate-800 dark:bg-slate-900/88">
  <div class="overflow-x-auto">
    <div class="min-w-[960px]">
      <!-- table -->
    </div>
  </div>
</div>
```

### Mobile drawer shell

```html
<div class="fixed inset-0 z-50 lg:hidden">
  <button class="absolute inset-0 bg-slate-950/50" aria-label="Đóng menu điều hướng"></button>
  <aside class="relative h-[100svh] w-[min(88vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
    <!-- nav -->
  </aside>
</div>
```

### Responsive dialog panel

```html
<div class="w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] overflow-hidden rounded-[28px] sm:w-[min(92vw,960px)] sm:max-h-[calc(100svh-2rem)]">
  <div class="max-h-full overflow-y-auto">
    <!-- dialog body -->
  </div>
</div>
```

## Implementation Notes

- `AdminLayout` là điểm thay đổi trọng tâm của phase 1.
- Các page không cần đổi business logic; chủ yếu chỉnh:
  - wrapper classes
  - grid/flex breakpoints
  - overflow shells
  - dialog sizing props hoặc internal container classes
- Với page đang dùng PrimeVue `DataTable`, ưu tiên bọc bên ngoài bằng shell responsive thay vì custom rewrite.
- Với page đang dùng list-card như certificate, vẫn áp dụng cùng page rhythm và filter stack rules.

## Out of Scope

- Chuyển bảng dữ liệu sang card layout mobile cho từng page.
- Tối ưu riêng từng business workflow như licensing detail, compliance detail, certificate template editor.
- Đổi thứ tự menu admin hoặc information architecture sâu.
- Thay đổi API, store contract, query params, hoặc pagination behavior.

## Risks

- Nếu chỉ sửa layout shell mà không chạm một số page wrapper đặc biệt, vẫn có thể còn vài điểm overflow cục bộ.
- PrimeVue dialog/DataTable có thể cần per-page tuning ngoài class wrapper chung.
- Mobile drawer nếu không lock body scroll đúng sẽ tạo cảm giác giật hoặc scroll kép.

## Validation Plan

- Kiểm tra bằng viewport:
  - `375x812`
  - `390x844`
  - `768x1024`
  - `1024x768`
  - `1280x800`
- Đi qua tối thiểu các màn:
  - dashboard
  - admin list
  - user management
  - product management
  - compliance
  - certificate
  - core permission
  - licensing config
- Kiểm tra các trạng thái:
  - drawer mở/đóng
  - table có nhiều cột
  - filter dài
  - dialog create/edit/detail
  - dark mode

## Phase Linkage

- `Phase 1`: responsive foundation cho shell và shared patterns.
- `Phase 2`: tối ưu sâu các page nặng dữ liệu như `ProductManagement`, `Compliance`, `AdminList`, `UserManagement`.
- `Phase 3`: tối ưu các màn còn lại như `Certificate`, `Licensing`, `CorePermission` và polish mobile experience.
