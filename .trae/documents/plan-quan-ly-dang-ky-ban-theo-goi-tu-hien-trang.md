# Kế hoạch phát triển tính năng quản lý sản phẩm đăng ký bán theo gói

## Summary
- Mục tiêu: phát triển tính năng để sản phẩm có thể `đăng ký tham gia gói bán` khi đủ điều kiện pháp lý/quyền, đồng thời cho phép quản lý trạng thái tham gia đó từ khu vực `quản lý nền tảng` hiện có.
- Hướng triển khai bám trên hiện trạng:
  - dùng `digital_right_configs` và `physical_right_configs` hiện có như `package definition`
  - tái sử dụng `eligibility engine` đang có trong `products.service.ts`
  - bổ sung lớp `registration persistence` để phân biệt `đủ điều kiện` với `đã tham gia`
  - mở rộng cả `Admin flow` và `Creator/Artist flow`

## Current State Analysis

### Các phần đã có trong repo
- Route hiện tại chỉ có 2 vùng:
  - `admin` ở [index.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/router/index.ts#L22-L79)
  - `landing` cho non-admin ở [index.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/router/index.ts#L19-L21)
- Admin đã có màn:
  - `Quản lý sản phẩm` tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)
  - `Quyền nền tảng số` và `Quyền sử dụng vật lý` tại [LicensingConfigManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue)
- Tài liệu hiện mô tả `Product Management` dành cho cả `Admin / Creator` và gắn chặt với `Allowed Core Permissions` sau pháp lý ở [Tài liệu đặc tả tính năng admin library V2.0.txt](file:///c:/Users/LHP02/Desktop/musica-v0.1/T%C3%A0i%20li%E1%BB%87u%20%C4%91%E1%BA%B7c%20t%E1%BA%A3%20t%C3%ADnh%20n%C4%83ng%20admin%20library%20V2.0.txt#L188-L246)

### Logic nghiệp vụ đã có sẵn để tái sử dụng
- `Digital` và `Physical rights configs` đã mang bản chất của một `gói`:
  - có `status`
  - có `referencedPermissionIds`
  - có `basePriceMultiplier`
- `ProductsService` hiện đã tính `eligibility` theo rule:
  - `Referenced Permissions ⊆ Allowed Core Permissions`
  - nếu thiếu thì trả `missingPermissions`
  - xem tại [products.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/products/products.service.ts#L214-L343)
- `ProductManagementPage` hiện đã hiển thị `Digital / Physical` package candidates theo `Đủ điều kiện / Không đủ điều kiện`, nhưng mới là `computed preview`, chưa có `join/unjoin` tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L1868-L1954)
- `LicensingConfigManagementPage` hiện chỉ CRUD package definitions, chưa xem được sản phẩm nào đã tham gia package nào tại [LicensingConfigManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue#L872-L947)

### Khoảng trống hiện tại
- Chưa có bảng DB lưu quan hệ:
  - `product -> digital package joined`
  - `product -> physical package joined`
- Chưa có API `join`, `unjoin`, `list joined packages`, `list joined products per package`
- Chưa có self-service UI cho `Artist/Creator`; `LandingPage` hiện mới là trang placeholder đơn giản
- Chưa có trạng thái nghiệp vụ rõ cho:
  - `ELIGIBLE`
  - `INELIGIBLE`
  - `JOINED`
  - `JOINED_BUT_PACKAGE_INACTIVE` ở tầng hiển thị

## Proposed Changes

### 1. Database và persistence cho package registrations

#### File dự kiến
- `apps/api/supabase/migrations/<new_migration>.sql`

#### Thay đổi
- Thêm 2 bảng mới:
  - `product_digital_right_registrations`
  - `product_physical_right_registrations`
- Cấu trúc tối thiểu cho mỗi bảng:
  - `id` UUID PK
  - `product_id` FK -> `products.id`
  - `right_config_id` FK -> `digital_right_configs.id` hoặc `physical_right_configs.id`
  - `status` enum/text theo pha đầu: `JOINED`, `REMOVED`
  - `joined_at`
  - `joined_by`
  - `removed_at`
  - `removed_by`
  - `created_at`
  - `updated_at`
- Thêm unique constraint cho cặp `(product_id, right_config_id, status active-equivalent)` để ngăn join trùng logic.
- Thêm trigger `set_updated_at()` theo pattern migration hiện có trong repo.

#### Lý do
- `Eligibility` hiện chỉ là `computed`.
- Tính năng mới cần biết sản phẩm `đã tham gia gói hay chưa`, nên bắt buộc phải có persistence riêng.

### 2. Backend module riêng cho registrations

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

#### Thay đổi
- Tạo module riêng thay vì dồn logic mới vào `ProductsService`.
- Service này chịu trách nhiệm:
  - kiểm tra quyền sở hữu product
  - kiểm tra package `ACTIVE`
  - kiểm tra product `ELIGIBLE`
  - tạo registration
  - gỡ registration
  - liệt kê joined products theo package
- `ProductsService` chỉ giữ vai trò enrich product response bằng:
  - `eligibility state`
  - `registration state`

### 3. Rules nghiệp vụ backend

#### Join package
- Chỉ cho phép `join` khi đồng thời thỏa:
  - product tồn tại
  - package tồn tại
  - package đang `ACTIVE`
  - product có `allowedPermissionIds`
  - product đang `ELIGIBLE` với package
  - product chưa có registration active với package đó

#### Chặn join
- Trả lỗi business rõ ràng nếu:
  - package `INACTIVE`
  - product không thuộc creator đang thao tác
  - product thiếu quyền pháp lý tương thích
  - product chưa có `Allowed Core Permissions`
  - package đã được join trước đó

#### Unjoin
- Không xóa cứng.
- Chuyển registration sang `REMOVED` và giữ audit fields để admin theo dõi.

#### Package inactive sau khi đã join
- Không tự động xóa registration cũ.
- API/detail/list phải phản ánh rõ:
  - package hiện `INACTIVE`
  - nhưng product từng `JOINED`

### 4. Mở rộng Product DTO và product response

#### File dự kiến cập nhật
- `apps/api/src/products/product.dto.ts`
- `apps/api/src/products/products.service.ts`
- `apps/web/src/features/products/products.types.ts`

#### Thay đổi
- Mở rộng `ProductDto` để mỗi config trong `licensingEligibility` có thêm:
  - `registrationStatus`
  - `registrationId`
  - `joinedAt`
  - `joinedBy`
- Hoặc nếu muốn tách bạch hơn trong implementation, thêm trường song song:
  - `digitalPackageRegistrations`
  - `physicalPackageRegistrations`
  - và summary:
    - `eligibleDigitalCount`
    - `joinedDigitalCount`
    - `eligiblePhysicalCount`
    - `joinedPhysicalCount`
- Khuyến nghị implementation:
  - giữ `licensingEligibility` là nơi FE đang dùng
  - mở rộng trực tiếp từng config với registration state để FE ít phải refactor hơn

### 5. Admin APIs

#### File dự kiến tạo/cập nhật
- `apps/api/src/product-package-registrations/admin-product-package-registrations.controller.ts`
- có thể bổ sung một phần endpoint vào `admin-products.controller.ts` nếu cần giữ nhóm route gần `product`

#### APIs cần có
- `POST /admin/products/:productId/digital-right-registrations`
- `DELETE /admin/products/:productId/digital-right-registrations/:registrationId`
- `POST /admin/products/:productId/physical-right-registrations`
- `DELETE /admin/products/:productId/physical-right-registrations/:registrationId`
- `GET /admin/digital-right-configs/:configId/products`
- `GET /admin/physical-right-configs/:configId/products`

#### Mục đích
- Admin có thể thao tác thay creator nếu cần.
- Admin có thể quản lý sản phẩm đã tham gia trực tiếp từ phần `quản lý nền tảng`.

### 6. Creator APIs

#### File dự kiến tạo mới
- `apps/api/src/product-package-registrations/creator-product-package-registrations.controller.ts`

#### APIs cần có
- `GET /creator/products`
- `GET /creator/products/:productId`
- `POST /creator/products/:productId/digital-right-registrations`
- `DELETE /creator/products/:productId/digital-right-registrations/:registrationId`
- `POST /creator/products/:productId/physical-right-registrations`
- `DELETE /creator/products/:productId/physical-right-registrations/:registrationId`

#### Ownership rule
- Chỉ cho creator thao tác trên `products.artist_id === auth.user.userId`.
- Vì repo hiện đã có `artist_id` trên product và auth JWT có `userId`, rule này khả thi ngay với hiện trạng.

### 7. Admin UI trong Product Management

#### File dự kiến cập nhật
- `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- `apps/web/src/features/products/products.api.ts`
- `apps/web/src/features/products/products.types.ts`

#### Thay đổi
- Nâng block `Matching Digital / Physical Rights` hiện có thành block có hành động:
  - `ELIGIBLE` + chưa join -> nút `Đăng ký tham gia`
  - `INELIGIBLE` -> disable + hiển thị thiếu quyền
  - `JOINED` -> badge `Đã đăng ký` + nút `Gỡ khỏi gói`
  - package inactive nhưng từng join -> badge `Đã tham gia / Gói tạm ngừng`
- Giữ UX gọn:
  - summary ngoài list
  - CTA đặt trong detail dialog như hiện tại

### 8. Admin UI trong Quản lý nền tảng

#### File dự kiến cập nhật
- `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
- `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- nếu cần, tách component:
  - `apps/web/src/features/licensing-configs/components/JoinedProductsPanel.vue`

#### Thay đổi
- Thêm khả năng xem theo từng package:
  - số sản phẩm `đủ điều kiện`
  - số sản phẩm `đã tham gia`
  - danh sách sản phẩm đã tham gia
- Ưu tiên UI dạng dialog/drawer chi tiết theo package, không đổ hết vào table list để tránh rối.
- Cho phép admin `gỡ khỏi gói` từ khu vực này.

### 9. Creator self-service UI

#### File dự kiến cập nhật/tạo mới
- `apps/web/src/router/index.ts`
- `apps/web/src/features/landing/pages/LandingPage.vue`
- có thể tạo thêm:
  - `apps/web/src/features/creator-products/creator-products.api.ts`
  - `apps/web/src/features/creator-products/creator-products.types.ts`
  - `apps/web/src/features/creator-products/components/*`

#### Thay đổi
- Vì repo chưa có creator shell riêng, pha đầu nên tận dụng `LandingPage` làm điểm vào self-service.
- Tối thiểu cần có:
  - danh sách sản phẩm của creator
  - detail sản phẩm
  - section `Digital Packages`
  - section `Physical Packages`
  - CTA `Đăng ký tham gia` / `Gỡ khỏi gói`
- Trạng thái hiển thị cần rõ:
  - `Đủ điều kiện`
  - `Không đủ điều kiện`
  - `Đã đăng ký`
  - `Gói tạm ngừng`

### 10. Contract sync và generated types

#### File dự kiến cập nhật/generated
- `apps/api/openapi.json`
- `apps/web/src/shared/api/generated/schema.d.ts`

#### Thay đổi
- Sau khi thêm APIs/DTOs:
  - build API
  - generate OpenAPI
  - generate FE types
  - typecheck FE/BE

## Assumptions & Decisions
- `Digital` và `Physical` đều nằm trong scope vì repo hiện đã có cả 2 package families và eligibility engine cho cả 2.
- `Expression` và `Modification` chưa nằm trong scope `đăng ký bán theo gói` ở pha này.
- `Eligibility` tiếp tục là computed runtime; `Registration` là persistence mới.
- `Creator self-service` sẽ dùng `LandingPage` làm entry tạm ở pha đầu thay vì dựng hẳn shell mới, vì đây là phần ít rủi ro nhất theo hiện trạng router hiện có.
- `Admin` vẫn là actor vận hành chính và có quyền thao tác thay creator.
- Không thay đổi workflow `Compliance -> Approved Permissions -> Allowed Core Permissions` hiện có; registration chỉ được mở downstream sau bước này.
- Không thay đổi response envelope chuẩn của API.

## Verification Steps
- Database:
  - migration apply thành công
  - FK/unique/index hoạt động đúng
  - trigger `updated_at` hoạt động
- Backend:
  - `join` package hợp lệ trả success
  - `join` package khi `INELIGIBLE` trả lỗi business rõ
  - `join` package khi package `INACTIVE` bị chặn
  - creator không thể join product không thuộc mình
  - `unjoin` đổi trạng thái đúng và giữ audit
- Frontend admin:
  - `Product Management` hiển thị đúng `Eligible / Ineligible / Joined`
  - admin join/unjoin được từ product detail
  - `LicensingConfigManagement` xem được danh sách sản phẩm đã tham gia theo package
- Frontend creator:
  - creator thấy đúng sản phẩm của mình
  - chỉ package đủ điều kiện mới enable CTA
  - reload vẫn giữ đúng trạng thái `Đã đăng ký`
- Contract:
  - `apps/api build`
  - `apps/api gen:openapi`
  - `apps/web gen:types`
  - `apps/api typecheck`
  - `apps/web typecheck`

## Suggested Execution Order
1. Tạo migration cho registration tables.
2. Tạo backend registration module và business rules.
3. Enrich `ProductDto`/product response với registration state.
4. Thêm admin APIs và nối vào `Product Management`.
5. Thêm admin view theo package trong `LicensingConfigManagement`.
6. Thêm creator APIs.
7. Mở rộng `LandingPage` thành self-service UI tối thiểu cho creator.
8. Regenerate OpenAPI/types và chạy verification end-to-end.
