# Kế hoạch: Báo cáo + Migration tạo Index cho Supabase

## 1) Mục tiêu
- Tạo **báo cáo kỹ thuật** tổng hợp hiện trạng index và đề xuất index cần bổ sung để tối ưu các truy vấn phổ biến trên Supabase/PostgREST.
- Chuẩn bị **migration SQL** để tạo các index đề xuất (không dùng pg_trgm ở giai đoạn này).
- Thực hiện **verify** sau khi áp dụng (typecheck + unit + e2e; kiểm tra truy vấn trọng điểm).

## 2) Hiện trạng (grounded từ repo)

### 2.1. Nguồn dữ liệu kiểm kê
- Supabase migrations: `apps/api/supabase/migrations/*.sql`

### 2.2. Index đã có (một số điểm chính)
- **products**: có các index được rename từ tracks:
  - `idx_products_status`, `idx_products_artist_id`, `idx_products_created_by`, `idx_products_product_code` (từ [20260628000200_rename_tracks_to_products.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260628000200_rename_tracks_to_products.sql))
  - Lưu ý: trong schema cũ có `idx_tracks_genre`, `idx_tracks_usage_rights_gin` (index name có thể vẫn còn “tracks” sau rename) (từ [20260520155905_remote_schema.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L74-L78))
- **product_priorities**: đã có index `product_id`, `(is_trigger, priority_score desc)` (từ [product_priorities.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/product_priorities.sql)).
- **compliance_reviews**: đã có index `track_id`, `legal_status`, `review_status` (từ [20260627000100_product_compliance_core_permissions.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260627000100_product_compliance_core_permissions.sql#L105-L107)).
- **compliance_legal_files**: đã có index `compliance_review_id` + unique `file_key` (từ [20260628000100_database_v2_foundation.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260628000100_database_v2_foundation.sql#L192-L205)).
- **product_*_right_registrations**: đã có index `product_id`, `right_config_id`, `status`, và unique partial cho status JOINED (từ [20260628000400_product_package_registrations.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260628000400_product_package_registrations.sql#L30-L77)).
- **certificates**: đã có index `track_id`, `buyer_id`, `artist_id`, `created_at` (từ [20260520155905_remote_schema.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L79-L99)).
- **right configs**: đã có index `status` và index mapping permission id (từ [20260628000100_database_v2_foundation.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260628000100_database_v2_foundation.sql#L95-L190)).

### 2.3. “Khoảng trống” index theo query patterns trong code
- **users / user_roles**:
  - `user_roles` chỉ có PK `(user_id, role_id)`; các query list admin/managed users filter theo `role_id` nên cần index cho `role_id`.
  - `users` chưa có index theo `status`/`created_at` nhưng các list endpoints filter status + order created_at.
  - Nguồn query: `AdminUsersService.listAdmins()` và `ManagedUsersService.listUsers()` (lọc theo `user_roles.role_id`, status, q, order created_at).
- **products**:
  - List admin dùng `order(column)` với column mapping: `created_at`, `updated_at`, `title`, `status`, `genre` và filter `status`, `artist_id`, `genres contains`, keyword ilike qua `.or(...)` (từ [products.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L234-L259) và [products.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L832-L954)).
  - Migrations hiện **chưa tạo GIN index** cho `genres text[]` và `use_cases text[]` (từ [add_product_genres_use_cases.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/add_product_genres_use_cases.sql)).
- **compliance_reviews**:
  - List compliance order theo `updated_at desc` (từ [compliance.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/modules/compliance/compliance.service.ts#L314-L320)) nhưng migrations chưa có index `updated_at`.

## 3) Thay đổi đề xuất (Baseline)

### 3.1. Tạo migration SQL (Supabase)
Tạo file migration mới:
- `apps/api/supabase/migrations/add_performance_indexes.sql`

Nội dung index đề xuất (dùng `create index if not exists ...`):
- **user_roles**
  - `idx_user_roles_role_id` trên `public.user_roles(role_id)`
  - (tuỳ chọn) `idx_user_roles_role_id_user_id` trên `(role_id, user_id)` nếu cần optimize join mạnh theo role rồi về user.
- **users**
  - `idx_users_status` trên `public.users(status)`
  - `idx_users_created_at` trên `public.users(created_at desc)`
  - (tuỳ chọn) `idx_users_status_created_at` trên `(status, created_at desc)` nếu list/filter status là path chính.
- **products**
  - `idx_products_created_at` trên `public.products(created_at desc)`
  - `idx_products_updated_at` trên `public.products(updated_at desc)`
  - `idx_products_title` trên `public.products(title)` (phục vụ sort title; không tối ưu ilike search)
  - `idx_products_genres_gin` trên `public.products using gin (genres)`
  - `idx_products_use_cases_gin` trên `public.products using gin (use_cases)`
  - (tuỳ chọn) `idx_products_status_created_at` trên `(status, created_at desc)` vì list admin/filter status + sort time rất phổ biến.
- **compliance_reviews**
  - `idx_compliance_reviews_updated_at` trên `public.compliance_reviews(updated_at desc)`
  - (tuỳ chọn) `idx_compliance_reviews_status_updated_at` trên `(legal_status, review_status, updated_at desc)` nếu thường filter cả 2 + sort updated_at.

Ràng buộc/thực thi:
- Không dùng `create index concurrently` trong migration baseline để giữ đơn giản (Supabase migrations hay chạy trong transaction). Nếu prod data lớn, sẽ lên kế hoạch “online indexing” riêng.

### 3.2. Báo cáo kỹ thuật
Tạo report:
- `docs/reports/supabase-indexing-report.md`

Nội dung report:
- Inventory index hiện có theo từng bảng (trích từ migrations).
- Bảng mapping “query pattern → index đề xuất” (users/user_roles/products/compliance).
- Danh sách index mới sẽ tạo + lý do + tradeoff (read speed vs write overhead).
- Hướng dẫn apply (Supabase migration) + rollback (drop index) nếu cần.

## 4) Verify sau khi apply
- Apply migration lên Supabase dev.
- Chạy:
  - `pnpm -C apps/api typecheck`
  - `pnpm -C apps/api test`
  - `pnpm -C apps/api test:e2e`
- Kiểm tra nhanh các query trọng điểm bằng `explain` (trên các endpoint list) để xác nhận planner dùng index (ít nhất cho: users by role/status, products contains(genres), compliance order updated_at).

## 5) Tiêu chí hoàn thành
- Có report markdown dễ đọc + actionable.
- Migration chạy thành công trên Supabase dev.
- Không phát sinh lỗi compile/test.
- Các endpoint list chính (admin users, products, compliance) có dấu hiệu dùng index (giảm full scan ở các case phổ biến).

## 6) Giả định & quyết định
- Không triển khai pg_trgm/trigram index ở đợt này (theo lựa chọn Baseline).
- Ưu tiên index cho filter/sort/contains phổ biến; tránh over-index các cột ít dùng.

