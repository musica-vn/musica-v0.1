# Compliance Decision Premium Split Design

## Goal

- Thiết kế lại phần `Đánh giá & Duyệt` trong `ComplianceManagementPage.vue` theo hướng `Premium Split Workspace`.
- Tăng cảm giác cao cấp, chuyên nghiệp, bớt giống một form dialog thô.
- Giúp admin tập trung vào tác vụ chính là cấp quyền sử dụng sản phẩm cho user một cách nhanh, rõ ràng và ít thao tác hơn.
- Giữ phần pháp lý ở vai trò context tham chiếu, không để nó chiếm trọng tâm thị giác.

## Scope

- Chỉ áp dụng cho tab `Đánh giá & Duyệt` trong dialog chi tiết của màn `Pháp lý & Kiểm duyệt`.
- Có thể chỉnh header của dialog nếu việc đó giúp đồng bộ hierarchy với workspace mới.
- Có thể tinh chỉnh footer action của dialog để phù hợp layout mới.
- Có thể tái tổ chức markup, state hiển thị và component con trong `ComplianceManagementPage.vue`.
- Không thay đổi API backend hiện có.
- Không thay đổi payload `submitAdminComplianceDecision`.
- Không thay đổi tab `Hồ sơ & Tài liệu` ngoài các điều chỉnh thị giác tối thiểu để đồng bộ phần header.

## Current Problems

- Phần `Đánh giá & Duyệt` hiện tại thiên về form nhập liệu, chưa tạo cảm giác đây là một workspace ra quyết định.
- `Legal Status` và `Review Status` đang dùng `select`, gây cảm giác chậm và thiếu trực quan.
- Khu chọn quyền đang là danh sách checkbox tương đối phẳng, khó scan nhanh và chưa làm nổi bật trạng thái đã chọn.
- Không có vùng summary cố định cho các quyền đã chọn, khiến người dùng dễ mất ngữ cảnh khi cuộn.
- Context pháp lý, trạng thái hiện tại, ghi chú cũ và hành động mới chưa được phân lớp tốt.
- Footer hiện tại chỉ là 2 nút cơ bản, chưa đủ mạnh để truyền đạt “bạn sắp lưu quyết định gì”.

## Product Intent

- Màn này không phải nơi xử lý nghiệp vụ pháp lý chuyên sâu.
- Luật sư bên ngoài đã lo phần pháp lý; admin nội bộ chủ yếu cần:
  - xem ngữ cảnh đủ dùng
  - xác định trạng thái kiểm duyệt
  - chọn các quyền được cấp
  - lưu quyết định nhanh và tự tin
- Do đó, UI phải ưu tiên:
  - decision clarity
  - permission picking speed
  - premium visual hierarchy

## Chosen Direction

### Premium Split Workspace

- Desktop dùng layout 2 cột rõ ràng:
  - cột trái là `Context Rail`
  - cột phải là `Decision Workspace`
- Cột trái chỉ chứa nội dung để đọc và tham chiếu.
- Cột phải là vùng thao tác chính, ưu tiên diện tích cho chọn trạng thái và cấp quyền.
- Footer hành động dạng `sticky` trong vùng decision để nút lưu luôn trong tầm mắt.

### Why this direction

- Phù hợp mục tiêu “đẹp và cao cấp” hơn `Action-First` vốn dễ bị cảm giác tool-like.
- Vẫn thực dụng hơn `Checklist Flow` vì không bắt user đi từng bước cứng nhắc.
- Tạo cảm giác giống một `admin review studio` thay vì modal form thông thường.

## Information Architecture

### Dialog Header

- Tên sản phẩm
- Nghệ sĩ
- `Product status`
- `Legal status`
- `Review status`
- `Reviewed at`

Header phải cho phép user hiểu nhanh:
- đang xem hồ sơ nào
- hồ sơ đang ở trạng thái nào
- lần review gần nhất là khi nào

### Left Context Rail

- `Current Snapshot`
  - legal status hiện tại
  - review status hiện tại
  - reviewed by
  - reviewed at
- `Previous Note`
  - reject reason cũ nếu có
  - nếu không có thì ẩn block này
- `Current Granted Permissions`
  - danh sách quyền đang được cấp
  - nếu chưa có thì hiển thị empty state gọn
- `Suggested Next Action`
  - khối gợi ý ngắn dựa trên state hiện tại
  - chỉ là rule-based helper text ở FE, không yêu cầu API hay recommendation engine mới
  - ví dụ:
    - `Hồ sơ đang chờ duyệt. Chọn trạng thái và quyền để hoàn tất.`
    - `Hồ sơ từng bị từ chối. Kiểm tra lại lý do trước khi cấp quyền.`

### Right Decision Workspace

- `Decision Selector`
  - legal status selector
  - review status selector
  - hiển thị thành 2 hàng segmented controls riêng biệt, không gộp chung
- `Reason Block`
  - chỉ hiện khi `legalStatus = INSUFFICIENT` hoặc `reviewStatus = REJECTED`
- `Permission Toolbar`
  - search input
  - selected count
  - clear all
  - optional quick filter như `Đã chọn`, `Tất cả`
- `Permission Grid`
  - card-based selection
  - selected state rất rõ
- `Selected Tray`
  - danh sách ngắn các quyền đã chọn
  - sticky gần footer
- `Action Footer`
  - summary
  - secondary action `Đóng`
  - primary action `Lưu quyết định`

## Text-Based Wireframes

### Desktop

```text
+--------------------------------------------------------------------------------------+
| Product title                         Artist · Status chips · Last reviewed          |
+--------------------------------------------------------------------------------------+
| LEFT CONTEXT RAIL                     | RIGHT DECISION WORKSPACE                     |
|---------------------------------------|----------------------------------------------|
| Snapshot                              | Decision Selector                            |
| - Legal status                        | Review: [Pending] [Approved] [Rejected]      |
| - Review status                       | Legal:  [Pending] [Sufficient] [Insufficient]|
| - Reviewed by / at                    |                                              |
|                                       | Reason Block (conditional)                   |
| Previous Note (if any)                | [Textarea appears only when required]        |
| - old reject reason                   |                                              |
|                                       | Permission Toolbar                           |
| Current Granted Permissions           | [Search] [Selected: 3] [Clear all]           |
| - chip list                           |                                              |
|                                       | Permission Grid                              |
| Suggested Next Action                 | [Card] [Card] [Card] [Card]                  |
| - short helper text                   | [Card] [Card] [Card] [Card]                  |
|                                       |                                              |
|                                       | Selected Tray                                |
|                                       | [Permission A] [Permission B] [Permission C] |
|                                       |----------------------------------------------|
|                                       | Sticky Footer                                |
|                                       | 3 quyền sẽ được cấp        [Đóng] [Lưu]      |
+--------------------------------------------------------------------------------------+
```

### Mobile

```text
+----------------------------------------------+
| Product title                                |
| Artist · compact status chips                |
+----------------------------------------------+
| Decision Selector                            |
| [Pending] [Approved] [Rejected]              |
| [Pending] [Sufficient] [Insufficient]        |
+----------------------------------------------+
| Reason Block (conditional)                   |
| [Textarea]                                   |
+----------------------------------------------+
| Accordion: Snapshot                          |
| Accordion: Previous Note                     |
| Accordion: Current Granted Permissions       |
+----------------------------------------------+
| Permission Toolbar                           |
| [Search] [Selected count]                    |
+----------------------------------------------+
| Permission Cards                             |
| [Permission card]                            |
| [Permission card]                            |
| [Permission card]                            |
+----------------------------------------------+
| Sticky Bottom Bar                            |
| 3 quyền đã chọn              [Lưu quyết định]|
+----------------------------------------------+
```

## Component Structure

### Parent-child map

```text
ComplianceManagementPage
  ComplianceDetailDialog
    ComplianceDecisionHeader
    ComplianceDecisionLayout
      ComplianceDecisionContextRail
        ComplianceSnapshotCard
        CompliancePreviousNoteCard
        ComplianceGrantedPermissionsCard
        ComplianceSuggestedActionCard
      ComplianceDecisionWorkspace
        ComplianceStatusSegmentedField
        ComplianceReasonEditor
        CompliancePermissionToolbar
        CompliancePermissionGrid
          CompliancePermissionCard
        ComplianceSelectedPermissionsTray
        ComplianceDecisionFooter
```

### Boundary recommendations

- Nếu file `ComplianceManagementPage.vue` trở nên quá dài, nên tách phần decision thành các component nhỏ theo đúng cây ở trên.
- `Context Rail` và `Decision Workspace` phải có boundary rõ ràng để dễ iterate UI sau này.
- `PermissionCard` nên là component riêng vì đây sẽ là phần có nhiều trạng thái visual nhất.

## Interaction Design

### 1. Status selection

- Thay `select` bằng `segmented buttons`.
- Mỗi lựa chọn là một pill lớn, click trực tiếp.
- Màu sắc:
  - `PENDING`: neutral / slate
  - `APPROVED` hoặc `SUFFICIENT`: emerald
  - `REJECTED` hoặc `INSUFFICIENT`: rose

### 2. Conditional reason

- Khi user chọn trạng thái dẫn đến yêu cầu lý do:
  - block lý do xuất hiện ngay dưới selector
  - có icon cảnh báo nhẹ
  - có nhãn `Bắt buộc`
- Khi user quay lại trạng thái không yêu cầu lý do:
  - block vẫn có thể giữ nội dung tạm trong state
  - nhưng visually collapse đi

### 3. Permission selection

- Mỗi quyền hiển thị dưới dạng card:
  - tên quyền
  - law reference
  - selected state
- Card selected có:
  - border đậm hơn
  - nền tinted
  - icon check hoặc badge `Đã chọn`
- Click toàn card để toggle, không buộc user bấm đúng checkbox nhỏ.

### 4. Selected tray

- Hiển thị các quyền đã chọn dưới dạng chip list.
- Cho phép bỏ chọn nhanh trực tiếp trên chip.
- Luôn hiển thị gần footer để người dùng biết quyết định sắp lưu.

### 5. Save action

- Footer hiển thị summary động:
  - `Chưa chọn quyền nào`
  - `3 quyền sẽ được cấp`
  - `Quyết định từ chối sẽ được lưu`
- Primary button luôn ở vị trí cố định.

## Visual Design System

### Color palette

- `Background page/dialog`: `slate-950`, `white`, `slate-50`
- `Primary accent`: `violet-600`
- `Primary hover`: `violet-500`
- `Info accent`: `sky-500`
- `Success`: `emerald-600`
- `Warning`: `amber-500`
- `Danger`: `rose-600`
- `Neutral text`: `slate-700`, `slate-500`, `slate-300`

### Surface rules

- Main workspace cards:
  - `rounded-3xl`
  - subtle border
  - soft shadow
- Context rail cards:
  - calmer contrast
  - less saturated than action area
- Decision workspace:
  - highest visual emphasis
  - more white space
  - stronger selected states

### Typography

- Page/dialog title: `text-xl` to `text-2xl`, `font-semibold`
- Section label: `text-[11px] uppercase tracking-[0.18em]`
- Field label: `text-xs font-semibold`
- Card title: `text-sm font-semibold`
- Supporting text: `text-xs text-slate-500`

### Spacing system

- Base spacing: `4px`
- Major layout gaps:
  - `16px`
  - `20px`
  - `24px`
- Card padding:
  - desktop `20px`
  - mobile `16px`
- Section stack rhythm:
  - `space-y-4`
  - `space-y-5`
  - `space-y-6`

## Responsive Behavior

### Mobile `<640px`

- Chuyển toàn bộ layout sang một cột.
- Context rail biến thành accordion hoặc stacked cards.
- Footer hành động chuyển thành sticky bottom bar.
- Permission grid thành 1 cột full-width.
- Selected tray rút gọn thành count + expandable chips.

### Tablet `640-1023px`

- Vẫn ưu tiên 1 cột chính nhưng chia section rõ hơn.
- Context cards có thể nằm trên decision workspace.
- Permission grid 2 cột nếu đủ rộng.

### Desktop `>=1024px`

- Dùng 2 cột:
  - trái `320-360px`
  - phải `minmax(0, 1fr)`
- Footer sticky trong workspace.
- Permission grid 2 cột hoặc 3 cột tùy bề ngang thực tế.

## Accessibility

- Tất cả text phải đạt WCAG 2.1 AA, tối thiểu `4.5:1` cho nội dung chính.
- `Segmented controls` phải dùng semantics cho keyboard navigation.
- `Permission cards` vẫn cần checkbox/input thực cho screen reader, dù click toàn card.
- Focus ring rõ ràng với `focus-visible`.
- Không chỉ dựa vào màu để biểu đạt selected state; cần thêm icon hoặc label `Đã chọn`.
- Sticky footer không được che nội dung cuối danh sách; cần thêm bottom padding tương ứng.

## Tailwind-Oriented Implementation Notes

### Workspace shell

```html
<section class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
  <aside class="space-y-4">
    <!-- context rail cards -->
  </aside>
  <div class="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
    <!-- decision workspace -->
  </div>
</section>
```

### Segmented control

```html
<div class="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
  <button class="rounded-xl px-3 py-2 text-sm font-semibold transition data-[active=true]:bg-white data-[active=true]:text-violet-700 data-[active=true]:shadow-sm">
    Approved
  </button>
</div>
```

### Permission card

```html
<button
  class="group rounded-2xl border px-4 py-4 text-left transition"
  :class="isSelected
    ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm dark:bg-violet-950/25 dark:text-violet-100'
    : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/40'"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <div class="text-sm font-semibold">{{ permission.name }}</div>
      <div class="mt-1 text-xs text-slate-500">{{ permission.lawReference }}</div>
    </div>
    <span v-if="isSelected" class="rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white">
      Da chon
    </span>
  </div>
</button>
```

### Sticky action footer

```html
<div class="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
  <div class="text-sm text-slate-600 dark:text-slate-300">
    3 quyen se duoc cap
  </div>
  <div class="flex gap-2">
    <button class="rounded-2xl border px-4 py-2.5 text-sm font-semibold">Dong</button>
    <button class="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Luu quyet dinh</button>
  </div>
</div>
```

## Content and Wording

### Replace raw English labels

- `Legal Status` -> `Trạng thái hồ sơ`
- `Review Status` -> `Kết quả kiểm duyệt`
- `Approved permissions` -> `Quyền sẽ được cấp`
- `Reject reason` -> `Lý do từ chối`
- `Save decision` -> `Lưu quyết định`

### Microcopy principles

- Ngắn, rõ, thiên hành động.
- Tránh ngôn ngữ pháp lý quá nặng trong phần decision workspace.
- Ưu tiên ngôn ngữ giúp admin tự tin ra quyết định.

## Implementation Constraints

- Phải tương thích với state và API hiện tại:
  - `legalStatus`
  - `reviewStatus`
  - `approvedPermissionIds`
  - `rejectReason`
- Không đổi contract response/request.
- Không thêm dependency UI mới nếu Tailwind + Vue + PrimeVue hiện tại đã đủ.

## Verification

- Tab `Đánh giá & Duyệt` nhìn như một workspace rõ ràng, không còn cảm giác form thô.
- User có thể hiểu trạng thái hiện tại trong vòng vài giây đầu tiên.
- User có thể chọn quyền nhanh hơn nhờ card-based selection.
- Footer luôn hiển thị summary quyết định và CTA chính.
- Mobile vẫn dùng được, không có vùng bấm quá nhỏ.
- Màu selected / focus / danger đủ rõ ở cả light mode và dark mode.
