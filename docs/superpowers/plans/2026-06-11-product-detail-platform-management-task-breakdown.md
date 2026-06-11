# Task Breakdown: product detail và quản lý nền tảng số

## Tài liệu liên quan

- [Implementation plan](./2026-06-11-product-detail-platform-management-plan.md)
- [Technical spec](./2026-06-11-product-detail-platform-management-technical-spec.md)

## Mục tiêu

Tài liệu này tách kế hoạch lớn thành các task nhỏ, có thể giao cho developer/QA thực hiện theo thứ tự, với dependency rõ ràng và acceptance criteria cụ thể.

## Nguyên tắc phân rã

- Task đủ nhỏ để implement trong 0.5-2 ngày
- Mỗi task có đầu ra cụ thể
- Không trộn lẫn refactor UI lớn với thay đổi data model nặng trong cùng 1 task nếu không cần thiết
- Ưu tiên làm theo 2 đợt rollout:
  - Đợt 1: tách list/detail và dời flow hiện có
  - Đợt 2: thêm `Quản lý nền tảng số` và pricing override

## Nhóm A: Discovery và thiết kế

### A1. Rà current-state của module products

- Mô tả:
  - đọc lại `ProductManagementView.vue`, router, products service, pricing service, licensing config management
- Output:
  - danh sách các concern đang bị dồn vào 1 view
  - danh sách API đang được dùng
- Dependency: không có
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - có inventory rõ ràng cho UI, API, data types và flows bị ảnh hưởng

### A2. Chốt route map mới

- Mô tả:
  - xác định route list/detail/section
- Output:
  - route map chuẩn cho FE
- Dependency: A1
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - route mới rõ ràng và không xung đột với route admin hiện có

### A3. Chốt data model cho platform settings

- Mô tả:
  - xác định schema `product_digital_platform_settings`
- Output:
  - schema proposal và rule backfill
- Dependency: A1
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - model thể hiện được product-level override theo `digital_right_config`

### A4. Chốt pricing precedence rule

- Mô tả:
  - xác định rõ override > global default
- Output:
  - rule được ghi vào spec và plan
- Dependency: A3
- Ước lượng: `0.25 ngày`
- Acceptance criteria:
  - không còn mơ hồ giữa global config và product config

## Nhóm B: Database và backend foundation

### B1. Tạo migration bảng platform settings

- Mô tả:
  - thêm bảng, unique key, constraints, indexes
- Output:
  - 1 file migration mới
- Dependency: A3
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - migration chạy được trên môi trường local/staging

### B2. Viết backfill dữ liệu sản phẩm cũ

- Mô tả:
  - tạo row mặc định cho mọi product hiện có dựa trên `digital_right_configs`
- Output:
  - SQL backfill hoặc migration backfill
- Dependency: B1
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - tất cả products hiện hữu đều có platform rows mặc định

### B3. Auto-seed khi tạo product mới

- Mô tả:
  - cập nhật `ProductsService.createProduct()` để tạo sẵn các row platform settings
- Output:
  - logic seed mặc định sau khi tạo product
- Dependency: B1
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - product mới tạo luôn có đủ platform rows

### B4. Tạo DTO và endpoint đọc platform settings

- Mô tả:
  - thêm `GET /admin/products/:productId/platform-settings`
- Output:
  - DTO request/response + Swagger + controller/service
- Dependency: B1
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - API trả đúng envelope và data group theo platform/duration

### B5. Tạo DTO và endpoint cập nhật platform settings

- Mô tả:
  - thêm `PUT /admin/products/:productId/platform-settings`
- Output:
  - DTO request/response + controller/service validation
- Dependency: B4
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - save thành công với batch rows hợp lệ
  - trả lỗi rõ ràng khi config sai hoặc multiplier không hợp lệ

### B6. Cập nhật pricing engine hỗ trợ override

- Mô tả:
  - thêm bước resolve effective multiplier ở flow pricing số
- Output:
  - service logic mới trong pricing
- Dependency: B5
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - có override thì dùng override
  - không có override thì dùng global base multiplier

### B7. Viết test backend cho migration và service

- Mô tả:
  - test đọc/ghi platform settings và pricing precedence
- Output:
  - test coverage tập trung cho thay đổi mới
- Dependency: B2, B5, B6
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - pass các case chuẩn và case lỗi chính

## Nhóm C: Frontend routing và layout refactor

### C1. Tách `ProductManagementView` thành list view

- Mô tả:
  - giữ lại list/search/filter/pagination/create
  - bỏ logic detail dialog khỏi view này
- Output:
  - `ProductListView.vue`
- Dependency: A2
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - list page hoạt động đúng như trước cho phần overview

### C2. Tạo `ProductDetailView.vue`

- Mô tả:
  - tạo shell cho detail page
- Output:
  - load product by route
  - header/breadcrumb/back action
- Dependency: C1
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - mở được detail theo URL trực tiếp

### C3. Cập nhật router

- Mô tả:
  - thêm route detail + section routes
- Output:
  - router mới
- Dependency: A2, C2
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - route hoạt động và active state đúng

### C4. Tạo sidebar detail

- Mô tả:
  - tạo component sidebar responsive
- Output:
  - menu 3 mục
- Dependency: C2
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - chuyển section được trên desktop/tablet/mobile

### C5. Giữ query state giữa list và detail

- Mô tả:
  - preserve `page`, `sort`, `filter`
- Output:
  - back navigation đúng ngữ cảnh
- Dependency: C1, C3
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - quay lại list không mất bộ lọc trước đó

## Nhóm D: Di chuyển flow hiện có sang detail page

### D1. Tạo `ProductGeneralSection`

- Mô tả:
  - di chuyển metadata form và asset actions
- Output:
  - component section thông tin chung
- Dependency: C2, C4
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - update metadata, upload assets, publish/hide vẫn chạy đúng

### D2. Tạo `ProductRightsLicenseSection`

- Mô tả:
  - di chuyển compliance summary, allowed permissions, package actions
- Output:
  - component section quyền và license
- Dependency: C2, C4
- Ước lượng: `1.5 ngày`
- Acceptance criteria:
  - allowed permissions flow và package flow giữ nguyên behavior

### D3. Gỡ detail dialog cũ khỏi list page

- Mô tả:
  - remove dead states, handlers, imports không còn dùng
- Output:
  - list page gọn hơn
- Dependency: D1, D2
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - không còn đường đi cũ phụ thuộc dialog detail

### D4. Kiểm thử regression đợt 1

- Mô tả:
  - test list/detail/create/update/upload/publish/permissions
- Output:
  - checklist regression đợt 1
- Dependency: D3
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - không có blocker cho đợt 1

## Nhóm E: Quản lý nền tảng số

### E1. Tạo types và service FE cho platform settings

- Mô tả:
  - thêm types mới trong `products.types.ts`
  - thêm API service read/write
- Output:
  - typed contracts cho section nền tảng
- Dependency: B4, B5
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - FE service gọi đúng API mới

### E2. Tạo `ProductPlatformsSection`

- Mô tả:
  - shell UI cho quản lý nền tảng số
- Output:
  - dropdown nền tảng + summary area
- Dependency: C2, C4, E1
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - section render được dữ liệu `YouTube`

### E3. Tạo bảng duration rows

- Mô tả:
  - render rows theo `digital_right_configs.duration_type`
- Output:
  - `ProductPlatformDurationTable.vue`
- Dependency: E2
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - mỗi row hiển thị đúng global multiplier, override và effective value

### E4. Thêm form editing multiplier

- Mô tả:
  - cho user sửa hệ số giá từng row
- Output:
  - inline form hoặc batch form save
- Dependency: E3
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - validate UI rõ ràng
  - save phản hồi thành công/lỗi đúng

### E5. UX polish cho section nền tảng

- Mô tả:
  - loading, empty, saving, retry, dirty state
- Output:
  - UX hoàn chỉnh
- Dependency: E4
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - người dùng hiểu rõ mình đang sửa global hay product-specific config

### E6. Kiểm thử regression đợt 2

- Mô tả:
  - test platform settings và pricing override
- Output:
  - checklist regression đợt 2
- Dependency: E5, B6
- Ước lượng: `1 ngày`
- Acceptance criteria:
  - pricing override hoạt động đúng và không phá luồng cũ

## Nhóm F: Responsive và release readiness

### F1. Responsive pass cho detail page

- Mô tả:
  - chỉnh layout desktop/tablet/mobile
- Output:
  - responsive behavior ổn định
- Dependency: D2, E5
- Ước lượng: `0.75 ngày`
- Acceptance criteria:
  - không vỡ layout ở viewport mục tiêu

### F2. Staging verification

- Mô tả:
  - chạy migration, backfill và smoke test trên staging
- Output:
  - báo cáo verify staging
- Dependency: B7, E6, F1
- Ước lượng: `0.5 ngày`
- Acceptance criteria:
  - dữ liệu đúng, flow chính pass

### F3. Production rollout checklist

- Mô tả:
  - chuẩn bị trình tự rollout và rollback
- Output:
  - checklist release
- Dependency: F2
- Ước lượng: `0.25 ngày`
- Acceptance criteria:
  - team có thể rollout có kiểm soát

## Dependency Map

- A1 -> A2, A3
- A3 -> A4, B1
- B1 -> B2, B3, B4
- B4 -> B5
- B5 -> B6, E1
- B2 + B5 + B6 -> B7
- A2 -> C1, C3
- C1 -> C2, C5
- C2 -> C4, D1, D2, E2
- C3 -> C5
- D1 + D2 -> D3
- D3 -> D4
- E1 + E2 -> E3
- E3 -> E4
- E4 -> E5
- E5 + B6 -> E6
- D2 + E5 -> F1
- B7 + E6 + F1 -> F2
- F2 -> F3

## Phân kỳ triển khai khuyến nghị

### Đợt 1

Bao gồm:

- A1-A4
- C1-C5
- D1-D4

Mục tiêu:

- có product detail page hoàn chỉnh cho flow hiện có

### Đợt 2

Bao gồm:

- B1-B7
- E1-E6
- F1-F3

Mục tiêu:

- có `Quản lý nền tảng số` + pricing override + release readiness

## Acceptance Criteria tổng hợp

- List page chỉ còn overview và điều hướng
- Detail page là nơi duy nhất cho edit sâu
- Có đủ 3 section trên detail page
- Không có add/delete platform ở product level
- `YouTube` là platform duy nhất ở giai đoạn đầu
- Mọi product có platform rows mặc định
- Product-level pricing override lưu được và tính đúng
- Không regression compliance, permissions, publish, package eligibility
- Responsive pass trên desktop/tablet/mobile

## Kết luận

Task breakdown này cho phép đội triển khai song song nhưng vẫn có dependency rõ ràng:

- FE có thể bắt đầu route/layout sau khi chốt route map
- BE có thể làm migration/API độc lập
- QA có checkpoint riêng cho từng đợt rollout
