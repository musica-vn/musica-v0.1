# Plan Refactor YouTube Default Platform Pricing

## Summary

- Refactor toàn bộ flow `Quản lý nền tảng số` từ model hiện tại `nhiều digital_right_configs + selected config + GLOBAL/CUSTOM override` sang model mới:
- Hệ thống chỉ có `1 default template YouTube`.
- Default template này luôn có đủ 5 nhóm thuộc tính giá: `Đối tượng`, `Thời hạn`, `Phạm vi`, `Hình thức biểu hiện`, `Mức độ biến đổi`.
- Admin không còn tạo/xóa config nền tảng số; chỉ sửa hệ số giá của từng thuộc tính trong default template.
- Ở product detail:
- Nếu không setup riêng: bài hát tự dùng default template của hệ thống.
- Nếu tự cấu hình: hệ thống clone toàn bộ default data của YouTube cho bài hát, rồi cho admin sửa từng hệ số giá.
- `Thời hạn` được coi là thuộc tính giá đúng nghĩa, không còn là phần tách rời như model hiện tại.

## Current State Analysis

### FE hiện tại

- `apps/web/src/views/admin/ProductDetailView.vue`
- Màn product detail đang dùng model `selectedDigitalRightConfigId + pricingMode + customPriceMultiplier`.
- UI vẫn giả định người dùng phải chọn 1 config hệ thống rồi chọn `GLOBAL` hoặc `CUSTOM`.
- `CUSTOM` hiện chỉ sửa 1 giá tổng (`customPlatformMultiplier`), chưa phải bộ hệ số theo từng thuộc tính.

- `apps/web/src/types/products.types.ts`
- Type `ProductPlatformSettings` đang mô tả `availableConfigs`, `selectedDigitalRightConfigId`, `pricingMode`, `customPriceMultiplier`, `systemBaseMultiplier`, `effectiveMultiplier`.
- Contract FE đang khóa chặt vào model config-based.

- `apps/web/src/views/admin/LicensingConfigManagementView.vue`
- Màn `Quản lý nền tảng số` hệ thống vẫn là CRUD cho nhiều `digital right configs`.
- Với digital config, UI vẫn cho tạo nhiều config theo `platform + duration + basePriceMultiplier + priceModifiers`.
- Duration hiện đang bị tách khỏi `priceModifiers`, không đúng yêu cầu mới.

### BE hiện tại

- `apps/api/src/modules/products/admin-products.dto.ts`
- Request update platform settings hiện chỉ nhận:
  - `platformKey`
  - `selectedDigitalRightConfigId`
  - `pricingMode`
  - `customPriceMultiplier`

- `apps/api/src/modules/products/product.dto.ts`
- Response DTO hiện trả `availableConfigs` và state theo selected config.

- `apps/api/src/modules/products/products.service.ts`
- `loadProductPlatformSettings()` đọc active `digital_right_configs`, build `availableConfigs`, và đọc selection từ `product_platform_pricing_configs`.
- `updateProductPlatformSettings()` chỉ upsert một row gồm config id + pricing mode + custom multiplier.

- `apps/api/src/modules/pricing/variant-pricing.service.ts`
- Pricing engine hiện tính:
  - base price
  - platform base multiplier từ `digital_right_configs.base_price_multiplier`
  - sau đó áp từng modifier khác.
- Product override hiện chỉ override được `platform base multiplier`.

- `apps/api/src/modules/licensing-configs/licensing-config-price-modifiers.ts`
- Digital config đang cấm `DURATION_ONE_YEAR` và `DURATION_PERPETUAL`.
- Điều này xung đột trực tiếp với yêu cầu mới: `thời hạn` phải là một thuộc tính có hệ số giá.

### DB / schema hiện tại

- `supabase/migrations/20260629000200_product_platform_pricing_configs.sql`
- Bảng `product_platform_pricing_configs` hiện chỉ đủ cho model cũ:
  - `product_id`
  - `platform_key`
  - `digital_right_config_id`
  - `pricing_mode`
  - `custom_price_multiplier`

- Dữ liệu hệ thống hiện còn dựa vào `digital_right_configs` và bảng `digital_right_config_price_modifiers`.
- Model này không phù hợp khi YouTube phải trở thành một default dataset cố định thay vì nhiều config do admin tạo thủ công.

## Assumptions & Decisions

- Chuyển cả màn hệ thống và màn product detail sang model mới trong cùng đợt.
- YouTube là platform số mặc định duy nhất ở phase hiện tại.
- System default được lưu như một template dữ liệu cố định, không còn phụ thuộc vào việc admin tạo nhiều `digital_right_configs`.
- Product custom mode dùng chiến lược `clone toàn bộ default template`, không dùng fallback từng thuộc tính.
- Khi bài hát quay về dùng mặc định hệ thống, toàn bộ custom data của bài hát cho YouTube sẽ bị xóa hoặc đánh dấu không dùng.
- `Thời hạn` được đưa vào cùng bộ modifier với các thuộc tính còn lại, không còn là config dimension riêng cho YouTube default template.

## Proposed Changes

### 1. Chuẩn hóa domain pricing template mặc định của YouTube

- Tạo model mới cho platform default template và product override.
- Mục tiêu:
  - hệ thống có 1 default template cho `YOUTUBE`
  - template chứa đầy đủ multiplier theo 5 nhóm thuộc tính
  - product custom có snapshot riêng của toàn bộ template

#### File BE cần cập nhật

- `apps/api/src/modules/pricing/variant-pricing.enums.ts`
- Giữ `VariantPricingModifierKey` làm source-of-truth cho 5 nhóm thuộc tính.
- Xác nhận `DURATION_*` là modifier hợp lệ cho digital platform default template.

- `apps/api/src/modules/licensing-configs/licensing-config-price-modifiers.ts`
- Bỏ rule cấm duration modifier cho digital.
- Nếu file này vẫn phục vụ màn hệ thống sau refactor, cần đổi sang rule mới: digital template cho phép đủ 5 nhóm.

- `apps/api/src/modules/licensing-configs/licensing-configs.service.ts`
- Tách phần quản trị `digital` khỏi logic CRUD nhiều config nếu vẫn tái dùng màn này.
- Chuyển màn system digital sang load/update một default template cố định cho `YOUTUBE`.

### 2. Thiết kế schema mới cho system default + product custom snapshot

- Thêm migration mới để tạo schema phù hợp model mới.

#### DB đề xuất

- `platform_default_pricing_templates`
  - 1 row cho `YOUTUBE`
  - metadata cơ bản: `platform_key`, `name`, `updated_at`, `updated_by`

- `platform_default_pricing_template_modifiers`
  - mỗi row là 1 `modifier_key` + `multiplier`
  - luôn có đầy đủ các row cần thiết cho 5 nhóm thuộc tính

- `product_platform_pricing_overrides`
  - 1 row per `product_id + platform_key`
  - đánh dấu `mode: SYSTEM | CUSTOM`
  - metadata `updated_at`, `updated_by`

- `product_platform_pricing_override_modifiers`
  - snapshot multiplier theo từng `modifier_key` cho bài hát khi mode = `CUSTOM`

#### File cần thêm

- `supabase/migrations/<new_migration_name>.sql`
- Nội dung:
  - tạo các bảng mới
  - migrate dữ liệu cũ nếu cần
  - seed default template `YOUTUBE`
  - seed đầy đủ modifier cho 5 nhóm
  - giữ constraint unique hợp lý
  - chuẩn bị index cho `(platform_key)` và `(product_id, platform_key)`

### 3. Refactor API contract cho product platform settings

- Bỏ contract config-based hiện tại.
- Đổi sang contract template-based.

#### File FE

- `apps/web/src/types/products.types.ts`
- Thay các type:
  - bỏ `ProductPlatformConfigOption`
  - bỏ `selectedDigitalRightConfigId`
  - bỏ `pricingMode` kiểu `GLOBAL/CUSTOM`
  - bỏ `customPriceMultiplier`
- Thêm type mới:
  - `ProductPlatformPricingMode = 'SYSTEM' | 'CUSTOM'`
  - `ProductPlatformModifierValue`
  - `ProductPlatformDefaultTemplate`
  - `ProductPlatformOverrideSnapshot`
  - `ProductPlatformSettings`

#### File BE

- `apps/api/src/modules/products/product.dto.ts`
- Đổi response DTO để trả:
  - default template YouTube
  - current mode của bài hát
  - custom snapshot nếu có
  - effective preview theo từng modifier hoặc summary cần thiết

- `apps/api/src/modules/products/admin-products.dto.ts`
- Đổi request update thành payload đầy đủ hơn, ví dụ:
  - `platformKey`
  - `mode: SYSTEM | CUSTOM`
  - `modifiers?: Array<{ key, multiplier }>`
- Không còn nhận `selectedDigitalRightConfigId` và `customPriceMultiplier`.

- `apps/api/src/modules/products/products.swagger.ts`
- Đồng bộ OpenAPI response/request mới.

### 4. Refactor service layer của products

- `apps/api/src/modules/products/products.service.ts`

#### Thay đổi chính

- `loadProductPlatformSettings()`
  - không đọc active `digital_right_configs` để build danh sách chọn nữa
  - thay bằng:
    - load default template YouTube
    - load product override mode
    - nếu mode = `CUSTOM`, load full modifier snapshot của bài hát
    - trả dữ liệu cho FE theo model mới

- `updateProductPlatformSettings()`
  - nếu `mode = SYSTEM`
    - xóa override hiện có của bài hát cho YouTube
  - nếu `mode = CUSTOM`
    - validate đủ danh sách modifier cần thiết
    - upsert row override
    - replace toàn bộ modifier snapshot của bài hát bằng bộ admin gửi lên

- Error handling mới
  - thêm lỗi validate như:
    - thiếu modifier bắt buộc
    - modifier key không hợp lệ
    - thiếu template mặc định YouTube
    - dữ liệu custom không đầy đủ

### 5. Refactor pricing engine

- `apps/api/src/modules/pricing/variant-pricing.service.ts`

#### Cách tính mới

- Load system default template modifiers cho `YOUTUBE`.
- Nếu `payload.productId` có custom override mode:
  - dùng modifier snapshot của product thay cho system default.
- Base multiplier của platform không còn lấy từ `digital_right_configs.base_price_multiplier`.
- `DURATION_*` được xử lý như digital modifier bình thường.
- Breakdown pricing phải phản ánh:
  - `SYSTEM_TEMPLATE` hoặc `PRODUCT_CUSTOM_TEMPLATE`
  - từng modifier được áp

#### Tác động phụ cần kiểm tra

- Các endpoint hoặc service đang dùng `digital_right_configs` để tính digital price cần được rà lại.
- Cập nhật unit tests cho pricing breakdown để khớp model mới.

### 6. Refactor màn hệ thống `Quản lý nền tảng số`

- `apps/web/src/views/admin/LicensingConfigManagementView.vue`

#### Hướng đổi UI

- Với resource `digital`, bỏ list CRUD nhiều config.
- Chuyển thành editor cho `default template YouTube`.
- Không còn CTA:
  - tạo config
  - xóa config
  - bật/tắt nhiều config
- Chỉ còn:
  - hiển thị platform cố định `YouTube`
  - hiển thị đầy đủ 5 nhóm thuộc tính
  - cho admin sửa multiplier của từng thuộc tính
  - lưu toàn bộ template mặc định

#### Có thể cần tách component mới

- `apps/web/src/components/features/...`
- Nếu `LicensingConfigManagementView.vue` quá phức tạp, tách riêng component editor:
  - `DigitalPlatformDefaultTemplateEditor.vue`

### 7. Refactor product detail UI

- `apps/web/src/views/admin/ProductDetailView.vue`

#### Hướng đổi UI

- Bỏ hoàn toàn mental model `chọn config hệ thống`.
- Khối chính chỉ còn 2 lựa chọn:
  - `Dùng gói mặc định của hệ thống`
  - `Tự cấu hình giá riêng`

- Khi `SYSTEM`
  - hiển thị preview từ default template YouTube
  - không cho sửa modifier

- Khi `CUSTOM`
  - render form modifier editor đầy đủ cho 5 nhóm thuộc tính
  - dữ liệu khởi tạo bằng clone từ system default template
  - admin sửa trực tiếp từng multiplier

- `Thời hạn` phải xuất hiện trong form như một nhóm giá riêng.
- Sidebar phải hiển thị:
  - mode hiện tại
  - platform
  - updatedAt
  - CTA reset / save

### 8. Cập nhật service FE

- `apps/web/src/services/products.service.ts`
- Giữ endpoint path nếu muốn tương thích route, nhưng đổi request/response types.

- Có thể cần thêm service mới cho system template:
  - `getAdminDigitalPlatformDefaultTemplate()`
  - `updateAdminDigitalPlatformDefaultTemplate()`

### 9. Test và verification

#### Backend

- `apps/api/src/modules/pricing/variant-pricing.service.spec.ts`
- Cập nhật test case:
  - system mode dùng default template
  - custom mode dùng cloned snapshot
  - `DURATION_*` áp như modifier cho digital

- `apps/api/src/modules/licensing-configs/licensing-config-price-modifiers.spec.ts`
- Đổi expectation để duration modifier được phép cho digital template.

- Thêm test cho `products.service.ts`
  - load settings system mode
  - save custom full snapshot
  - reset về system mode

#### Frontend

- Kiểm tra typecheck cho:
  - `apps/web/src/views/admin/ProductDetailView.vue`
  - `apps/web/src/views/admin/LicensingConfigManagementView.vue`
  - `apps/web/src/types/products.types.ts`
  - `apps/web/src/services/products.service.ts`

#### Manual QA

- Màn hệ thống:
  - mở YouTube default template
  - sửa multiplier ở cả 5 nhóm
  - lưu và reload vẫn giữ đúng

- Màn product detail:
  - mode mặc định hiển thị data hệ thống
  - chuyển sang custom, clone data đầy đủ
  - sửa vài multiplier
  - lưu thành công
  - quay lại vẫn giữ đúng snapshot
  - chuyển lại system mode thì custom snapshot biến mất

- Pricing:
  - tính giá cùng payload trước/sau khi đổi template
  - xác nhận `Thời hạn` đang tác động qua multiplier đúng như thuộc tính bình thường

## Verification Steps

1. Chạy migration mới trên Supabase.
2. Xác nhận bảng default template và override snapshot được tạo đúng.
3. Xác nhận seed mặc định `YOUTUBE` có đầy đủ modifier cho 5 nhóm.
4. Chạy build/typecheck cho `apps/api`.
5. Regenerate OpenAPI và FE types nếu flow hiện tại đang dùng.
6. Chạy build/typecheck cho `apps/web`.
7. Verify thủ công 2 màn:
   - `Quản lý nền tảng số` hệ thống
   - `Product detail -> Quản lý nền tảng số`
8. Verify API envelope vẫn đúng chuẩn `@musica/contracts`.

## Risks

- Refactor này thay đổi domain trung tâm của digital pricing, ảnh hưởng cả UI, API, DB, pricing engine.
- Nếu còn endpoint hoặc màn khác phụ thuộc vào `digital_right_configs`, cần rà kỹ để tránh regression.
- Migrate dữ liệu cũ từ model config-based sang template-based có thể cần bước cleanup rõ ràng nếu dữ liệu hiện tại không nhất quán.

## Out Of Scope

- Mở rộng thêm platform ngoài `YOUTUBE`.
- Thay đổi business flow của rights/license ngoài phần pricing template.
- Rollout shared notification toàn dự án.
