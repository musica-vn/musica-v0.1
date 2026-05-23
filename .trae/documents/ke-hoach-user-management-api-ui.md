# Kế hoạch xây dựng API + UI cho User Management (BUYER/ARTIST)

## 1) Summary

* Mục tiêu: triển khai đầy đủ **User Management** cho **BUYER** và **ARTIST** (quản lý chung, khác nhau ở `roleCode`) gồm: **List/Search/Pagination**, **Create**, **Edit** (email/fullName/password/role), **Lock/Unlock**, **Soft delete**.

* Quyền truy cập: chỉ **ADMIN** và **SUPER\_ADMIN** được thao tác các API/UI này.

* Giữ nguyên phần **Admin management** hiện có (`/admin/users/admins`) do **SUPER\_ADMIN** quản lý.

* Đảm bảo API tuân thủ response envelope + pagination meta + requestId theo `@musica/contracts` (đã có interceptor/filter/middleware).

## 2) Current State Analysis (grounded)

### Backend (NestJS)

* Đã có module `admin-users` với CRUD cho Admin: [admin-users.controller.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/admin-users/admin-users.controller.ts), [admin-users.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/admin-users/admin-users.service.ts)

* Đã có `JwtAuthGuard` + `RolesGuard` + `RequireRoles` (hỗ trợ nhiều role): [jwt-auth.guard.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/auth/jwt-auth.guard.ts), [roles.guard.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/auth/roles.guard.ts)

* Supabase schema đã có `users`, `roles`, `user_roles`, enum `user_status`: [remote\_schema.sql](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L25-L52)

* Chưa có endpoints riêng cho Buyer/Artist.

### Frontend (Vue 3)

* Trang Admin list đã hoàn thiện UI + gọi API thật qua store/api: [AdminListPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/AdminListPage.vue), [admins.store.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/features/admins/admins.store.ts)

* Buyer/Artist management pages đang dummy: [BuyerManagementPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/BuyerManagementPage.vue), [ArtistManagementPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/ArtistManagementPage.vue)

* Router đã có route `/admin/users/buyers`, `/admin/users/artists`: [router/index.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/router/index.ts#L35-L38)

## 3) Assumptions & Decisions (đã chốt với bạn)

* Scope: quản lý chung BUYER/ARTIST (chỉ khác role).

* Roles truy cập: `ADMIN` và `SUPER_ADMIN`.

* Actions: CRUD đầy đủ + lock/unlock + soft delete.

* Soft delete: cập nhật `users.status = 'DELETED'` (không xoá row để tránh đụng FK `tracks/certificates`).

## 4) Proposed Changes (API)

### 4.1 Thiết kế endpoints

Tạo nhóm endpoints mới cho Buyer/Artist theo hướng **unified** (role-driven), để UI có thể quản lý chung:

* `GET /admin/users`

  * Query: `page`, `pageSize`, `q?`, `status?`, `roleCode?`

  * `roleCode` ∈ `BUYER | ARTIST`

  * Nếu `roleCode` không truyền: list cả BUYER + ARTIST (phục vụ màn “quản lý chung”).

  * Response: `{ data: { items }, meta.pagination }`

* `POST /admin/users`

  * Body: `email`, `fullName`, `password`, `roleCode` (BUYER/ARTIST)

  * Response: user vừa tạo (kèm `roleCodes`)

* `PATCH /admin/users/:userId`

  * Body: `email?`, `fullName?`, `password?`, `roleCode?` (BUYER/ARTIST)

  * Cho phép đổi role BUYER <-> ARTIST.

* `PATCH /admin/users/:userId/status`

  * Body: `status` ∈ `ACTIVE | LOCKED`

* `DELETE /admin/users/:userId`

  * Soft delete: set `status = 'DELETED'`

Auth:

* `@UseGuards(JwtAuthGuard, RolesGuard)`

* `@RequireRoles('ADMIN', 'SUPER_ADMIN')`

### 4.2 Backend file-level changes

**Tạo module mới** `managed-users` (tên có thể chốt khi implement, nhưng plan dùng thống nhất):

* Thêm folder: `apps/api/src/managed-users/`

  * `managed-users.module.ts`

  * `managed-users.controller.ts`

  * `managed-users.service.ts`

  * `managed-users.dto.ts`

  * `managed-users.swagger.ts`

* Import module vào `AppModule`: [app.module.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/app.module.ts)

### 4.3 DTO & Validation

Tương tự `admin-users.dto.ts` nhưng giới hạn role:

* `ManagedUserListQueryDto extends PaginationQueryDto`

  * `status?: 'ACTIVE'|'LOCKED'|'DELETED'`

  * `roleCode?: 'BUYER'|'ARTIST'`

* `CreateManagedUserRequestDto`

  * `email` (IsEmail)

  * `fullName` (MinLength(1))

  * `password` (MinLength(8))

  * `roleCode` (IsIn(\['BUYER','ARTIST']))

* `UpdateManagedUserRequestDto` (partial)

* `UpdateManagedUserStatusRequestDto` (`ACTIVE|LOCKED`)

### 4.4 Service logic (Supabase)

Implement tương tự [admin-users.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/admin-users/admin-users.service.ts) nhưng:

* Role scope chỉ `BUYER`/`ARTIST` (tuyệt đối không cho set `ADMIN`/`SUPER_ADMIN`).

* `listUsers`:

  * Join `users` + `user_roles!inner(role_id, role:roles(code))`

  * Filter `role_id` theo `roleCode` (1 role) hoặc theo cả 2 role IDs nếu không truyền.

  * Default filter loại `DELETED` nếu không truyền `status`.

  * Search `q` trên `email` và `full_name` bằng `ilike` + `or(...)`.

  * Pagination dùng `.range(from,to)` và `count: 'exact'`.

* `createUser`:

  * Insert `users` (hash password bằng `bcryptjs/hash`).

  * Insert `user_roles`.

  * Nếu email duplicate (Postgres code `23505`) trả 409.

* `updateUser`:

  * Update `users` fields; nếu `password` có thì update `password_hash`.

  * Nếu đổi role: xoá user\_roles trong scope BUYER/ARTIST rồi insert role mới.

* `updateStatus`: update `users.status`.

* `softDelete`: set `users.status='DELETED'`.

### 4.5 Swagger/OpenAPI artifact

Vì FE có script `gen:types` dựa vào `apps/api/openapi.json`, plan gồm:

* Sau khi thêm endpoints, chạy `apps/api` build + `gen:openapi` để regenerate `apps/api/openapi.json`.

* Đồng bộ config swagger trong `src/openapi.ts` với runtime (khuyến nghị thêm `.addBearerAuth()` để schema phản ánh Authorization header).

### 4.6 Testing (BE)

Thêm e2e test theo pattern mock service (giống [admin-users.e2e-spec.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/test/admin-users.e2e-spec.ts)):

* File mới: `apps/api/test/managed-users.e2e-spec.ts`

  * Case: no token -> 401

  * Token role khác (BUYER/ARTIST) -> 403

  * Token ADMIN/SUPER\_ADMIN -> 200 list + meta.pagination

  * POST -> 201 + envelope

  * PATCH status -> 200

## 5) Proposed Changes (UI)

### 5.1 UI structure decision

Giữ route/menu hiện tại (Buyers/Artists) nhưng dùng **chung 1 page/component** để giảm trùng lặp:

* Tạo page mới: `apps/web/src/views/admin/UserManagementPage.vue`

  * Nhận prop `initialRole: 'BUYER'|'ARTIST'`

  * Có filter role (BUYER/ARTIST) mặc định theo prop nhưng cho phép đổi.

  * Dùng PrimeVue `DataTable` + `Dialog` + `InputText` + `Password` + `Dropdown` + `Tag` tương tự [AdminListPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/AdminListPage.vue)

* Update router để map 2 route vào 1 component và truyền props:

  * `/admin/users/buyers` -> `initialRole='BUYER'`

  * `/admin/users/artists` -> `initialRole='ARTIST'`

### 5.2 FE feature module

Tạo feature mới cho API/store/types (theo pattern `features/admins/*`):

* Folder: `apps/web/src/features/managed-users/`

  * `managed-users.api.ts`

  * `managed-users.store.ts`

  * `managed-users.types.ts`

API layer dùng wrapper hiện có: [http.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/shared/api/http.ts)

* `listManagedUsers(params)` gọi `GET /admin/users`

* `createManagedUser(payload)` gọi `POST /admin/users`

* `updateManagedUser(userId,payload)` gọi `PATCH /admin/users/:userId`

* `updateManagedUserStatus(userId,status)` gọi `PATCH /admin/users/:userId/status`

* `deleteManagedUser(userId)` gọi `DELETE /admin/users/:userId`

Store:

* `items`, `meta`, `isLoading`

* Actions: `fetchUsers`, `createOne`, `updateOne`, `setStatus`, `removeOne`

Types:

* `ManagedUser` tương tự `AdminUser` nhưng `roleCodes` giới hạn `('BUYER'|'ARTIST')[]` (và vẫn dùng `UserStatus` từ auth types).

### 5.3 UI behaviors & edge cases

* Search + status filter + pagination (lazy) giống Admin list.

* Create/Edit dialogs:

  * Create: bắt buộc email/fullName/password/roleCode.

  * Edit: password optional; roleCode editable (BUYER/ARTIST).

* Lock/Unlock:

  * Confirm trước khi gọi API.

* Delete:

  * Confirm “soft delete”.

  * Sau delete: reload list.

* Error mapping:

  * Nếu API trả 409: hiển thị “Email đã tồn tại” (reuse logic từ Admin list).

### 5.4 Typegen (optional nhưng khuyến nghị)

Sau khi BE regenerate `openapi.json`:

* Chạy FE `gen:types` để cập nhật `apps/web/src/shared/api/generated/schema.d.ts` (giúp typed calls về sau).

## 6) Verification (Acceptance Criteria)

### 6.1 API (Swagger + e2e)

* Swagger hiển thị đủ nhóm endpoints `/admin/users` và mô tả auth bearer.

* Các endpoint trả đúng envelope `success/statusCode/data/meta/requestId/timestamp`.

* List endpoints trả `meta.pagination` đúng (page/pageSize/totalItems/totalPages/hasNext/hasPrev).

* e2e tests pass cho: 401/403/happy path.

### 6.2 UI (manual smoke)

* Login bằng ADMIN hoặc SUPER\_ADMIN:

  * Vào `/admin/users/buyers` list đúng, CRUD hoạt động.

  * Vào `/admin/users/artists` list đúng, CRUD hoạt động.

* Search/status filter/pagination hoạt động; reload sau thao tác.

* Các lỗi thường gặp (email trùng) hiển thị rõ ràng.

## 7) Rollout Notes

* Không thay đổi schema DB trong scope này (dùng tables `users/roles/user_roles` hiện có).

* Các API mới không ảnh hưởng `admin-users` hiện tại.

