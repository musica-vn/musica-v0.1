# Kế hoạch triển khai chi tiết: tái cấu trúc quản lý sản phẩm và nền tảng số

## Tài liệu liên quan

- [Technical spec](./2026-06-11-product-detail-platform-management-technical-spec.md)
- [Task breakdown](./2026-06-11-product-detail-platform-management-task-breakdown.md)

## Mục tiêu

Tài liệu này mô tả kế hoạch triển khai chi tiết cho thay đổi chức năng `Quản lý sản phẩm (products)` theo các yêu cầu sau:

- Di chuyển các thao tác quản lý sản phẩm từ trang danh sách chung sang trang chi tiết sản phẩm.
- Tạo trang chi tiết sản phẩm có `sidebar` chuyên dụng với 3 mục:
  - `Thông tin chung`
  - `Quyền và License`
  - `Quản lý nền tảng số`
- Chuẩn hóa luồng `Quản lý nền tảng số` theo hướng:
  - không cho thêm/xóa nền tảng ở cấp sản phẩm
  - chỉ cho xem và sửa hệ số giá theo từng nền tảng được hệ thống hỗ trợ
  - gắn mặc định dữ liệu nền tảng cho mọi sản phẩm
  - tái sử dụng duration logic hiện có để quản lý thời gian thuê
- Đảm bảo UI responsive, đồng bộ dữ liệu an toàn với database, kiểm thử đầy đủ trước production, và giữ trải nghiệm chuyển trang mượt mà.

## Phạm vi và giả định đã chốt

- Giai đoạn này chỉ hỗ trợ cố định `YouTube`.
- Kiến trúc phải mở sẵn để sau này thêm `TikTok`, `Facebook` hoặc nền tảng khác mà không cần refactor lớn.
- Thời gian thuê không tạo taxonomy mới, mà tái sử dụng `duration_type` đang có trong `digital_right_configs`.
- Trang `/admin/products` sẽ giữ vai trò:
  - list
  - search/filter/sort/pagination
  - tạo mới sản phẩm
  - điều hướng sang trang chi tiết
- Mọi thao tác chỉnh sửa sâu sẽ được dồn về trang chi tiết sản phẩm.

## Current-state liên quan

- Frontend hiện chỉ có route `/admin/products` trong `apps/web/src/router/index.ts`.
- `ProductManagementView.vue` hiện đang ôm cả:
  - list
  - create/edit
  - detail dialog
  - allowed permissions
  - package registrations
  - upload asset
- Pricing hiện lấy `base_price_multiplier` từ `digital_right_configs` và `physical_right_configs` trong `apps/api/src/modules/pricing/variant-pricing.service.ts`.
- Hệ thống đã có:
  - product detail endpoint
  - update product endpoint
  - allowed permissions flow
  - compliance flow
  - digital/physical package registrations
- Chưa có lớp dữ liệu riêng để lưu `platform-specific price override` ở cấp sản phẩm.

## Feature Breakdown

### 1. Tái cấu trúc Information Architecture của module Products

- Tách trang danh sách và trang chi tiết sản phẩm.
- Trang danh sách chỉ còn nhiệm vụ điều hướng và quản lý overview.
- Trang chi tiết trở thành nơi thao tác chính cho mọi chỉnh sửa nghiệp vụ.

### 2. Trang chi tiết sản phẩm với sidebar 3 mục

- `Thông tin chung`
  - metadata
  - thumbnail
  - audio
  - sheet music
  - publish/hide
- `Quyền và License`
  - compliance status
  - approved permissions
  - allowed permissions
  - package eligibility
  - package registrations
- `Quản lý nền tảng số`
  - dropdown nền tảng
  - hiện tại chỉ có `YouTube`
  - chọn 1 cấu hình hệ thống áp dụng cho bài hát
  - chọn `dùng giá hệ thống` hoặc `dùng giá riêng cho bài hát`
  - trường nhập hệ số giá riêng chỉ bật khi chọn `giá riêng`

### 3. Product-level platform pricing configuration

- Mỗi bài hát chỉ có 1 cấu hình nền tảng được chọn cho mỗi nền tảng hỗ trợ.
- Bài hát có 2 chế độ giá:
  - `GLOBAL`: dùng giá chuẩn từ cấu hình hệ thống đã chọn
  - `CUSTOM`: dùng hệ số giá riêng của bài hát
- Cấu hình hệ thống vẫn là nguồn chuẩn của hệ thống; màn trong bài hát chỉ chọn cấu hình áp dụng và quyết định có override giá hay không.

### 4. Áp dụng cấu hình nền tảng cho sản phẩm

- Người dùng không thêm/xóa nền tảng ở product detail.
- Người dùng chọn 1 cấu hình hệ thống đang `ACTIVE` cho nền tảng tương ứng.
- Nếu chưa chọn cấu hình, bài hát được xem là chưa cấu hình giá nền tảng riêng ở module này.

### 5. Điều chỉnh logic quản lý nền tảng

- Giữ `settings/digital-rights` như nơi quản lý `global defaults`.
- Product detail là nơi chỉnh `per-product override`.
- UI phải phân biệt rõ:
  - `Cấu hình hệ thống`
  - `Cấu hình riêng của sản phẩm`

### 6. Shared notification system cho admin workspace

- Tạo một `notification center` dùng chung ở cấp ứng dụng thay cho việc mỗi view tự render `Message` cục bộ cho success/error chính.
- Notification phải hỗ trợ:
  - `success`
  - `error`
  - `warning`
  - `info`
- Notification phải tương thích với cả `light theme` và `dark theme`.
- Giai đoạn đầu sẽ demo trước trong `product detail workspace`.
- Sau khi được duyệt, hệ thống sẽ rollout sang:
  - products list
  - compliance
  - licensing configs
  - core permissions
  - certificates
  - admin/users views

## Technical Specifications

### 1. Routing và navigation

Đề xuất route mới:

- `/admin/products`
- `/admin/products/:productId`
- `/admin/products/:productId/general`
- `/admin/products/:productId/rights-license`
- `/admin/products/:productId/platforms`

Nguyên tắc:

- `/admin/products/:productId` redirect về `general`
- giữ `query params` của trang list để hỗ trợ quay lại đúng ngữ cảnh
- active sidebar state lấy từ route

### 2. Đề xuất cấu trúc frontend

Tạo hoặc tách thành các file sau:

- `apps/web/src/views/admin/ProductListView.vue`
- `apps/web/src/views/admin/ProductDetailView.vue`
- `apps/web/src/components/features/products/detail/ProductDetailSidebar.vue`
- `apps/web/src/components/features/products/detail/ProductGeneralSection.vue`
- `apps/web/src/components/features/products/detail/ProductRightsLicenseSection.vue`
- `apps/web/src/components/features/products/detail/ProductPlatformsSection.vue`
- `apps/web/src/components/features/products/detail/ProductPlatformDurationTable.vue`

Nguyên tắc thiết kế:

- mỗi section là 1 component độc lập
- tránh để `ProductDetailView.vue` trở thành file khổng lồ như current-state
- tách rõ data loading, presentation, form submission và feedback state

### 3. Đề xuất cấu trúc backend

Giữ thay đổi trong `ProductsModule` để giảm blast radius:

- mở rộng `apps/api/src/modules/products/products.service.ts`
- thêm DTO đọc/ghi cho platform settings
- thêm helper/service nội bộ xử lý `product platform settings`

Đề xuất endpoint:

- `GET /admin/products/:productId/platform-settings`
- `PUT /admin/products/:productId/platform-settings`

Hoặc nếu muốn payload detail đầy đủ hơn:

- mở rộng `GET /admin/products/:productId` để trả thêm `platformSettings`

Khuyến nghị:

- dùng endpoint riêng cho `platform-settings` để tách concern và giảm kích thước payload detail tổng.

### 4. Đề xuất data model

Tạo bảng mới:

- `product_platform_pricing_configs`

Đề xuất cột:

- `id uuid primary key`
- `product_id uuid not null references products(id) on delete cascade`
- `platform_key text not null`
- `digital_right_config_id uuid null references digital_right_configs(id) on delete set null`
- `pricing_mode text not null check in ('GLOBAL', 'CUSTOM')`
- `custom_price_multiplier numeric(12,4) null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `updated_by uuid references users(id) on delete set null`

Ràng buộc:

- unique `(product_id, platform_key)`
- `custom_price_multiplier is null or custom_price_multiplier > 0`

Lý do chọn mô hình này:

- phản ánh đúng rule nghiệp vụ `1 bài hát / 1 cấu hình áp dụng / 1 chế độ giá`
- vẫn tái sử dụng `digital_right_configs` làm cấu hình chuẩn của hệ thống
- đơn giản hóa UI và pricing resolution ở cấp bài hát

### 5. Logic đọc/ghi dữ liệu nền tảng

Luồng đọc:

1. Lấy toàn bộ `digital_right_configs` đang `ACTIVE` cho nền tảng được hỗ trợ.
2. Lấy bản ghi cấu hình hiện tại của bài hát từ `product_platform_pricing_configs`.
3. Trả về:
   - danh sách cấu hình hệ thống có thể chọn
   - cấu hình hệ thống đang được chọn của bài hát
   - chế độ giá hiện tại `GLOBAL/CUSTOM`
   - giá riêng nếu có

Luồng ghi:

1. User chọn `YouTube`.
2. User chọn 1 cấu hình hệ thống cho bài hát.
3. User chọn `Dùng giá hệ thống` hoặc `Dùng giá riêng`.
4. Nếu chọn `Dùng giá riêng`, user nhập `customPriceMultiplier`.
5. FE gửi 1 payload cấu hình duy nhất cho nền tảng đó.
6. Backend validate:
   - product tồn tại
   - config được chọn tồn tại và `ACTIVE`
   - config thuộc đúng nền tảng
   - nếu `CUSTOM` thì giá riêng phải hợp lệ
7. Backend upsert dữ liệu và ghi `updated_by`.

### 6. Pricing resolution

Rule đề xuất:

1. Nếu có `product_digital_platform_settings.price_multiplier_override` thì ưu tiên dùng giá này.
2. Nếu không có override thì fallback về `digital_right_configs.base_price_multiplier`.
3. Các modifier khác trong pricing engine giữ nguyên.

Tác động:

- pricing engine cần thêm bước resolve effective platform multiplier trước khi tính tổng giá
- không thay đổi logic modifier `subject`, `duration`, `scope`, `expression`, `modification`

### 7. Responsive design

Desktop:

- sidebar trái cố định
- content panel phải

Tablet:

- sidebar thu gọn hoặc chuyển sang segmented menu ngang

Mobile:

- sidebar đổi thành stacked tabs hoặc dropdown navigation
- section content ưu tiên hiển thị tuần tự

Nguyên tắc:

- không dùng dialog lớn cho product detail nữa
- tránh nested scroll phức tạp
- section phải có loading skeleton riêng

### 8. UX continuity

Để đảm bảo chuyển trang mượt:

- khi click từ list vào detail phải giữ:
  - `page`
  - `pageSize`
  - `keyword`
  - `sort`
  - `status`
  - `genre`
- trên detail có:
  - breadcrumb
  - nút quay lại danh sách
  - hiển thị trạng thái save rõ ràng
- save xong không redirect khỏi section hiện tại

## Task List

### Nhóm 1: Discovery và contract

1. Rà current-state của `products`, `pricing`, `licensing configs`, `router`, `types`.
2. Chốt payload shape cho `platformSettings`.
3. Chốt rule precedence giữa `global base multiplier` và `product override`.
4. Chốt naming chính thức cho section `Quản lý nền tảng số`.

Ước lượng:

- `1-2 ngày`

### Nhóm 2: Database và migration

1. Tạo migration cho bảng `product_digital_platform_settings`.
2. Viết backfill cho tất cả sản phẩm hiện có.
3. Đảm bảo sản phẩm mới tự được seed bản ghi mặc định.
4. Tạo unique index và validation constraint.

Ước lượng:

- `1-2 ngày`

### Nhóm 3: Backend foundation

1. Thêm DTO đọc `platform settings`.
2. Thêm DTO cập nhật `platform settings`.
3. Thêm endpoint read/write ở `admin/products`.
4. Thêm service logic upsert.
5. Thêm seed logic khi tạo product mới.
6. Cập nhật pricing engine để hỗ trợ override.

Ước lượng:

- `2-3 ngày`

### Nhóm 4: Frontend routing và layout

1. Tạo `ProductListView.vue`.
2. Tạo `ProductDetailView.vue`.
3. Cập nhật `router/index.ts`.
4. Chuyển `/admin/products` thành trang list nhẹ hơn.
5. Thêm sidebar detail page và active state theo route.

Ước lượng:

- `2-3 ngày`

### Nhóm 5: Di chuyển nghiệp vụ sang trang detail

1. Di chuyển `Thông tin chung`.
2. Di chuyển `Quyền và License`.
3. Loại bỏ detail dialog cũ.
4. Giữ create flow riêng trên list page.
5. Đảm bảo publish/hide/upload vẫn hoạt động như hiện tại.

Ước lượng:

- `2-3 ngày`

### Nhóm 6: Xây section Quản lý nền tảng số

1. Tạo UI dropdown nền tảng.
2. Hiển thị `YouTube` là lựa chọn cố định giai đoạn đầu.
3. Hiển thị duration rows từ `digital_right_configs`.
4. Tạo trường nhập `price multiplier` cho từng row.
5. Hiển thị trạng thái loading, empty, saving, error rõ ràng.

Ước lượng:

- `2 ngày`

### Nhóm 7: QA, regression và rollout

1. Viết test cho migration và backend services.
2. Kiểm thử pricing override.
3. Kiểm thử responsive.
4. Kiểm thử điều hướng từ list sang detail và quay lại.
5. Chạy regression cho:
   - create product
   - update product
   - compliance
   - allowed permissions
   - package registrations
   - publish/hide

Ước lượng:

- `2-3 ngày`

### Nhóm 8: Shared notification rollout

1. Tạo `AppNotificationCenter` mount ở root app.
2. Tạo composable/store dùng chung để push notification từ mọi view.
3. Chuẩn hóa API:
   - `success(message, title?)`
   - `error(message, title?)`
   - `warning(message, title?)`
   - `info(message, title?)`
4. Demo trước ở `product detail workspace`.
5. Thay thế dần các `Message` cục bộ cho feedback success/error ở các admin views còn lại.
6. Giữ lại `inline message` chỉ cho các case cần ngữ cảnh cục bộ:
   - validation trong dialog
   - loading hint trong section
   - empty state / draft notice

Ước lượng:

- `1-2 ngày`

## Development Phases

### Phase 1: Discovery & Contract Freeze

Mục tiêu:

- chốt contract trước khi đụng vào migration và UI lớn

Deliverables:

- route map mới
- payload `platformSettings`
- schema proposal
- fallback rule cho pricing

Exit criteria:

- team thống nhất được data model và endpoint shape

### Phase 2: Backend & Database Foundation

Mục tiêu:

- có schema và API nền tảng đủ ổn định để FE build lên

Deliverables:

- migration mới
- backfill script
- read/write API cho `platform settings`
- pricing engine hỗ trợ override

Exit criteria:

- API trả đúng envelope
- dữ liệu sản phẩm cũ có platform defaults
- backend test pass

### Phase 3: Frontend Navigation Refactor

Mục tiêu:

- tách list page và detail page, bỏ phụ thuộc vào dialog detail

Deliverables:

- route detail mới
- list page mới
- detail layout mới

Exit criteria:

- user vào detail từ list và quay lại không mất filter context

### Phase 4: Section Migration

Mục tiêu:

- dời nghiệp vụ cũ sang detail page mà không phá business rules hiện tại

Deliverables:

- section `Thông tin chung`
- section `Quyền và License`
- remove detail dialog cũ

Exit criteria:

- create/update/publish/permissions hoạt động như trước

### Phase 5: Platform Management Rollout

Mục tiêu:

- đưa `Quản lý nền tảng số` vào vận hành thực tế

Deliverables:

- section `Quản lý nền tảng số`
- dropdown `YouTube`
- duration-based price override

Exit criteria:

- mọi sản phẩm đọc/ghi được `platform settings`
- pricing engine phản ánh override đúng

### Phase 6: QA & Production Readiness

Mục tiêu:

- xác nhận hệ thống ổn định trước rollout

Deliverables:

- test report
- regression checklist
- migration verification checklist

Exit criteria:

- không còn blocker ở create/edit/detail/pricing/publish/navigation

### Phase 7: Shared Notification Adoption

Mục tiêu:

- thống nhất trải nghiệm thông báo trên toàn bộ admin workspace

Deliverables:

- `AppNotificationCenter`
- composable/store thông báo dùng chung
- rollout pass đầu tiên ở `product detail workspace`
- migration checklist cho các admin views còn lại

Exit criteria:

- product detail không còn phụ thuộc vào `success/error Message` cục bộ cho feedback chính
- pattern dùng chung đủ ổn định để rollout tiếp sang các module khác

## Acceptance Criteria

- `/admin/products` chỉ còn list + tìm kiếm + lọc + tạo mới + điều hướng sang detail.
- Không còn detail dialog lớn trên trang list.
- Trang detail có đúng 3 mục:
  - `Thông tin chung`
  - `Quyền và License`
  - `Quản lý nền tảng số`
- Mọi thao tác chỉnh sửa sâu của sản phẩm đều thực hiện tại detail page.
- Section `Quyền và License` giữ nguyên rule compliance/allowed permissions hiện tại.
- Section `Quản lý nền tảng số` không cho thêm/xóa nền tảng.
- Giai đoạn này chỉ hiển thị `YouTube`.
- Mỗi sản phẩm đều có dữ liệu nền tảng mặc định sau migration.
- Hệ số giá riêng theo sản phẩm lưu thành công xuống database.
- Pricing engine ưu tiên product override nếu có, fallback về global config nếu không có.
- Điều hướng từ list sang detail và quay lại giữ được ngữ cảnh người dùng.
- UI hoạt động tốt trên desktop, tablet và mobile.
- Product detail dùng `notification center` chung cho feedback success/error chính.
- Notification dùng chung hoạt động đúng trên cả `light` và `dark theme`.

## Risk Analysis

### 1. Lẫn lộn giữa global config và product override

- Mức độ: Cao
- Tác động: dễ sửa nhầm nguồn dữ liệu, pricing sai
- Giảm thiểu:
  - ghi rõ precedence rule trong spec
  - tách UI wording thành `Cấu hình hệ thống` và `Cấu hình riêng của sản phẩm`
  - thêm test cho pricing resolution

### 2. Migration/backfill thiếu dữ liệu cho sản phẩm cũ

- Mức độ: Cao
- Tác động: detail page lỗi hoặc pricing thiếu dữ liệu
- Giảm thiểu:
  - migration additive
  - backfill script riêng
  - checklist verify số lượng record sau migrate

### 3. Regression do refactor UI lớn

- Mức độ: Cao
- Tác động: hỏng flow create/edit/publish/compliance
- Giảm thiểu:
  - rollout theo 2 đợt
  - giữ backend business rules nguyên trạng
  - tăng regression test cho flows quan trọng

### 4. Performance của detail page

- Mức độ: Trung bình
- Tác động: load chậm, UX xấu trên mobile
- Giảm thiểu:
  - lazy-load section
  - skeleton loading
  - chỉ refetch section vừa save

### 5. Hardcode YouTube không đúng cách

- Mức độ: Trung bình
- Tác động: sau này mở rộng sang nền tảng khác phải sửa nhiều chỗ
- Giảm thiểu:
  - dùng shared platform registry
  - không hardcode rải rác trong component và service

### 6. Mơ hồ về thời gian thuê

- Mức độ: Trung bình
- Tác động: scope creep sang custom duration editor
- Giảm thiểu:
  - khóa phạm vi là reuse `duration_type` hiện có
  - không tạo input thời gian thuê tự do trong giai đoạn này

### 7. Rollout notification không đồng nhất

- Mức độ: Trung bình
- Tác động: trải nghiệm feedback giữa các màn hình bị lệch, chỗ dùng global notification chỗ vẫn dùng inline message
- Giảm thiểu:
  - chốt rõ guideline khi nào dùng global notification, khi nào giữ inline message
  - rollout theo từng view thay vì thay ồ ạt
  - demo và duyệt trước tại `product detail workspace`

## Chiến lược rollout được khuyến nghị

### Đợt 1: Refactor trải nghiệm quản lý sản phẩm

Phạm vi:

- tách list/detail
- tạo detail page
- di chuyển `Thông tin chung`
- di chuyển `Quyền và License`
- bỏ detail dialog cũ

Lợi ích:

- giảm độ phức tạp của trang list
- cải thiện khả năng mở rộng cho các section mới
- giảm rủi ro vì chưa đụng mạnh vào pricing layer

### Đợt 2: Triển khai Quản lý nền tảng số

Phạm vi:

- migration dữ liệu
- backend API cho `platform settings`
- UI `Quản lý nền tảng số`
- product-level pricing override
- regression và rollout

Lợi ích:

- tách riêng thay đổi data model khỏi refactor UI lớn
- dễ kiểm soát rủi ro và rollback hơn

## Kế hoạch kiểm thử

### Backend

- Test migration tạo bảng mới thành công.
- Test backfill đủ record cho toàn bộ products hiện có.
- Test `GET/PUT platform-settings`.
- Test validation multiplier.
- Test pricing fallback:
  - có override
  - không có override

### Frontend

- Test điều hướng list -> detail -> back.
- Test hiển thị đúng 3 section.
- Test save thành công ở từng section.
- Test loading/error/empty states.
- Test `notification center` hiển thị đúng cho success/error chính.
- Test responsive:
  - mobile
  - tablet
  - desktop

### Regression nghiệp vụ

- Create product
- Update product
- Upload thumbnail/audio/sheet music
- Compliance review
- Allowed permissions
- Package eligibility
- Join/remove package
- Publish/hide

## Checklist trước production

- [ ] Migration đã chạy thành công trên staging
- [ ] Backfill đủ dữ liệu cho sản phẩm cũ
- [ ] API mới đúng envelope chuẩn
- [ ] FE detail page không còn phụ thuộc dialog cũ
- [ ] Pricing override hoạt động đúng
- [ ] Responsive pass trên viewport mục tiêu
- [ ] Regression test pass
- [ ] Có rollback plan nếu migration hoặc pricing gặp lỗi

## Kết luận

Hướng triển khai phù hợp nhất cho yêu cầu này là:

1. Tách `list page` và `detail page` trước.
2. Dồn toàn bộ thao tác sâu về `detail page`.
3. Dùng `digital_right_configs` hiện có làm nền cho quản lý nền tảng số.
4. Bổ sung lớp `product-level override` thay vì cho thêm/xóa nền tảng thủ công.
5. Rollout theo 2 đợt để giảm rủi ro kỹ thuật và regression.

Đây là hướng cân bằng tốt nhất giữa:

- phạm vi business đã yêu cầu
- current-state hiện tại của codebase
- khả năng mở rộng về sau
- độ an toàn khi triển khai production
