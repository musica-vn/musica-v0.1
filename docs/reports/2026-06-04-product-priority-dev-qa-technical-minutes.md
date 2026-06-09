# Biên Bản Kỹ Thuật (Dev/QA) – Ưu Tiên Hiển Thị Sản Phẩm (Trending Priority)

**Mã tài liệu:** `MIN-PRIORITY-DEVQA-2026-06-04-01`  
**Phiên bản:** `v1.0`  
**Ngày lập:** `2026-06-04` (Asia/Saigon)  
**Phạm vi repo:** `apps/api`, `apps/api/supabase/migrations`  
**Mục tiêu:** Cấu hình ưu tiên hiển thị sản phẩm bằng dữ liệu DB (fixed), ưu tiên sản phẩm trending lên đầu trong các list products hiện có; thiết kế sẵn sàng mở rộng thành module quản lý chuyên biệt.

## 1) Thay Đổi Cơ Sở Dữ Liệu (Database)

### 1.1. Bảng mới: `public.product_priorities`

**Tình trạng:** Tạo mới (không có phiên bản trước).  
**Migration:** [product_priorities.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/product_priorities.sql)

#### 1.1.1. Mục đích

Lưu cấu hình ưu tiên hiển thị theo từng sản phẩm để hỗ trợ:
- Ưu tiên trending (flag `is_trigger`) và sắp xếp theo điểm (`priority_score`) giảm dần.
- Khả năng mở rộng theo lịch hiệu lực (`effective_start`, `effective_end`) trong tương lai.
- Thiết kế độc lập, có thể tách thành module quản trị riêng (CRUD + UI) về sau.

#### 1.1.2. Chi tiết thuộc tính (Columns)

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả chức năng |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | **PK**, `not null` | `gen_random_uuid()` | Khóa chính định danh bản ghi ưu tiên |
| `product_id` | `uuid` | **FK** → `public.products(id)`, `not null`, `on delete cascade` | - | Sản phẩm được gán ưu tiên |
| `priority_score` | `integer` | `not null`, `check (priority_score >= 0)` | `0` | Điểm ưu tiên; điểm càng cao → hiển thị càng trước |
| `is_trigger` | `boolean` | `not null` | `false` | Cờ đánh dấu sản phẩm thuộc danh mục trending |
| `effective_start` | `timestamptz` | `null` | - | Thời điểm bắt đầu hiệu lực của ưu tiên (tương lai) |
| `effective_end` | `timestamptz` | `null` | - | Thời điểm kết thúc hiệu lực của ưu tiên (tương lai) |
| `created_at` | `timestamptz` | `not null` | `now()` | Thời điểm tạo bản ghi |
| `updated_at` | `timestamptz` | `not null` | `now()` | Thời điểm cập nhật bản ghi |

#### 1.1.3. Ràng buộc bổ sung (Constraints)

- `product_priorities_effective_range_check`:
  - `effective_start is null or effective_end is null or effective_end > effective_start`
  - Mục đích: ngăn cấu hình thời gian sai (kết thúc trước khi bắt đầu).

#### 1.1.4. Indexes

- `idx_product_priorities_product_id` (**unique**): bảo đảm **mỗi sản phẩm tối đa 1 bản ghi ưu tiên** ở giai đoạn hiện tại (fixed data).
- `idx_product_priorities_trigger_score`: tối ưu truy vấn sắp xếp theo `is_trigger`, `priority_score desc`.

#### 1.1.5. Trigger

- `trg_product_priorities_set_updated_at`:
  - `before update` gọi `public.set_updated_at()`
  - Mục đích: tự động cập nhật `updated_at` khi bản ghi thay đổi.

### 1.2. Seed dữ liệu mẫu (Fixed Trending Data)

Được thực hiện ngay trong migration:
- Chọn **top 5 sản phẩm có `status = 'PUBLISHED'` mới cập nhật gần nhất**.
- Gán `is_trigger = true`, `priority_score` giảm dần.
- Upsert bằng `on conflict (product_id) do update`.

**Lưu ý QA/Dev:** Seed hiện tại mang tính “mẫu để kiểm tra”. Khi chuyển sang dữ liệu thật, team có thể:
- Update trực tiếp theo danh sách `product_id` trending thực tế.
- Hoặc xóa seed và tự insert/maintain theo quy trình vận hành.

## 2) Thay Đổi API / Contract (Backend)

### 2.1. Tổng quan thay đổi

**Không tạo endpoint mới.**  
Thay đổi tập trung vào:
- **Thứ tự sắp xếp list products**: ưu tiên trending và `priority_score` trước tiêu chí sort hiện hữu.
- **Response schema**: bổ sung field `ProductDto.priority` để FE/clients có thể đọc thông tin ưu tiên (nullable, backward-compatible).

### 2.2. Contract response (Envelope)

Tất cả API vẫn tuân thủ response envelope theo `@musica/contracts`:

- Thành công:
  - `success: true`
  - `statusCode: number`
  - `data: ...`
  - `meta?: ...` (list có pagination)
  - `requestId: string`
  - `timestamp: string`

### 2.3. Thay đổi schema: `ProductDto`

**Thay đổi:** thêm trường `priority`:
- File: [product.dto.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/product.dto.ts)
- Kiểu: `priority: ProductPriorityDto | null`
- Mô tả:
  - `null`: sản phẩm chưa có cấu hình ưu tiên
  - khác `null`: sản phẩm có cấu hình ưu tiên từ `product_priorities`

`ProductPriorityDto` gồm:
- `priorityScore: number`
- `isTrigger: boolean`
- `effectiveStart: string | null`
- `effectiveEnd: string | null`

**Tính tương thích:** `priority` là nullable nên không phá vỡ clients cũ (FE có thể bỏ qua).

### 2.4. Danh sách API thay đổi

#### 2.4.1. `GET /admin/products` (Admin – List products)

- **HTTP method:** `GET`
- **Endpoint:** `/admin/products`
- **Mô tả:** Trả danh sách sản phẩm (admin) có phân trang, lọc, sort; **giờ ưu tiên hiển thị theo trending/priority_score**.
- **Auth:** Bearer token; require roles `ADMIN`, `SUPER_ADMIN`
- **Request parameters (query):**
  - `page` (number, từ `PaginationQueryDto`)
  - `pageSize` (number, 1..10, default 10)
  - `sort` (optional):
    - `createdAt:desc|asc`, `updatedAt:desc|asc`, `title:asc|desc`, `status:asc|desc`, `genre:asc|desc`
  - `status` (optional): `PENDING|HIDDEN|PUBLISHED`
  - `genre` (optional): string
  - `artistId` (optional): string
  - `keyword` (optional): string
- **Response format:** `ApiSuccessResponse<{ items: ProductDto[] }, PaginationMeta>`
  - Mỗi `ProductDto` có thêm `priority` như mục 2.3.
- **Status codes:**
  - `200` thành công
  - `401/403` nếu không đủ auth/role
  - `500` nếu Supabase query lỗi
- **Thay đổi so với phiên bản cũ:**
  - Thêm ordering ưu tiên:
    1) `product_priorities.is_trigger desc`
    2) `product_priorities.priority_score desc`
    3) giữ `sort` hiện hữu theo `query.sort`
  - Bổ sung `ProductDto.priority` trong response.
- **Code liên quan:**
  - Controller: [admin-products.controller.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/admin-products.controller.ts#L47-L60)
  - Service: [listAdminProducts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L719-L781)

#### 2.4.2. `GET /creator/products` (Creator – List my products)

- **HTTP method:** `GET`
- **Endpoint:** `/creator/products`
- **Mô tả:** Trả danh sách sản phẩm của artist hiện tại; **giờ ưu tiên trending/priority_score**.
- **Auth:** Bearer token; require role `ARTIST`
- **Request parameters:** Không có query params.
- **Response format:** `ApiSuccessResponse<{ items: ProductDto[] }>`
  - Mỗi `ProductDto` có thêm `priority`.
- **Status codes:**
  - `200` thành công
  - `401/403` nếu không đủ auth/role
  - `500` nếu Supabase query lỗi
- **Thay đổi so với phiên bản cũ:**
  - Thêm ordering ưu tiên (trước `created_at desc`).
  - Bổ sung `ProductDto.priority` trong response.
- **Code liên quan:**
  - Controller: [creator-product-package-registrations.controller.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/product-package-registrations/creator-product-package-registrations.controller.ts#L34-L51)
  - Service: [listCreatorProducts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L927-L953)

### 2.5. Helper/Module hỗ trợ ordering (nội bộ)

Mục tiêu: tách logic ưu tiên ra 1 chỗ để dễ tái sử dụng/mở rộng.

- Helper: [product-priority-ordering.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/product-priorities/product-priority-ordering.ts)
  - `PRODUCT_PRIORITY_SELECT`: chuỗi nested select `product_priorities(...)`
  - `applyProductPriorityOrdering(builder)`: áp dụng `.order(...foreignTable...)` cho `is_trigger` và `priority_score`

## 3) Phân Tích Tác Động & Hướng Dẫn Kiểm Thử (Dev/QA)

### 3.1. Module/Thành phần bị ảnh hưởng

- **DB (Supabase/Postgres):**
  - Thêm bảng `public.product_priorities` (mới)
- **Backend (NestJS):**
  - `ProductsService`:
    - thay đổi query list admin/creator
    - thay đổi mapping `ProductDto` để trả về `priority`
  - `CreatorProductPackageRegistrationsController`:
    - không đổi endpoint, nhưng response items có thể thay đổi thứ tự
  - `ProductPackageRegistrationsService.listCreatorProducts()` (trả list id) cũng được áp dụng ordering để thống nhất (không phải endpoint chính, nhưng có thể ảnh hưởng flow nội bộ)
- **Docs/Tests:**
  - Unit test và e2e test được cập nhật/chạy pass để xác nhận thay đổi an toàn

### 3.2. Tác động đến các team

- **Backend dev:** cần nắm rõ logic ordering + contract `ProductDto.priority` để các API/products tương lai dùng lại.
- **Frontend dev:** nếu FE muốn hiển thị badge “Trending” hoặc ưu tiên, có thể dùng `product.priority` (nullable).
- **QA:** ưu tiên test các list products có sorting/pagination để đảm bảo thứ tự mới đúng kỳ vọng.

### 3.3. Rủi ro tiềm ẩn

- **R1 – Dữ liệu priority không tồn tại cho mọi sản phẩm:**  
  - Expected: `priority = null`, sản phẩm vẫn hiển thị bình thường.
- **R2 – Ordering theo foreignTable phụ thuộc quan hệ 1-1:**  
  - Mitigation: unique index theo `product_id` đảm bảo 1 record/product, giúp kết quả order ổn định.
- **R3 – `effective_start/effective_end` chưa được áp dụng vào “active priority”:**  
  - Hiện tại field tồn tại để mở rộng, nhưng hệ thống chưa lọc theo hiệu lực thời gian. Nếu nhập dữ liệu có thời hạn, UI vẫn sẽ ưu tiên theo record hiện tại.
- **R4 – Thay đổi thứ tự list có thể ảnh hưởng UX/expectation của người dùng:**  
  - QA cần kiểm tra các màn hình list liên quan, đặc biệt các màn có sắp xếp theo `updatedAt`/`createdAt`.

### 3.4. Test cases ưu tiên (QA Checklist)

#### A. Database

- A1: Insert 1 bản ghi `product_priorities` hợp lệ → OK
- A2: Update bản ghi → `updated_at` thay đổi tự động
- A3: `priority_score < 0` → bị chặn bởi constraint
- A4: `effective_end <= effective_start` (khi cả 2 không null) → bị chặn bởi constraint
- A5: Tạo 2 bản ghi cho cùng `product_id` → bị chặn bởi unique index

#### B. API – Admin list products

- B1: Khi có ít nhất 2 sản phẩm PUBLISHED với 2 mức `priority_score` khác nhau → sản phẩm có điểm cao đứng trước.
- B2: Sản phẩm có `is_trigger=true` đứng trước `is_trigger=false` ngay cả khi sort theo `createdAt`/`updatedAt`.
- B3: Các sản phẩm không có priority (`priority=null`) vẫn trả về và nằm phía sau nhóm có priority.
- B4: Pagination:
  - Trending/priority cao nằm ở trang 1 (nếu pageSize đủ)
  - totalItems/totalPages không bị lệch
- B5: Filters (status/genre/artistId/keyword) vẫn hoạt động đúng; ordering vẫn ưu tiên trong tập kết quả sau filter.

#### C. API – Creator list products

- C1: Các sản phẩm trending của creator hiển thị trước.
- C2: Sort thứ cấp vẫn giữ `created_at desc` trong nhóm cùng priority.

#### D. Security/Guards

- D1: `/admin/products` không token → 401
- D2: token không có role admin → 403
- D3: `/creator/products` yêu cầu role ARTIST → 401/403 đúng

### 3.5. Kế hoạch xử lý dự phòng (Fallback/Hotfix)

Trường hợp phát sinh lỗi sau deploy:

- **Hotfix nhanh (không rollback schema):**
  - Set `priority_score = 0`, `is_trigger = false` cho toàn bộ rows → hệ thống quay về thứ tự sort cũ gần như ngay lập tức.
  - Xóa dữ liệu trong `product_priorities` nếu cần.
- **Rollback logic ordering (code-level):**
  - Loại bỏ `applyProductPriorityOrdering(...)` khỏi các list products.
  - Giữ bảng DB để không mất dữ liệu đã nhập (phù hợp nếu muốn tạm tắt tính năng).
- **Rollback schema (DB-level, không khuyến nghị nếu đã có dữ liệu thật):**
  - Drop table `product_priorities` và remove join/order ở BE.

## 4) Kiểm Chứng (Verification) & Bằng Chứng

### 4.1. Kiểm chứng tự động (đã chạy)

- `pnpm.cmd -C apps/api typecheck`: pass
- `pnpm.cmd -C apps/api test`: pass
- `pnpm.cmd -C apps/api test:e2e`: pass
- `pnpm.cmd -C apps/api build`: pass

### 4.2. Danh sách file thay đổi chính

- DB migration: [product_priorities.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/product_priorities.sql)
- DTO: [product.dto.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/product.dto.ts)
- Service: [products.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts)
- Helper ordering: [product-priority-ordering.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/product-priorities/product-priority-ordering.ts)
- Tests:
  - [product-priority-ordering.spec.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/product-priorities/product-priority-ordering.spec.ts)
  - [products.service.spec.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.spec.ts)

## 5) Phụ Lục

### 5.1. Gợi ý dữ liệu cấu hình ưu tiên (DB)

Ví dụ set trending thủ công:

```sql
insert into public.product_priorities (product_id, priority_score, is_trigger)
values ('<product_uuid>', 100, true)
on conflict (product_id) do update
set priority_score = excluded.priority_score, is_trigger = excluded.is_trigger;
```

### 5.2. Ghi chú mở rộng tương lai

- Nếu cần nhiều bản ghi theo thời gian cho 1 sản phẩm (multi-range), nên cân nhắc:
  - view “active priority” (1 record/product tại thời điểm hiện tại), hoặc
  - RPC function để join/sort/paginate ở DB layer.

## 6) Lịch Sử Thay Đổi

| Ngày | Phiên bản | Nội dung |
| --- | --- | --- |
| 2026-06-04 | v1.0 | Tạo mới biên bản kỹ thuật Dev/QA cho `product_priorities` và thay đổi ordering/products API |

