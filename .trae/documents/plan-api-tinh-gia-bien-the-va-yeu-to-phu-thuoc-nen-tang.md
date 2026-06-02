# Kế hoạch: API tính giá biến thể + Yếu tố phụ thuộc cho gói nền tảng

## 1) Tóm tắt

Xây dựng một **public API** để tính **giá biến thể sản phẩm** theo các lựa chọn (parameter) và trả về **total + breakdown**, với dữ liệu hệ số dạng **enums + multiplier**. Đồng thời, cải biên phần **quản lý nền tảng (digital/physical rights configs)** để có thể gắn thêm **0..5 yếu tố phụ thuộc** (pricing modifiers) nhằm tính thêm tiền.

Các quyết định đã chốt:
- API là **public** (không cần JWT).
- Base price **hardcode** trong BE: **2,530,000 VND**.
- Công thức “nền tảng số” áp dụng **total * 10% (0.1)** và **chỉ áp dụng cho DIGITAL**.
- “Hình thức thể hiện” và “Mức độ biến đổi” đã có module quản lý riêng (expression/modification configs), nên phần enum hardcode mới chỉ tập trung vào 3 yếu tố: **Đối tượng / Thời hạn / Phạm vi**.
- Hệ số mặc định ban đầu cho các lựa chọn của 3 yếu tố: **2.0** (bạn sẽ tự chỉnh sau trong code).

---

## 2) Hiện trạng (đã xác minh trong repo)

### 2.1 BE (NestJS)
- Có module quản lý licensing configs:
  - Digital/Physical configs có `base_price_multiplier`.
  - Expression/Modification configs có `price_multiplier`.
  - Files:
    - `apps/api/src/licensing-configs/licensing-configs.dto.ts`
    - `apps/api/src/licensing-configs/licensing-configs.service.ts`
    - `apps/api/src/licensing-configs/*.controller.ts`
- DB migration nền tảng đã có bảng:
  - `digital_right_configs`, `physical_right_configs`, `expression_configs`, `modification_configs`
  - (không có bảng “pricing modifiers” cho digital/physical configs).
  - File: `apps/api/supabase/migrations/20260628000100_database_v2_foundation.sql`
- Response envelope đã được wrap qua interceptor (phù hợp `@musica/contracts`).

### 2.2 FE (Vue)
- Admin routes trỏ vào cùng page `LicensingConfigManagementPage.vue` cho 4 resource:
  - `digital`, `physical`, `expression`, `modification`
  - File: `apps/web/src/router/index.ts`
  - Page: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

---

## 3) Mục tiêu & tiêu chí thành công

### 3.1 Public API calculate
- Nhận input gồm:
  - Chọn gói nền tảng (digitalRightConfigId hoặc physicalRightConfigId).
  - 3 yếu tố hardcode: subject/duration/scope (enum).
  - (Optional) expressionConfigId, modificationConfigId (vì 2 cái này đã có hệ số trong DB).
- Tính total dựa trên:
  - `BASE_PRICE_VND (2,530,000)`
  - `platform.basePriceMultiplier`
  - multipliers từ 3 yếu tố hardcode (mặc định 2.0)
  - (optional) expression.priceMultiplier, modification.priceMultiplier
  - (optional) platform price modifiers (0..5) match theo selection
  - nếu DIGITAL: nhân thêm `0.1` (10%)
- Trả về `totalPrice` + `breakdown[]` (mỗi dòng: key/label/selected/multiplier/lineTotal).

### 3.2 Admin “nền tảng” hỗ trợ yếu tố phụ thuộc (pricing modifiers)
- Khi tạo/sửa `digital_right_configs` và `physical_right_configs`, cho phép add **0..5 modifiers**.
- Mỗi modifier gồm:
  - `key`: enum key (có thể match theo selection khi calculate).
  - `multiplier`: number (>= 1).
- List/detail cũng trả về modifiers để FE hiển thị.

---

## 4) Thiết kế data model (DB)

Tạo 2 bảng mới để giữ FK rõ ràng:

1) `public.digital_right_config_price_modifiers`
- `id uuid primary key default gen_random_uuid()`
- `digital_right_config_id uuid not null references public.digital_right_configs(id) on delete cascade`
- `modifier_key text not null`
- `multiplier numeric(12,2) not null check (multiplier >= 1)`
- `created_at timestamptz not null default now()`
- Unique constraint: `(digital_right_config_id, modifier_key)` để tránh duplicate.

2) `public.physical_right_config_price_modifiers`
- Tương tự, FK tới `physical_right_configs`.

Migration file mới (không dùng timestamp):
- `apps/api/supabase/migrations/add_right_config_price_modifiers.sql`

---

## 5) Thiết kế enums (BE)

Tạo file mới:
- `apps/api/src/pricing/variant-pricing.enums.ts`

Bao gồm:
- `VARIANT_SUBJECT_OPTIONS`: `INDIVIDUAL`, `ORGANIZATION`
- `VARIANT_DURATION_OPTIONS`: `ONE_YEAR`, `PERPETUAL`
- `VARIANT_SCOPE_OPTIONS`: `SINGLE_CHANNEL`, `MULTI_CHANNEL`
- Map multiplier mặc định (tất cả = 2.0):
  - `SUBJECT_MULTIPLIERS`
  - `DURATION_MULTIPLIERS`
  - `SCOPE_MULTIPLIERS`

Ngoài ra, định nghĩa pool `modifier_key` có thể dùng cho platform modifiers:
- `VariantPricingModifierKey` = union của:
  - `SUBJECT_*`, `DURATION_*`, `SCOPE_*`
  - `EXPRESSION:{id}` và `MODIFICATION:{id}` sẽ KHÔNG encode bằng key (vì lấy multiplier theo DB), nên modifiers chỉ cần cover 3 yếu tố hardcode.

Ghi chú quyết định: modifiers chỉ match theo 3 yếu tố hardcode để tránh “trùng nghĩa” với expression/modification configs vốn đã có multiplier riêng trong DB.

---

## 6) BE: Public API calculate (NestJS)

### 6.1 Module/service/controller mới
Tạo module mới:
- `apps/api/src/pricing/variant-pricing.module.ts`
- `apps/api/src/pricing/variant-pricing.service.ts`
- `apps/api/src/pricing/public-variant-pricing.controller.ts`
- `apps/api/src/pricing/variant-pricing.dto.ts`
- `apps/api/src/pricing/variant-pricing.swagger.ts` (nếu đang theo pattern swagger DTO riêng)

Route đề xuất:
- `POST /public/variant-pricing/calculate`

Request DTO:
- `platformType: 'DIGITAL' | 'PHYSICAL'`
- `digitalRightConfigId?: string` (uuid) (required nếu DIGITAL)
- `physicalRightConfigId?: string` (uuid) (required nếu PHYSICAL)
- `subject: 'INDIVIDUAL' | 'ORGANIZATION'`
- `duration: 'ONE_YEAR' | 'PERPETUAL'`
- `scope: 'SINGLE_CHANNEL' | 'MULTI_CHANNEL'`
- `expressionConfigId?: string` (uuid)
- `modificationConfigId?: string` (uuid)

Response DTO (envelope tự wrap):
- `totalPrice: number`
- `currency: 'VND'`
- `breakdown: Array<{ key: string; label: string; selected: string; multiplier: number; lineTotal: number }>`

### 6.2 Fetch dữ liệu config để tính
Trong `VariantPricingService`:
- Load platform config:
  - DIGITAL: select `base_price_multiplier` + modifiers by `digital_right_config_id`
  - PHYSICAL: select `base_price_multiplier` + modifiers by `physical_right_config_id`
- Load expression/modification (optional):
  - Select `price_multiplier` từ `expression_configs` / `modification_configs`
- Tính toán:
  - `base = 2_530_000`
  - `total = base`
  - nhân lần lượt theo breakdown:
    - platform base multiplier
    - subject/duration/scope multipliers (hardcode)
    - optional expression/modification multipliers (từ DB)
    - platform modifiers: nếu modifier_key match selection thì nhân thêm
  - Nếu DIGITAL: `total = total * 0.1`

### 6.3 Error handling
- Nếu thiếu configId theo platformType: 400 với code/message rõ ràng.
- Nếu configId không tồn tại: 404.
- Nếu expression/modification id không tồn tại: 400 hoặc 404 (chốt 404 để rõ dữ liệu).
- Tất cả theo envelope chuẩn hiện tại.

### 6.4 Wiring module
- Add `VariantPricingModule` vào `apps/api/src/app.module.ts`.

---

## 7) BE: Mở rộng licensing configs (digital/physical) để lưu modifiers

### 7.1 DTO changes
File: `apps/api/src/licensing-configs/licensing-configs.dto.ts`
- Extend `DigitalRightConfigDto` + `PhysicalRightConfigDto`:
  - `priceModifiers: Array<{ key: string; multiplier: number }>`
- Extend create/update request DTOs:
  - `priceModifiers?: Array<{ key: string; multiplier: number }>`
  - Validate:
    - `key` thuộc enum keys (3 nhóm subject/duration/scope)
    - `multiplier` number >= 1
    - giới hạn length <= 5
    - unique key

### 7.2 Service changes
File: `apps/api/src/licensing-configs/licensing-configs.service.ts`
- Khi list/get detail digital/physical:
  - join/select thêm bảng modifiers.
- Khi create/update:
  - sync modifiers tương tự pattern `syncConfigPermissions`:
    - delete old rows
    - insert new rows
- Khi updateStatus/delete:
  - không cần đổi (delete cascade).

### 7.3 Swagger
File: `apps/api/src/licensing-configs/licensing-configs.swagger.ts`
- Ensure response DTO reflect `priceModifiers`.

---

## 8) FE: Cập nhật UI quản lý nền tảng (digital/physical) để add modifiers

### 8.1 Types + API
Files:
- `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
- `apps/web/src/shared/api/generated/schema.d.ts` (regenerate sau khi BE OpenAPI cập nhật)

Thêm:
- type `PriceModifier` và field `priceModifiers` cho digital/physical config.
- Payload create/update include `priceModifiers`.

### 8.2 UI
File:
- `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`

Chỉ áp dụng cho `resource === 'digital' || resource === 'physical'`:
- Thêm section “Yếu tố phụ thuộc (tính thêm tiền)”
- UI cho phép add/remove rows (tối đa 5):
  - dropdown chọn `key` (3 nhóm subject/duration/scope)
  - input multiplier
- Khi mở edit: load `selectedItem.priceModifiers` vào form.
- Khi submit: gửi `priceModifiers` lên BE.

---

## 9) Verification

### 9.1 BE
- Unit test:
  - `apps/api/src/pricing/variant-pricing.service.spec.ts`
    - case DIGITAL áp 0.1
    - case PHYSICAL không áp 0.1
    - case modifiers match selection
    - case optional expression/modification multipliers
    - error case thiếu configId / config không tồn tại
- Typecheck:
  - `pnpm.cmd -C apps/api typecheck`

### 9.2 FE
- Typecheck:
  - `pnpm.cmd -C apps/web typecheck`
- Manual acceptance:
  - Admin digital/physical có thể add 0..5 modifiers, save, reopen vẫn còn.
  - Public API trả đúng envelope + breakdown.

### 9.3 OpenAPI & generated types
- Chạy lại pipeline đồng bộ:
  - build + gen openapi + gen types (theo workflow repo)

---

## 10) Assumptions & Decisions
- Modifiers chỉ cover 3 yếu tố hardcode (subject/duration/scope) để tránh overlap với expression/modification configs.
- Hệ số mặc định cho 3 yếu tố = 2.0 (hardcode), base price = 2,530,000.
- DIGITAL áp `total *= 0.1` sau khi nhân tất cả multiplier khác.

