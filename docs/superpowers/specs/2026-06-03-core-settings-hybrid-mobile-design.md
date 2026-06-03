# Core Settings Hybrid Mobile Design

## Goal

- Tối ưu cụm `Core Settings` cho mobile mà không phá trải nghiệm table-first trên tablet và desktop.
- Áp dụng cho [CorePermissionSettingsPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue) và [LicensingConfigManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue).
- Giữ nguyên API, store, business rule, payload và flow publish/toggle/delete hiện tại.

## Scope

- `CorePermissionSettingsPage`:
  - list/table
  - filter/action bar
  - create/edit dialog
- `LicensingConfigManagementPage`:
  - hero + filter block
  - list/table cho `digital`, `physical`, `expression`, `modification`
  - create/edit dialogs
  - permissions dialog
  - package products dialog
- Có thể tách thêm component presentation mới nếu giúp giảm độ phình file:
  - `CorePermissionMobileCardList`
  - `CorePermissionMobileCard`
  - `LicensingConfigMobileCardList`
  - `LicensingConfigMobileCard`
  - `LicensingConfigActionMenu`
- Không đổi route, schema, store contract hoặc validation backend.

## Problem Summary

- Sau `Phase 1`, cụm settings không còn vỡ layout cơ bản nhưng vẫn là trải nghiệm `table-first`.
- Trên mobile, cả hai màn vẫn phụ thuộc nhiều vào cuộn ngang và action icon nhỏ.
- `LicensingConfigManagementPage` đặc biệt nặng vì:
  - nhiều loại resource trong cùng một page
  - nhiều action ở từng dòng
  - dialog create/edit có phần `price modifiers` và `permissions` khá dài
- `CorePermissionSettingsPage` nhẹ hơn nhưng vẫn cần card-first list và dialog nhỏ gọn hơn để thao tác tự nhiên trên mobile.

## Chosen Direction

### Option A: Giữ table cho mọi breakpoint

- Ưu điểm:
  - ít thay đổi code
  - không cần tách component mới
- Nhược điểm:
  - mobile vẫn khó scan
  - icon actions và cột dài vẫn chật
  - không giải quyết pain point thực tế

### Option B: Card-first toàn bộ mọi breakpoint

- Ưu điểm:
  - UI đồng nhất
  - dễ tối ưu mobile
- Nhược điểm:
  - làm chậm thao tác trên desktop
  - mất lợi thế dense table ở settings
  - regression risk cao

### Option C: Hybrid Settings Mobile

- `Mobile < 640px`: card list + bottom-sheet actions + sheet-like dialogs
- `Tablet >= 640px`: giữ table hiện tại
- Đây là hướng chọn.

### Why this direction

- `Core Settings` vẫn là khu quản trị dữ liệu, nên desktop/tablet cần giữ density cao.
- Mobile chỉ nên đổi presentation và interaction hierarchy.
- `CorePermissionSettings` và `LicensingConfigManagement` có thể dùng chung pattern, giúp consistency và giảm cognitive load.

## Success Criteria

- Mobile xem được danh sách settings mà không cần cuộn ngang.
- User có thể thực hiện action chính trên mobile bằng vùng bấm lớn và hierarchy rõ ràng.
- Dialog create/edit không còn cảm giác form desktop bị ép vào popup nhỏ.
- `LicensingConfigManagement` vẫn giữ được đầy đủ thông tin về permissions, status, pricing, package products nhưng trình bày dễ scan hơn.
- Tablet/desktop không regression tốc độ thao tác.

## Responsive Strategy

### Mobile `< 640px`

- Ẩn table, hiển thị `card list`.
- Filter block stack 1 cột.
- CTA chính full-width.
- Secondary actions gom vào `bottom-sheet` hoặc `more menu`.
- Dialog:
  - `w-[calc(100vw-0.75rem)]`
  - `max-h-[calc(100svh-0.75rem)]`
  - body scroll nội bộ
  - footer CTA stack dọc

### Tablet `640px - 1023px`

- Giữ table.
- Filter block dùng 2 cột hoặc wrap tự nhiên.
- Dialog giữ modal centered nhưng spacing gọn hơn.

### Desktop `>= 1024px`

- Giữ hoàn toàn `table-first workflow`.
- Giữ multi-column forms cho create/edit dialogs.

## Information Architecture

### CorePermissionSettings Mobile

- Hero / summary cards
- Filter stack
- Mobile permission cards
- Pagination footer
- Create/Edit sheet

### LicensingConfigManagement Mobile

- Hero + CTA
- Filter stack
- Mobile config cards
- Pagination footer
- Create/Edit sheet
- Permissions detail sheet
- Package products sheet

## Text-Based Wireframes

### Desktop

```text
+----------------------------------------------------------------------------------+
| hero / title / CTA                                                               |
+----------------------------------------------------------------------------------+
| filters                                                                          |
+----------------------------------------------------------------------------------+
| table: detail | pricing | permissions | status | actions                         |
+----------------------------------------------------------------------------------+
| create/edit dialogs: multi-column, permissions picker, modifier groups           |
+----------------------------------------------------------------------------------+
```

### Tablet

```text
+---------------------------------------------------------------------------+
| hero + CTA                                                                |
+---------------------------------------------------------------------------+
| filters wrap 2 columns                                                    |
+---------------------------------------------------------------------------+
| table shell có chủ đích cho màn rộng hơn mobile                           |
+---------------------------------------------------------------------------+
| dialogs centered, body scroll nội bộ                                      |
+---------------------------------------------------------------------------+
```

### Mobile

```text
+---------------------------------------------------+
| hero / title / CTA                                |
+---------------------------------------------------+
| filters stacked                                   |
+---------------------------------------------------+
| card                                              |
| detail title                                      |
| price / law reference / permissions count         |
| status pill                                       |
| [Primary action] [Secondary action] [More]        |
+---------------------------------------------------+
| next card                                         |
+---------------------------------------------------+
| pagination                                        |
+---------------------------------------------------+

dialogs:
+---------------------------------------------------+
| sheet header                                      |
| summary block                                     |
| form / tabs / selection blocks                    |
| footer CTA stack                                  |
+---------------------------------------------------+
```

## Component Structure

### CorePermissionSettings

```text
CorePermissionSettingsPage
  CorePermissionHero
  CorePermissionFilters
  CorePermissionDesktopTable
  CorePermissionMobileCardList
    CorePermissionMobileCard
  CorePermissionDialog
```

### LicensingConfigManagement

```text
LicensingConfigManagementPage
  LicensingConfigHero
  LicensingConfigFilters
  LicensingConfigDesktopTable
  LicensingConfigMobileCardList
    LicensingConfigMobileCard
  LicensingConfigActionMenu
  LicensingConfigCreateDialog
  LicensingConfigEditDialog
  LicensingConfigPermissionsDialog
  LicensingConfigPackageProductsDialog
```

## Detailed UI Design

### 1. Core Permission Cards

- Card hiển thị:
  - tên quyền
  - mô tả ngắn
  - `lawReference`
  - status pill
  - updated time
- Action row:
  - primary: `Chỉnh sửa`
  - secondary: `Bật/Tắt` nếu cần
  - destructive: `Xoá`
- Mục tiêu là không còn lệ thuộc vào icon-only row trên mobile.

### 2. Licensing Config Cards

- Card hiển thị:
  - detail text theo resource
  - price/base multiplier
  - permissions count
  - status pill
  - với `digital/physical`: thêm nhãn `package-enabled` hoặc access tới package products
- Action row:
  - primary: `Chỉnh sửa`
  - secondary: `Bật/Tắt`
  - overflow menu:
    - `Xem quyền`
    - `Xem sản phẩm tham gia` nếu là `digital/physical`
    - `Xoá`

### 3. Dialog Strategy

- `CorePermissionSettings` dialog:
  - mobile dùng single-column sections
  - status selector giữ dạng large cards như hiện tại
  - footer CTA full-width
- `LicensingConfigManagement` dialogs:
  - create/edit trên mobile đổi từ grid cứng sang sections stack dọc
  - khối `price modifiers` chia thành các block riêng, giảm chiều ngang
  - permissions picker chuyển thành stacked selection cards dễ chạm
  - permissions detail/package products dialog chuyển thành sheet-like lists

### 4. Action Hierarchy

- `CorePermissionSettings` không cần action menu riêng nếu card có thể chứa hết 2-3 thao tác chính.
- `LicensingConfigManagement` cần `action menu` cho mobile vì số action thay đổi theo resource.
- Desktop vẫn giữ icon row hiện tại.

## Responsive Behavior By Breakpoint

### CorePermissionSettings

- Mobile:
  - table hidden
  - cards visible
  - dialog single-column
- Tablet:
  - giữ table
  - dialog padding gọn hơn
- Desktop:
  - giữ nguyên rhythm hiện tại

### LicensingConfigManagement

- Mobile:
  - table hidden
  - cards visible
  - `digital filters` stack
  - dialogs gần full-height
- Tablet:
  - giữ table
  - filter grid wrap tốt hơn
- Desktop:
  - giữ table và multi-column forms

## Accessibility

- Tất cả action mobile dùng button có label rõ, tránh icon-only khi là action chính.
- Pills và text giữ contrast đủ cao theo WCAG 2.1 AA.
- Dialog sheet vẫn phải:
  - focusable
  - có close path rõ
  - CTA footer dễ reach
- Card actions và permission selectors giữ hit area tối thiểu khoảng `44px`.

## Tailwind Implementation Notes

- Card shell:
  - `rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm`
- Mobile dialog:
  - `w-[calc(100vw-0.75rem)]`
  - `max-h-[calc(100svh-0.75rem)]`
- Footer CTA mobile:
  - `flex flex-col gap-3 sm:flex-row sm:justify-end`
- Mobile action menu:
  - `sm:hidden`
  - `items-end` trên dialog mask để tạo cảm giác bottom-sheet

## Out Of Scope

- Không refactor store hoặc API client.
- Không đổi logic pricing modifier.
- Không merge các resource settings thành route mới.
- Không thêm virtual scrolling hoặc pagination mới.
