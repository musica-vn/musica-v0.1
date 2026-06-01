# Kế hoạch phát triển tính năng quản lý sản phẩm đăng ký bán theo gói

## Summary
- Mục tiêu: phát triển tính năng để `Creator/Artist` có thể đăng ký sản phẩm vào các gói bán phù hợp khi sản phẩm đủ điều kiện, đồng thời `Admin` quản lý toàn bộ vòng đời gói và trạng thái tham gia từ khu vực quản lý nền tảng hiện có.
- Phạm vi đã chốt:
  - Có cả `admin vận hành` và `creator self-service`
  - Hỗ trợ cả `Digital Platform Rights` và `Physical Usage Rights`
- Hướng triển khai: tái sử dụng `licensing configs` hiện có làm “package definition”, tái sử dụng `eligibility engine` đang có trong product để xác định `Eligible/Ineligible`, sau đó bổ sung lớp `joined package persistence`, APIs cho admin/creator và UI tương ứng.

## Current State Analysis

### Kiến trúc và màn hiện có
- FE hiện chỉ có 2 vùng chính:
  - `admin` routes trong [index.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/router/index.ts#L22-L79)
  - `landing` page sau login trong [index.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/router/index.ts#L19-L21)
- Chưa có route/page riêng cho `Creator/Artist` để tự quản lý sản phẩm hay tự `Join Package`.
- `Admin` hiện có:
  - quản lý `products` ở [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)
  - quản lý `digital/physical rights configs` ở [LicensingConfigManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue)

### Domain model và nghiệp vụ đã có
- `Digital/Physical rights configs` đã hoạt động như `package definition`:
  - có `title`, `status`, `referencedPermissionIds`, `basePriceMultiplier`
  - digital có thêm `targetPlatform`, `durationType`
  - physical có thêm `venueUsageType`
- `products` đã có `allowedPermissionIds` được quản lý gián tiếp từ `Compliance`.
- `eligibility` đã được tính động trong [products.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/products/products.service.ts#L214-L343):
  - package `ELIGIBLE` khi `referencedPermissions ⊆ allowedPermissionIds`
  - package `INELIGIBLE` khi thiếu quyền, kèm `missingPermissions`
- Admin product detail hiện đã hiển thị matching `Digital / Physical Rights`, nhưng mới là `computed preview`, chưa có thao tác `join`.

### Khoảng trống cần bổ sung
- Chưa có bảng DB lưu quan hệ `product <-> package`.
- Chưa có API để `join`, `unjoin`, `list joined packages`, `review join state`.
- Chưa có trạng thái nghiệp vụ tách biệt giữa:
  - `Eligible`
  - `Ineligible`
  - `Joined`
  - trạng thái package bị `INACTIVE` sau khi đã join
- Chưa có creator UI cho self-service.
- Chưa có admin UI trong phần `quản lý nền tảng` để xem sản phẩm nào đã tham gia gói nào.

## Proposed Changes

### 1. Database và data model

#### File dự kiến
- `apps/api/supabase/migrations/<new_migration>.sql`

#### Thay đổi
- Thêm 2 bảng join riêng để bám đúng domain hiện tại, tránh generic hóa quá sớm:
  - `product_digital_right_registrations`
  - `product_physical_right_registrations`
- Mỗi bảng nên có tối thiểu:
  - `id` UUID PK
  - `product_id` FK -> `products.id`
  - `right_config_id` FK -> `digital_right_configs.id` hoặc `physical_right_configs.id`
  - `status` với giá trị ban đầu đề xuất: `JOINED`, `REMOVED`
  - `joined_at`
  - `joined_by`
  - `removed_at`
  - `removed_by`
  - `created_at`
  - `updated_at`
- Thêm unique active constraint theo cặp `(product_id, right_config_id)` để ngăn join trùng.
- Thêm index cho:
  - `product_id`
  - `right_config_id`
  - `status`

#### Lý do
- `Digital` và `Physical` đang có model package độc lập; tách bảng join giúp tận dụng FK/constraint rõ ràng, không cần polymorphic relation phức tạp ở pha đầu.
- Cần persistence để phân biệt `đủ điều kiện` với `đã đăng ký`.

### 2. Backend: product-package registration domain

#### File dự kiến tạo mới
- `apps/api/src/product-package-registrations/product-package-registrations.module.ts`
- `apps/api/src/product-package-registrations/product-package-registrations.service.ts`
- `apps/api/src/product-package-registrations/product-package-registrations.dto.ts`
- `apps/api/src/product-package-registrations/product-package-registrations.swagger.ts`
- `apps/api/src/product-package-registrations/admin-product-package-registrations.controller.ts`
- `apps/api/src/product-package-registrations/creator-product-package-registrations.controller.ts`

#### File dự kiến cập nhật
- `apps/api/src/app.module.ts`
- `apps/api/src/products/product.dto.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/openapi.ts`

#### Thay đổi
- Tách domain service riêng thay vì nhồi thêm vào `ProductsService`.
- Bổ sung DTO/response để trả về:
  - package metadata
  - `eligibilityStatus`
  - `registrationStatus`
  - `missingPermissions`
  - thông tin audit `joinedAt`, `joinedBy`
- Mở rộng `ProductDto` để trả thêm:
  - `digitalPackageRegistrations`
  - `physicalPackageRegistrations`
  - summary counts mới, ví dụ:
    - `eligibleDigitalCount`
    - `joinedDigitalCount`
    - `eligiblePhysicalCount`
    - `joinedPhysicalCount`
- Tách rõ 2 khái niệm trong response:
  - `eligibility` là computed theo permission
  - `registration` là persisted state

#### Rules backend cần khóa cứng
- Chỉ cho `join` khi:
  - product có `allowedPermissionIds` hợp lệ
  - package đang `ACTIVE`
  - package đang `ELIGIBLE` với product
  - product chưa join package đó
- Chặn `join` nếu:
  - product `INELIGIBLE`
  - package `INACTIVE`
  - product chưa qua legal/compliance để có allowed permissions
- Cho `unjoin/remove` với package đã join.
- Khi package chuyển sang `INACTIVE`, bản ghi registration cũ không tự xóa; API/list phải phản ánh là `joined nhưng package inactive`, để admin vẫn audit được.

### 3. Backend APIs cho admin và creator

#### Admin APIs
- Mục tiêu: quản lý và quan sát từ phần `quản lý nền tảng`.
- Dự kiến:
  - `GET /admin/digital-right-configs/:id/products`
  - `GET /admin/physical-right-configs/:id/products`
  - `POST /admin/products/:productId/digital-right-registrations`
  - `DELETE /admin/products/:productId/digital-right-registrations/:registrationId`
  - `POST /admin/products/:productId/physical-right-registrations`
  - `DELETE /admin/products/:productId/physical-right-registrations/:registrationId`
- Ý nghĩa:
  - admin có thể xem package nào đang có sản phẩm tham gia
  - admin có thể thao tác thay creator nếu cần vận hành

#### Creator APIs
- Vì repo chưa có creator product module riêng, cần thêm API tối thiểu cho self-service:
  - `GET /creator/products`
  - `GET /creator/products/:productId`
  - `POST /creator/products/:productId/digital-right-registrations`
  - `DELETE /creator/products/:productId/digital-right-registrations/:registrationId`
  - `POST /creator/products/:productId/physical-right-registrations`
  - `DELETE /creator/products/:productId/physical-right-registrations/:registrationId`
- Tất cả creator APIs phải giới hạn product theo `artist_id === auth.user.id` hoặc mapping user context tương ứng đang dùng trong hệ thống auth.

#### Lưu ý tương thích
- Giữ nguyên envelope theo `@musica/contracts`.
- Sau khi thêm APIs phải regenerate:
  - `apps/api/openapi.json`
  - `apps/web/src/shared/api/generated/schema.d.ts`

### 4. Backend: tích hợp vào Product Management hiện có

#### File dự kiến cập nhật
- `apps/api/src/products/products.service.ts`
- `apps/api/src/products/product.dto.ts`
- `apps/api/src/products/admin-products.controller.ts`

#### Thay đổi
- Admin `list/detail product` vẫn giữ eligibility hiện có, nhưng bổ sung registration state để UI không chỉ thấy `Đủ điều kiện/Không đủ điều kiện` mà còn thấy `Đã đăng ký`.
- Nếu cần gọn dữ liệu list page, chỉ trả summary ở list; detail mới trả registrations đầy đủ.
- Tái sử dụng logic matcher hiện tại, không viết engine mới.

### 5. Admin UI: quản lý từ phần quản lý nền tảng

#### File dự kiến cập nhật
- `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
- `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- Có thể tách component mới nếu block UI lớn:
  - `apps/web/src/features/licensing-configs/components/PackageJoinedProductsPanel.vue`

#### Thay đổi
- Trong `Digital/Physical Rights Management`, thêm khả năng xem sản phẩm đang gắn với từng package:
  - tab/panel `Sản phẩm đủ điều kiện`
  - tab/panel `Sản phẩm đã tham gia`
- Tối thiểu mỗi package detail nên thấy:
  - số sản phẩm `eligible`
  - số sản phẩm `joined`
  - danh sách sản phẩm đã join
  - trạng thái package `ACTIVE/INACTIVE`
- Cho phép admin thao tác `gỡ khỏi gói` từ đây nếu cần.
- Không nên nhét toàn bộ product picker vào list card; ưu tiên drawer/dialog detail để tránh rối page settings hiện tại.

### 6. Admin UI: quản lý từ Product Management

#### File dự kiến cập nhật
- `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- `apps/web/src/features/products/products.api.ts`
- `apps/web/src/features/products/products.types.ts`

#### Thay đổi
- Mở rộng block matching hiện có thành block hành động thực sự:
  - package `ELIGIBLE` + chưa join -> hiện `Đăng ký tham gia`
  - package `INELIGIBLE` -> disable button + hiện lý do thiếu quyền
  - package đã join -> hiện badge `Đã đăng ký` + action `Gỡ khỏi gói`
- Giữ UI gọn:
  - summary trên list page
  - thao tác chi tiết trong detail dialog
- Tránh đưa thêm helper text dài; chỉ hiển thị trạng thái và CTA rõ ràng.

### 7. Creator UI: self-service tối thiểu

#### File dự kiến tạo mới
- `apps/web/src/features/creator-shell/` hoặc nếu muốn tối thiểu hóa, trước mắt mở rộng:
  - `apps/web/src/features/landing/pages/LandingPage.vue`
- Dự kiến thêm API/types:
  - `apps/web/src/features/creator-products/creator-products.api.ts`
  - `apps/web/src/features/creator-products/creator-products.types.ts`
- Dự kiến route cập nhật:
  - `apps/web/src/router/index.ts`

#### Thay đổi
- Vì hiện không có creator area, pha đầu nên tạo trải nghiệm self-service tối thiểu:
  - route/list sản phẩm của creator
  - detail sản phẩm
  - block `Digital Packages` và `Physical Packages`
  - CTA `Đăng ký tham gia` hoặc `Gỡ khỏi gói`
- Nếu muốn giảm khối lượng ở pha 1, có thể dùng `LandingPage` làm entry tạm cho creator thay vì dựng hẳn shell mới; tuy nhiên executor chỉ nên dùng cách này nếu sau khi đọc `LandingPage.vue` thấy cấu trúc đủ nhẹ để mở rộng mà không phá UX hiện tại.
- UI creator phải phản ánh rõ:
  - `Đủ điều kiện`
  - `Không đủ điều kiện`
  - `Đã đăng ký`
  - `Gói tạm ngừng`

### 8. Authorization và ownership

#### File dự kiến cập nhật
- `apps/api/src/common/auth/*`
- `apps/api/src/auth/*`
- các controller mới của creator/admin

#### Thay đổi
- Admin giữ quyền quản lý toàn hệ thống như hiện tại.
- Creator chỉ được thao tác trên sản phẩm của chính mình.
- Cần chuẩn hóa reuse helper lấy `auth user context` để tránh lặp logic phân quyền giữa admin và creator controllers.

### 9. OpenAPI, FE generated types và contract sync

#### File dự kiến cập nhật/generated
- `apps/api/openapi.json`
- `apps/web/src/shared/api/generated/schema.d.ts`

#### Thay đổi
- Sau khi hoàn tất backend APIs/DTOs, chạy quy trình chuẩn của repo:
  - build API
  - generate OpenAPI
  - generate FE types
  - typecheck FE/BE

## Assumptions & Decisions
- Dùng `digital_right_configs` và `physical_right_configs` hiện có làm source of truth cho package definition; không tạo package domain mới.
- `Eligibility` tiếp tục là `computed`, không lưu xuống DB.
- `Registration` là persisted state mới, tách riêng khỏi `eligibility`.
- Pha này hỗ trợ cả `admin thao tác thay` và `creator tự thao tác`.
- Pha này hỗ trợ cả `Digital` và `Physical`.
- `Expression` và `Modification` chưa nằm trong scope đăng ký gói ở pha này, vì matcher hiện tại và tài liệu bạn nhắc tới đang tập trung vào digital/physical.
- Không đổi workflow legal/compliance hiện có; registration chỉ là downstream sau khi product đã có `allowed permissions`.
- Không đổi format response envelope của API.

## Verification Steps
- DB:
  - migration apply thành công
  - unique/index/FK hoạt động đúng
- Backend:
  - `join` package hợp lệ trả success
  - `join` package khi `INELIGIBLE` trả lỗi business rõ ràng
  - `join` package khi package `INACTIVE` bị chặn
  - `unjoin` hoạt động và audit fields cập nhật đúng
  - creator không thể thao tác product không thuộc mình
- Frontend admin:
  - `Product Management` hiển thị đúng `Eligible / Ineligible / Joined`
  - `LicensingConfigManagement` xem được danh sách joined products theo package
  - admin có thể join/unjoin mà không cần rời flow
- Frontend creator:
  - creator thấy đúng danh sách product của mình
  - chỉ package đủ điều kiện mới enable CTA
  - package đã join hiển thị trạng thái ổn định sau reload
- Contract/build:
  - `apps/api build`
  - `apps/api gen:openapi`
  - `apps/web gen:types`
  - `apps/api typecheck`
  - `apps/web typecheck`

## Suggested Execution Order
1. Tạo migration cho registration tables.
2. Tạo backend module `product-package-registrations`.
3. Mở rộng `ProductDto` và `ProductsService` để trả registration state kèm eligibility.
4. Bổ sung admin APIs và wiring vào admin pages.
5. Bổ sung creator APIs.
6. Tạo creator UI self-service tối thiểu.
7. Regenerate OpenAPI/types.
8. Chạy verification end-to-end.
