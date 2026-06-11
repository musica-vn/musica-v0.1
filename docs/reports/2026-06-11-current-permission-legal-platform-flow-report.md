# Báo cáo current-state: luồng quyền và pháp lý của nền tảng

## Mục tiêu

Tài liệu này tổng hợp current-state của nền tảng ở góc nhìn `permissions`, `legal/compliance`, `products`, `licensing configs`, `package registrations`, `pricing`, `auth/roles` và `certificates`.

Phạm vi của báo cáo:

- Mô tả luồng đã implement thực tế trong codebase hiện tại.
- Chỉ ra source of truth cho từng lớp quyền.
- Xác định các gate nghiệp vụ đang chi phối `publish` và `package eligibility`.
- Đối chiếu giữa docs/migrations và behavior thực tế của backend/frontend.
- Ghi nhận rủi ro, khoảng trống và các điểm legacy còn tồn tại.

## Feature Breakdown

### 1. Auth và role gate

- Xác thực đăng nhập qua `users`, password được verify bằng `bcryptjs`, sau đó phát JWT.
- Runtime auth hiện tại chủ yếu dựa trên `primary role`, tức role đầu tiên của user.
- Authorization được thực thi bằng `JwtAuthGuard` và `RolesGuard`.
- `RolesGuard` so sánh `user.roleName` với role yêu cầu, nên multi-role trong data model chưa được khai thác đầy đủ ở runtime.

Ý nghĩa nghiệp vụ:

- Đây là lớp gate truy cập chức năng admin/creator.
- Chưa phải lớp xác định quyền bán bản quyền của product.

### 2. Core permissions

- `core_permissions` là nguồn quyền gốc của hệ thống.
- Mỗi quyền được quản lý như một business entity độc lập: `code`, `name`, `law_reference`, `status`.
- Tất cả luồng nghiệp vụ chọn quyền đều phải lấy từ tập `ACTIVE`.
- Hệ thống chặn `INACTIVE` hoặc `delete` nếu quyền đang được tham chiếu ở:
  - `track_allowed_permissions`
  - `compliance_approved_permissions`
  - `digital_right_config_permissions`
  - `physical_right_config_permissions`
  - `expression_config_permissions`
  - `modification_config_permissions`

Ý nghĩa nghiệp vụ:

- Đây là source of truth cho mọi quyền pháp lý/có thể kinh doanh trong hệ thống.
- Tất cả các lớp quyền phía sau chỉ là tập con, tập duyệt hoặc tập tham chiếu sinh ra từ `core_permissions`.

### 3. Compliance và legal review

- Mỗi `product` khi tạo sẽ được sinh sẵn 1 bản ghi `compliance_reviews` 1-1.
- Admin/reviewer upload hồ sơ pháp lý lên storage bucket legal files.
- Metadata file được lưu ưu tiên ở `compliance_legal_files`; hệ thống vẫn đọc fallback từ `uploaded_legal_files` để tương thích legacy.
- Reviewer submit:
  - `legal_status`
  - `review_status`
  - `reject_reason` khi `INSUFFICIENT` hoặc `REJECTED`
  - `approvedPermissionIds`
- Backend validate:
  - reviewer tồn tại và `ACTIVE`
  - `approvedPermissionIds` phải thuộc `core_permissions` đang `ACTIVE`

Ý nghĩa nghiệp vụ:

- Compliance là bước đánh giá hồ sơ và cấp tập quyền tối đa về mặt pháp lý.
- Compliance chưa phải bước quyết định tập quyền bán cuối cùng của product.

### 4. Product permission selection

- Product là product core hiện tại của hệ thống; schema đã đổi tên từ `tracks` sang `products`, nhưng naming legacy vẫn còn trong một số API/service.
- Product có `allowedPermissionIds` lưu ở `track_allowed_permissions`.
- Admin chỉ được set `allowedPermissionIds` khi compliance đạt `SUFFICIENT + APPROVED`.
- Admin chỉ được chọn quyền nằm trong tập `compliance_approved_permissions`.
- Đây là bước chọn subset quyền bán cuối cùng của product, tách riêng với compliance decision.

Ý nghĩa nghiệp vụ:

- `approved permissions` = tập quyền tối đa về mặt pháp lý.
- `allowed permissions` = tập quyền được đưa ra kinh doanh thực tế trên nền tảng.

### 5. Licensing configs

- Hệ thống có 4 nhóm config:
  - `digital_right_configs`
  - `physical_right_configs`
  - `expression_configs`
  - `modification_configs`
- `digital` và `physical` giữ vai trò package/config chính cho quyền khai thác.
- `expression` và `modification` giữ vai trò dependency config, có thể bổ sung thêm `required permissions` khi modifier được bật.
- `Required permissions` của 1 package được tính theo công thức:
  - `basePermissions`
  - cộng thêm `expressionPermissions` nếu có modifier `EXPRESSION`
  - cộng thêm `modificationPermissions` nếu có modifier `MODIFICATION`
- Hệ thống dedupe quyền để tạo `effectiveReferencedPermissions`.

Ý nghĩa nghiệp vụ:

- Licensing configs không cấp quyền trực tiếp cho product.
- Licensing configs định nghĩa package thương mại, `required permissions` và rule để tính `eligibility/pricing`.

### 6. Product package registrations

- Product có thể join `digital` package hoặc `physical` package qua module registrations.
- Khi join package, backend validate:
  - config phải `ACTIVE`
  - product phải có `allowedPermissionIds`
  - product phải đủ quyền để cover `requiredPermissions` của package
  - creator phải có quyền sở hữu/quản lý product nếu đi qua creator flow
- Nếu thiếu quyền, hệ thống trả `PACKAGE_ELIGIBILITY_FAILED`.

Ý nghĩa nghiệp vụ:

- Registration là bước đưa product vào package kinh doanh cụ thể.
- Registration không đồng nghĩa với `publish`.

### 7. Pricing

- Pricing engine lấy `base multiplier` từ digital/physical config.
- Sau đó cộng các `price modifiers` theo `subject`, `duration`, `scope`, `expression`, `modification`.
- Digital flow có thêm `DIGITAL_TOTAL_RATE = 0.1`.

Ý nghĩa nghiệp vụ:

- Pricing đã bắt đầu phụ thuộc vào licensing layer.
- Luồng mua/license certificate cuối cùng chưa thấy được sự orchestration đầy đủ với product/compliance flow mới trong phần đã implement hiện tại.

### 8. Certificates

- Module `certificates` vẫn vận hành trên domain cũ:
  - `track_id`
  - `buyer_id`
  - `artist_id`
  - `selected_usage_rights`
- Có list/detail/template/render/download flow riêng.
- Chưa thấy liên kết mới ở mức orchestration với:
  - `allowed permissions`
  - `compliance approved permissions`
  - `digital/physical package registrations`

Ý nghĩa nghiệp vụ:

- Certificate domain hiện tại là một legacy island từ giai đoạn MVP cũ.
- Chưa phản ánh đầy đủ mô hình `product + core_permissions + compliance + licensing`.

## Technical Specifications

### 1. Kiến trúc module hiện tại

Backend đang vận hành theo `modular monolith` với các module chính:

- `AuthModule`
- `ProductsModule`
- `CertificatesModule`
- `AdminUsersModule`
- `ManagedUsersModule`
- `CorePermissionsModule`
- `ComplianceModule`
- `LicensingConfigsModule`
- `ProductPackageRegistrationsModule`
- `VariantPricingModule`

Frontend admin đã có UI quản trị tương ứng:

- `admin/products`
- `admin/compliance`
- `admin/settings/permissions`
- `admin/settings/digital-rights`
- `admin/settings/physical-rights`
- `admin/settings/expression-configs`
- `admin/settings/modification-configs`

### 2. Response và integration contracts

- Backend trả response theo envelope chuẩn của `@musica/contracts`.
- List endpoints phải có `meta.pagination`.
- `x-request-id` có thể được client gửi lên; response luôn trả `requestId`.
- FE unwrap theo envelope, không đổi format response.

### 3. Data model current-state

Lớp dữ liệu chính đang chi phối luồng quyền/pháp lý:

- `products`
- `core_permissions`
- `track_allowed_permissions`
- `compliance_reviews`
- `compliance_approved_permissions`
- `compliance_legal_files`
- `digital_right_configs`
- `digital_right_config_permissions`
- `physical_right_configs`
- `physical_right_config_permissions`
- `expression_configs`
- `expression_config_permissions`
- `modification_configs`
- `modification_config_permissions`
- `product_digital_right_registrations`
- `product_physical_right_registrations`

### 4. Source of truth theo từng lớp

- Legal permission catalog:
  - `core_permissions`
- Compliance-approved maximum set:
  - `compliance_approved_permissions`
- Product-sellable final set:
  - `track_allowed_permissions`
- Package-required set:
  - `digital_*_permissions`, `physical_*_permissions`, cộng thêm dependency từ `expression`/`modification`

### 5. Gate nghiệp vụ quan trọng

Publish gate:

- Phải có `thumbnailKey`
- Phải có `allowedPermissionIds`
- Compliance phải đạt `SUFFICIENT + APPROVED`

Allowed permission gate:

- Chỉ cho set khi compliance đã approved
- Chỉ được chọn subset nằm trong `approvedPermissionIds`

Package eligibility gate:

- Product phải đủ `allowed permissions` để satisfy `required permissions`
- Config phải `ACTIVE`

Core permission integrity gate:

- Không được `INACTIVE`/delete nếu đang có dependency

## Luồng hiện tại của nền tảng

### Luồng 1: Tạo quyền gốc

1. Admin tạo/sửa `core permission`.
2. Permission được đánh dấu `ACTIVE` hoặc `INACTIVE`.
3. Hệ thống chặn thay đổi phá hủy nếu permission đang được tham chiếu bởi compliance, product hoặc licensing configs.

Kết quả:

- Nền tảng có một bộ catalog quyền ổn định, đồng bộ cho mọi luồng phía sau.

### Luồng 2: Tạo product

1. Admin/creator tạo `product`.
2. Backend lưu metadata product.
3. Backend tạo sẵn bản ghi `compliance_reviews` 1-1 cho product.
4. Product mặc định ở `PENDING`.

Kết quả:

- Mọi product mới đều bị đặt dưới quy trình pháp lý ngay từ đầu.

### Luồng 3: Thu thập hồ sơ pháp lý

1. Admin vào compliance detail từ compliance screen hoặc từ product screen.
2. Upload legal files lên storage.
3. Metadata được lưu vào `compliance_legal_files`.
4. Hệ thống có khả năng tạo signed download URL để xem hồ sơ.

Kết quả:

- Hệ thống có audit trail có cấu trúc tốt hơn so với `uploaded_legal_files jsonb` cũ.

### Luồng 4: Reviewer ra quyết định compliance

1. Reviewer chọn `legal_status`.
2. Reviewer chọn `review_status`.
3. Nếu reject/insufficient, reviewer phải nhập `reject_reason`.
4. Nếu approve, reviewer chọn `approvedPermissionIds`.
5. Backend validate reviewer và active permissions.
6. Backend ghi `compliance_approved_permissions`.

Kết quả:

- Nền tảng có tập quyền tối đa đã được legal/compliance cho phép.

### Luồng 5: Admin chọn quyền bán cuối cùng

1. Admin mở product management.
2. Mở dialog chọn quyền dựa trên hồ sơ pháp lý.
3. Hệ thống cho chọn subset từ `approvedPermissionIds`.
4. Backend lưu vào `track_allowed_permissions`.

Kết quả:

- Product có tập quyền bán cuối cùng phục vụ kinh doanh.
- Đây là bước tác nghiệp riêng, không nằm bên trong compliance submit flow.

### Luồng 6: Hệ thống đánh giá package eligibility

1. Hệ thống tải danh sách digital/physical configs.
2. Mỗi config được tính `requiredPermissions` từ base permissions và dependency permissions.
3. Hệ thống so sánh `allowedPermissionIds` của product với `requiredPermissions`.
4. Kết quả trả về `ELIGIBLE` hoặc `INELIGIBLE`.

Kết quả:

- Product chỉ có thể tham gia package mà nó đủ quyền kinh doanh.

### Luồng 7: Join package

1. Admin/creator chọn join digital hoặc physical package.
2. Backend validate config `ACTIVE`.
3. Backend validate ownership nếu cần.
4. Backend validate eligibility.
5. Backend tạo registration `JOINED`.

Kết quả:

- Product được gắn vào package có thể khai thác thương mại.

### Luồng 8: Publish product

1. Admin bấm `publish`.
2. Backend kiểm tra:
   - có thumbnail
   - có `allowedPermissionIds`
   - compliance đạt `SUFFICIENT + APPROVED`
3. Nếu hợp lệ, product chuyển sang `PUBLISHED`.
4. Nếu không hợp lệ, backend trả business error rõ ràng.

Kết quả:

- `Publish` là gate cuối cùng của current-state product flow.

## Task List

Đây là task list nghiệp vụ mà hệ thống đang thực hiện trong current-state:

1. Quản trị catalog `core_permissions`.
2. Tạo product và khởi tạo compliance record 1-1.
3. Upload, lưu trữ và truy xuất legal files.
4. Reviewer submit legal decision và approved permissions.
5. Admin chọn final allowed permissions cho product.
6. Quản trị digital/physical/expression/modification configs.
7. Tính `requiredPermissions` và `eligibility`.
8. Join/remove product vào các packages.
9. Tính variant pricing theo configs/modifiers.
10. Publish/hide product.
11. Render/download certificates theo domain cũ.

## Development Phases

### Phase 1: MVP cũ

Mô hình ban đầu tập trung vào:

- `track`
- `usage_rights`
- buyer purchase flow
- certificate generation

Dấu vết còn lại:

- docs MVP và ERD cũ
- certificate domain vẫn còn `selected_usage_rights`

### Phase 2: Database V2 foundation

Hệ thống bổ sung:

- `core_permissions`
- `compliance_reviews`
- `compliance_approved_permissions`
- `track_allowed_permissions`
- licensing config tables
- legal files table riêng

Đây là phase đặt nền cho current-state hiện tại.

### Phase 3: Product-centric rights/compliance platform

Behavior đã thấy rõ trong code hiện tại:

- product là product core
- compliance tạo maximum approved set
- product chọn final sellable set
- package eligibility dựa trên final sellable set
- publish bị gate bởi legal + permission + asset completeness

### Phase 4: Transitional/legacy coexistence

Những thành phần chưa đồng bộ hoàn toàn:

- naming `track` và `product` đang song song
- compliance route/service vẫn dùng `trackId` ở nhiều nơi
- certificates vẫn theo domain cũ
- docs vẫn có chỗ nói về auto-sync mà backend thực tế chưa làm theo kiểu đó

## Acceptance Criteria

### Tiêu chí để xác nhận luồng hiện tại đã được hiểu đúng

- `core_permissions` được xác định là source of truth gốc.
- Compliance chỉ tạo `approved permissions`, không tự động quyết định tập quyền bán cuối cùng.
- `track_allowed_permissions` được xác định là tập quyền kinh doanh cuối cùng của product.
- Eligibility của package được tính bằng cách đối chiếu `allowed permissions` với `required permissions`.
- Publish chỉ thành công khi product đủ thumbnail, đủ final permissions và compliance đã approved.
- Licensing configs được xác định là lớp package/pricing/dependency, không phải lớp cấp quyền trực tiếp.
- Certificate flow được xác định là domain legacy, chưa được kết nối đầy đủ với current-state licensing flow.

### Tiêu chí đối chiếu docs với code thực tế

- Docs V2 nói về việc sync approved permissions sang `track_allowed_permissions`.
- Code thực tế cho thấy admin phải chọn thủ công final allowed permissions trên Product screen.
- Báo cáo này ưu tiên behavior thực tế của backend/frontend hiện tại khi có xung đột với docs.

## Điểm lệch giữa docs và implementation

### 1. Compliance sync

Kỳ vọng trong `database-v2-plan.md`:

- Khi `SUFFICIENT + APPROVED`, hệ thống đồng bộ danh sách permission đã duyệt sang `track_allowed_permissions`.

Behavior thực tế:

- Compliance service lưu decision và `compliance_approved_permissions`.
- Product service mới là nơi admin chọn `allowedPermissionIds`.
- Frontend product management có dialog riêng cho bước này.

Kết luận:

- Current-state đang là `manual final permission selection`, không phải auto-sync bởi compliance.

### 2. Track/Product naming

Kỳ vọng domain mới:

- Product-centric architecture.

Behavior thực tế:

- DB table chính đã là `products`.
- Nhiều service/DTO/route vẫn giữ `trackId`, `track_allowed_permissions`, `track_id`.

Kết luận:

- Hệ thống đang ở trạng thái transition naming, cần thận trọng khi đọc code và thiết kế API tiếp theo.

### 3. Certificate integration

Kỳ vọng domain mới:

- Licensing/compliance/product flow là trung tâm.

Behavior thực tế:

- Certificates vẫn theo schema cũ.
- Chưa thấy orchestration mới để snapshot final permissions/package data từ current-state flow.

Kết luận:

- Certificate flow chưa đồng bộ hoàn toàn với mô hình quyền/pháp lý mới.

## Risk Analysis

### 1. Domain inconsistency giữa docs và code

- Mức độ: Cao
- Tác động: Team dễ hiểu sai compliance flow, dẫn đến code mới ghi đè hoặc duplicate behavior.
- Nguyên nhân: Docs V2 còn nói về auto-sync, trong khi implementation hiện tại tách thành 2 bước.
- Giảm thiểu:
  - Chuẩn hóa docs theo current-state.
  - Ghi rõ `approved` và `allowed` là 2 khái niệm khác nhau.
  - Thêm E2E tests cho compliance -> product permission selection -> publish.

### 2. Legacy naming `track`/`product`

- Mức độ: Cao
- Tác động: Tăng chi phí maintain, tăng khả năng sai mapping DTO/schema/API, khó debug.
- Nguyên nhân: Migration rename đã thực hiện một phần, nhưng code compatibility vẫn còn.
- Giảm thiểu:
  - Lập kế hoạch rename nhất quán theo phase.
  - Giữ compatibility layer có chủ đích và có deadline xóa bỏ.
  - Chuẩn hóa OpenAPI và FE types sau mỗi đợt rename.

### 3. Certificate domain bị lệch khỏi rights platform mới

- Mức độ: Cao
- Tác động: Có nguy cơ certificate không phản ánh đúng final legal/sellable rights của product.
- Nguyên nhân: Certificates vẫn dựa trên schema MVP cũ.
- Giảm thiểu:
  - Định nghĩa lại certificate source data từ current-state.
  - Bổ sung snapshot của final allowed permissions, package context và compliance decision.
  - Xác định rõ ai là source of truth cho issuance.

### 4. Runtime auth mới dựa trên primary role

- Mức độ: Trung bình
- Tác động: Multi-role support trong schema có thể không được thực thi đúng ở runtime.
- Nguyên nhân: JWT hiện tại chỉ nhúng `roleId`, `roleName` của role đầu tiên.
- Giảm thiểu:
  - Xác định lại yêu cầu multi-role.
  - Nếu cần, chuyển sang JWT chứa danh sách roles và update `RolesGuard`.

### 5. Eligibility phụ thuộc vào final allowed permissions

- Mức độ: Trung bình
- Tác động: Nếu admin chưa chọn final permissions sau compliance approve, product sẽ không thể join package dù đủ điều kiện pháp lý.
- Nguyên nhân: Có thêm một bước thủ công trong product management.
- Giảm thiểu:
  - Hiển thị rõ workflow trên UI.
  - Có warning/action item khi compliance đã approved nhưng product chưa có allowed permissions.
  - Cân nhắc auto-suggest hoặc one-click apply từ approved set.

### 6. Legacy legal files fallback

- Mức độ: Trung bình
- Tác động: Tăng độ phức tạp khi audit và bảo trì.
- Nguyên nhân: Hệ thống vẫn đọc fallback từ `uploaded_legal_files jsonb`.
- Giảm thiểu:
  - Hoàn tất backfill sang `compliance_legal_files`.
  - Theo dõi tỉ lệ bản ghi còn fallback.
  - Xóa compatibility code sau khi dữ liệu đã sạch.

## Kết luận

Current-state của nền tảng đang vận hành theo mô hình sau:

1. `core_permissions` là danh mục quyền gốc.
2. `compliance` đánh giá hồ sơ pháp lý và cấp tập quyền tối đa được phép.
3. `product` chọn tập quyền kinh doanh cuối cùng từ tập đã duyệt.
4. `licensing configs` định nghĩa package, pricing và dependency permissions.
5. `product package registrations` chỉ cho tham gia package khi product đủ final permissions.
6. `publish` là gate cuối cùng, ràng buộc bởi compliance status, final permissions và asset completeness.

Nói cách khác, current-state không còn là mô hình `track + usage_rights` của MVP cũ, mà đã chuyển thành một nền tảng `product + core permissions + compliance + licensing` theo hướng marketplace bản quyền. Tuy nhiên, hệ thống vẫn đang ở giai đoạn transition vì còn tồn tại naming legacy, docs chưa đồng bộ và certificate domain chưa kết nối đầy đủ với flow mới.

## Nguồn đối chiếu chính

- `docs/prd-mvp-ban-quyen-am-nhac.md`
- `docs/erd-core-domain.md`
- `docs/solution-architecture-mvp.md`
- `docs/database-v2-plan.md`
- `docs/rest-api-mvp.md`
- `apps/api/src/modules/products/products.service.ts`
- `apps/api/src/modules/compliance/compliance.service.ts`
- `apps/api/src/modules/core-permissions/core-permissions.service.ts`
- `apps/api/src/modules/licensing-configs/licensing-configs.service.ts`
- `apps/api/src/modules/licensing-configs/licensing-required-permissions.ts`
- `apps/api/src/modules/product-package-registrations/product-package-registrations.service.ts`
- `apps/api/src/modules/pricing/variant-pricing.service.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/common/auth/roles.guard.ts`
- `apps/api/src/modules/certificates/certificates.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/supabase/migrations/20260627000100_product_compliance_core_permissions.sql`
- `apps/api/supabase/migrations/20260628000100_database_v2_foundation.sql`
- `apps/api/supabase/migrations/20260628000200_rename_tracks_to_products.sql`
- `apps/api/supabase/migrations/20260628000400_product_package_registrations.sql`
- `apps/api/supabase/migrations/20260627000400_remove_track_usage_rights.sql`
- `apps/web/src/views/admin/ProductManagementView.vue`
- `apps/web/src/views/admin/ComplianceManagementView.vue`
- `apps/web/src/views/admin/LicensingConfigManagementView.vue`
- `apps/web/src/views/admin/CorePermissionSettingsView.vue`
- `apps/web/src/router/index.ts`
