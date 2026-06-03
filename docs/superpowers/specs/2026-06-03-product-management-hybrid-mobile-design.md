# Product Management Hybrid Mobile Design

## Goal

- Tối ưu `ProductManagement` cho mobile và tablet sau khi `Phase 1` đã xử lý responsive foundation.
- Giữ tốc độ thao tác cao trên desktop/tablet bằng `table`, nhưng chuyển mobile sang `card list` để dễ scan và thao tác thực tế.
- Làm cho `list`, `detail`, `edit`, `create`, `upload`, và `approved permissions` hoạt động tự nhiên hơn trên màn hình nhỏ mà không đổi business logic hay API.

## Scope

- Áp dụng cho [ProductManagementPage.vue](file:///Users/dungpham/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue).
- Có thể tách thêm component con nếu giúp giảm độ phình của page:
  - `ProductManagementMobileCardList`
  - `ProductManagementMobileCard`
  - `ProductManagementSheetHeader`
  - `ProductManagementDetailSummary`
  - `ProductManagementActionMenu`
- Không đổi API, store contract, hoặc logic publish/hide/licensing/compliance.
- Không thay trải nghiệm desktop theo hướng phá bỏ `table`.

## Problem Summary

- `ProductManagement` hiện có nhiều cột dữ liệu dày: `thumbnail`, `metadata`, `permissions`, `legal`, `waveform`, `status`, `actions`.
- Sau `Phase 1`, màn này không còn vỡ layout, nhưng mobile vẫn là trải nghiệm `table-first`, phải cuộn ngang và khó thao tác nhanh.
- `detail/edit/create` đang dùng dialog desktop-first; dù không tràn viewport, trên mobile vẫn có cảm giác nặng và phải cuộn khó định hướng.
- Các action quan trọng như `publish/hide`, `mở detail`, `mở approved permissions`, `mở compliance`, `upload audio` chưa có hierarchy riêng cho mobile.

## Chosen Direction

### Hybrid Rendering

- `Mobile < 640px`: render danh sách sản phẩm bằng `card list`.
- `Tablet >= 640px`: giữ `table` hiện tại, chỉ polish nhẹ về spacing và action grouping nếu cần.
- `Detail/Edit/Create/Upload/Approved permissions`:
  - mobile: dialog hành xử như `sheet` cao gần full màn hình
  - tablet/desktop: giữ dialog truyền thống

### Why this direction

- Mobile là nơi table nhiều cột bị giảm usability mạnh nhất.
- Tablet vẫn đủ không gian để giữ `table`, giúp không phát sinh hai trải nghiệm khác nhau quá sớm trên màn trung bình.
- `Hybrid` cho phép giải quyết pain point mobile thực sự mà không rewrite toàn màn.

## Success Criteria

- Mobile có thể xem danh sách sản phẩm mà không cần cuộn ngang.
- Mỗi card đủ thông tin để user quyết định thao tác tiếp theo ngay từ list.
- Các action chính trên mobile nằm trong vùng dễ bấm, không dồn quá nhiều button ngang.
- `Create`, `Edit`, `Detail`, `Upload`, `Approved permissions` hiển thị rõ cấu trúc và không tạo cảm giác “form nhét trong popup”.
- Desktop/tablet không bị regression về tốc độ thao tác.

## Responsive Strategy

### Mobile `< 640px`

- Ẩn `table`, hiển thị `card list`.
- Filter bar giữ dạng stack 1 cột.
- Summary cards vẫn giữ grid 1-2 cột tùy chiều rộng.
- Dialog dùng `sheet-like panel`:
  - `w-[calc(100vw-0.75rem)]`
  - `max-h-[calc(100svh-0.75rem)]`
  - body cuộn nội bộ
  - footer CTA sticky hoặc tách rõ ở cuối

### Tablet `640px - 1023px`

- Giữ `table`.
- Giữ filter grid 2 cột.
- Dialog vẫn là modal, nhưng layout form có thể chuyển `1 cột` hoặc `1.2fr / 0.8fr` tùy chỗ.

### Desktop `>= 1024px`

- Giữ hoàn toàn `table-first`.
- Giữ multi-column layout hiện tại của `detail/edit/create`.

## Information Architecture

### Mobile List

- Page hero
- Summary cards
- Filter block
- Mobile product cards
- Pagination footer

### Card anatomy

- Thumbnail + title + artist
- Status row:
  - publish status
  - legal status
- Secondary metadata:
  - genres
  - duration
  - updatedAt
- Utility row:
  - số `approved permissions`
  - waveform availability
- Action row:
  - primary: `Xem chi tiết`
  - secondary: `Ẩn/Phát hành`
  - overflow/menu: `Quyền bán`, `Compliance`, `Chỉnh sửa`, `Upload`

## Text-Based Wireframes

### Desktop

```text
+-----------------------------------------------------------------------------------+
| hero / summary cards                                                              |
+-----------------------------------------------------------------------------------+
| filters + actions                                                                 |
+-----------------------------------------------------------------------------------+
| table: thumb | product | permissions | legal | waveform | status | actions       |
+-----------------------------------------------------------------------------------+
| dialogs: large modal with tabs / forms / side-by-side blocks                      |
+-----------------------------------------------------------------------------------+
```

### Tablet

```text
+---------------------------------------------------------------------------+
| hero / summary cards                                                      |
+---------------------------------------------------------------------------+
| filters grid 2 columns + actions wrap                                     |
+---------------------------------------------------------------------------+
| table shell scroll ngang có chủ đích nếu cần                              |
+---------------------------------------------------------------------------+
| dialogs: centered modal, body scroll nội bộ                               |
+---------------------------------------------------------------------------+
```

### Mobile

```text
+---------------------------------------------------+
| hero                                               |
+---------------------------------------------------+
| summary cards                                      |
+---------------------------------------------------+
| filters stacked                                    |
+---------------------------------------------------+
| [thumb] title                                      |
| artist · genres                                    |
| status pill | legal pill                           |
| 3 quyền | waveform available                       |
| updated 2h ago                                     |
| [Xem chi tiết] [Phát hành/Ẩn] [More]               |
+---------------------------------------------------+
| next card                                          |
+---------------------------------------------------+
| pagination footer                                  |
+---------------------------------------------------+

detail/edit/create on mobile:
+---------------------------------------------------+
| sheet header + close                               |
| sticky tabs / segmented sections                   |
| body scroll                                        |
| sticky footer CTA                                  |
+---------------------------------------------------+
```

## Component Structure

### Parent-child map

```text
ProductManagementPage
  ProductManagementHero
  ProductManagementSummaryCards
  ProductManagementFilters
  ProductManagementDesktopTable
  ProductManagementMobileCardList
    ProductManagementMobileCard
      ProductManagementCardHeader
      ProductManagementCardMeta
      ProductManagementCardActions
  ProductManagementDetailDialog
    ProductManagementDetailTabs
    ProductManagementDetailSummary
    ProductManagementLicensingPanel
    ProductManagementCompliancePanel
  ProductManagementCreateDialog
  ProductManagementEditDialog
  ProductManagementUploadDialog
  ProductManagementApprovedPermissionsDialog
```

### Boundary decisions

- Nếu thêm mobile card list trực tiếp trong file page làm file phình thêm, nên tách component mới.
- `table` và `mobile cards` dùng chung source data `rows`, chỉ khác presentation.
- Không tạo store mới cho mobile; dùng lại state hiện có.

## Detailed UI Design

### 1. Mobile card list

- Mỗi card là `rounded-[28px]`, padding `16-20px`, có border nhẹ và nền trắng/đen trong dark mode.
- Header card:
  - thumbnail trái
  - title + artist + genres phải
  - title tối đa 2 dòng
- Status cluster:
  - `publish status` là pill rõ màu
  - `legal status` là pill phụ
- Utility chips:
  - `n quyền`
  - `có waveform` hoặc `chưa có audio`
- Action cluster:
  - primary button: `Chi tiết`
  - secondary inline button: `Ẩn` hoặc `Phát hành`
  - icon menu / more sheet cho action còn lại

### 2. Mobile action model

- Hành động thường dùng nhất:
  - `Xem chi tiết`
  - `Ẩn / Phát hành`
- Hành động thứ cấp:
  - `Approved permissions`
  - `Compliance dashboard`
  - `Chỉnh sửa`
  - `Upload audio`
- Trên mobile không nên render 4-5 nút liền nhau trong card; thay bằng `More actions`.

### 3. Detail dialog / sheet

- Mobile detail dialog hành xử như `sheet`:
  - header cố định
  - `tabs` hoặc segmented control sticky ngay dưới header
  - content cuộn nội bộ
- Tab `Thông tin`:
  - metadata chính
  - waveform preview
  - file/audio availability
- Tab `Quyền & Licensing`:
  - approved permissions hiện tại
  - quyền digital/physical
  - CTA mở dialog quyền nếu cần
- Tab `Đánh giá & Duyệt`:
  - trạng thái compliance
  - shortcut sang compliance detail

### 4. Create / Edit dialog

- Mobile:
  - form chuyển thành 1 cột hoàn toàn
  - chia theo section rõ:
    - thông tin cơ bản
    - genres / use cases
    - media files
    - licensing / compliance shortcuts
  - footer CTA sticky:
    - `Huỷ`
    - `Lưu` hoặc `Tạo`
- Desktop:
  - giữ layout nhiều cột hiện tại

### 5. Upload dialog

- Mobile dùng sheet nhỏ hơn:
  - chọn file
  - trạng thái upload
  - CTA xác nhận
- Nội dung tập trung, tránh text mô tả dài.

### 6. Approved permissions dialog

- Mobile:
  - danh sách quyền dạng stacked rows thay vì phụ thuộc layout quá ngang
  - selected state rõ
  - summary bar hiển thị số quyền đã chọn
- Tablet/Desktop:
  - giữ dialog hiện tại, chỉ polish nếu cần

## Interaction Rules

- `Chi tiết` từ mobile card mở detail sheet.
- `Phát hành/Ẩn` có confirm rõ nhưng ngắn gọn.
- `More actions` mở action sheet/popover với danh sách action phụ.
- Khi vào `Edit` từ mobile:
  - form mở ở section đầu
  - user luôn thấy CTA cuối form
- Khi dialog mở trên mobile:
  - nền bị khóa scroll
  - focus order rõ ràng

## Content Priority

### Highest priority on mobile cards

- `title`
- `artist`
- `publish status`
- `legal status`
- `permissions count`
- primary actions

### Lower priority

- waveform full preview
- thông tin licensing chi tiết
- metadata dài

## Accessibility

- Action menu trên mobile phải có `aria-label`.
- Card actions tối thiểu `44px` chiều cao.
- Pills trạng thái không chỉ dựa vào màu, phải có text.
- Sheet/dialog:
  - focus trap
  - close bằng `Esc`
  - close button rõ ràng
- Contrast theo `WCAG 2.1 AA`.

## Tailwind-Oriented Snippets

### Mobile card shell

```html
<article class="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
  <div class="flex items-start gap-3">
    <div class="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
      <!-- thumbnail -->
    </div>
    <div class="min-w-0 flex-1">
      <h3 class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">Title</h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Artist · Genres</p>
    </div>
  </div>

  <div class="mt-3 flex flex-wrap gap-2">
    <!-- status pills -->
  </div>

  <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
    <!-- utility chips -->
  </div>

  <div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
    <!-- detail / publish / more -->
  </div>
</article>
```

### Mobile sheet dialog

```html
<Dialog
  v-model:visible="visible"
  modal
  class="w-[calc(100vw-0.75rem)] sm:w-[min(1040px,96vw)]"
  :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
>
  <!-- content -->
</Dialog>
```

### Mobile list toggle

```html
<div class="space-y-3 sm:hidden">
  <ProductManagementMobileCard
    v-for="track in rows"
    :key="track.id"
    :track="track"
  />
</div>

<div class="hidden sm:block">
  <!-- existing table -->
</div>
```

## Testing and Validation

- Viewports:
  - `375x812`
  - `390x844`
  - `768x1024`
  - `1024x768`
- Scenarios:
  - list with multiple rows
  - filter + search
  - open detail from mobile card
  - publish / hide from mobile card
  - create dialog on mobile
  - edit dialog on mobile
  - approved permissions dialog on mobile
  - upload dialog on mobile
- Regression guard:
  - desktop table phải giữ được đầy đủ thông tin
  - tablet không mất tốc độ thao tác so với hiện tại

## Out of Scope

- Thay đổi API hoặc data model của `Product`.
- Tối ưu lại `ComplianceManagement` trong cùng spec này.
- Rewrite toàn bộ tablet sang card list.
- Thêm backend support cho action batching.
