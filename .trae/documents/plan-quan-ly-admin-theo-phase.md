# Kế hoạch theo Phase: Quản lý Admin (Super Admin only)

## 1) Summary

Mục tiêu: xây tính năng “Admin Management” để **Super Admin** có thể:
- Xem danh sách admin
- Tạo admin mới
- Edit admin (full name / email / password / role)
- Tạm khoá (LOCKED) admin
- Xoá (soft delete = status `DELETED`)

Nguyên tắc triển khai: **thiết kế API + test trước**, sau đó mới nối UI, chia thành các phase nhỏ để bạn làm tới đâu test tới đó.

Out of scope (theo yêu cầu): usage_rights, certificates, audio upload/preview.

## 2) Current State Analysis (repo thực tế)

### Backend (`apps/api`)
- Đã có `POST /auth/login` dùng Supabase Postgres (`users`, `user_roles`, `roles`), bcrypt verify, trả JWT + roles: [auth.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/auth/auth.service.ts#L23-L85)
- Đã có chuẩn response envelope + requestId:
  - [ApiResponseInterceptor](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/api-response.interceptor.ts)
  - [ApiExceptionFilter](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/api-exception.filter.ts)
  - [RequestIdMiddleware](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/request-id.middleware.ts)
- Chưa có JWT guard/roles guard cho protected routes, chưa có module `admin users`.
- DB schema có `users.status` enum `ACTIVE|LOCKED|DELETED`: [remote_schema.sql](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L25-L33)
- Seed data có `superadmin@musica.local`, `admin01@musica.local`, `admin02@musica.local`… với password `Password123!`: [supabase-seed-mvp.sql](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/supabase/migrations/supabase-seed-mvp.sql#L21-L45)

### Frontend (`apps/web`)
- Có route `/admin/admins` và page dummy: [AdminListPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/AdminListPage.vue)
- Guard hiện tại chỉ check “isAdmin” (ADMIN hoặc SUPER_ADMIN), chưa phân biệt super admin cho màn admin list: [router/index.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/router/index.ts#L47-L50)

## 3) Decisions (đã chốt với bạn)

- “Creator” map thành role **ARTIST** (Creator không được truy cập Admin List).
- “Delete admin” là **soft delete**: set `status = 'DELETED'`.
- **Không cho chỉnh** (LOCK/DELETE) user có role `SUPER_ADMIN` để tránh tự khoá hệ thống.

## 4) Proposed API Design (Swagger-first, envelope có sẵn)

### Auth (đã có)
- `POST /auth/login`

### Admin management (Super Admin only)

Base path đề xuất (khớp docs định hướng): `/admin/users/admins`

1) **List admins**
- `GET /admin/users/admins`
- Query: `page`, `pageSize`, `q` (tìm theo email/full_name), `sort` (tạm support `createdAt:desc|asc`)
- Response data:
  - `items: AdminDto[]`
  - `meta.pagination` theo `@musica/contracts`

`AdminDto`:
- `id: string`
- `fullName: string`
- `email: string`
- `status: 'ACTIVE'|'LOCKED'|'DELETED'`
- `roleCodes: string[]` (tối thiểu chứa `ADMIN` hoặc `SUPER_ADMIN`)
- `createdAt: string`

2) **Create admin**
- `POST /admin/users/admins`
- Body:
  - `email`, `fullName`, `password`
  - `roleCode` (default `ADMIN`)
- Rules:
  - Email unique (DB đã unique) → nếu trùng trả 409
  - status mặc định `ACTIVE`

3) **Edit admin**
- `PATCH /admin/users/admins/:adminId`
- Body (optional):
  - `fullName`, `email`, `password`, `roleCode`
- Rules:
  - Không cho edit user có role `SUPER_ADMIN`
  - Nếu đổi email trùng → 409

4) **Lock/Unlock admin**
- `PATCH /admin/users/admins/:adminId/status`
- Body: `{ status: 'ACTIVE' | 'LOCKED' }`
- Rules:
  - Không cho lock/unlock `SUPER_ADMIN`
  - Khi status != ACTIVE → login bị chặn (đã có sẵn trong `AuthService`)

5) **Delete admin (soft)**
- `DELETE /admin/users/admins/:adminId`
- Behavior: set `status = 'DELETED'`
- Rules:
  - Không cho delete `SUPER_ADMIN`

### Authorization (bắt buộc)
- Tất cả endpoints `/admin/users/admins*` yêu cầu:
  - JWT hợp lệ
  - token có role `SUPER_ADMIN`

## 5) Phases triển khai (từng scope nhỏ, làm tới đâu test tới đó)

### Phase 0 — Chuẩn bị môi trường & seed data (không code)
Mục tiêu: đảm bảo bạn có thể login bằng seed user.
- Start Supabase local (nếu dùng local) và apply migrations + seed.
- Start API (`apps/api`) và mở Swagger `/docs`.
- Test `POST /auth/login` với:
  - `superadmin@musica.local` / `Password123!`
  - `admin01@musica.local` / `Password123!`
  - `artist01@musica.local` / `Password123!`
Kỳ vọng:
- Super admin login trả `roles` chứa `SUPER_ADMIN`.
- Admin login trả `roles` chứa `ADMIN`.

### Phase 1 — Nền tảng AuthZ cho NestJS (JWT guard + Roles guard)
Mục tiêu: có cơ chế bảo vệ route trước khi làm admin endpoints.
- Thêm `JwtAuthGuard` (verify `Authorization: Bearer <token>` bằng `JWT_SECRET`)
- Thêm `RolesGuard` + decorator `@RequireRoles(...roles)`
- Thêm `@CurrentUser()` để lấy `{ userId, roles }` từ request (nếu cần)
- Bổ sung Swagger security scheme Bearer auth trong [main.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/main.ts)

Test (Swagger):
- Gọi 1 endpoint protected “dummy” (có thể tạo `/auth/me` hoặc `/admin/ping`) để xác nhận:
  - Không có token → 401
  - Token ADMIN → 403 khi yêu cầu SUPER_ADMIN
  - Token SUPER_ADMIN → 200

### Phase 2 — API: GET list admins
Mục tiêu: endpoint read-only, dễ test nhất.
- Tạo module `admin-users` (hoặc `super-admin`) với controller `/admin/users/admins`
- Implement `GET /admin/users/admins`
  - Query users join roles qua `user_roles` để lọc các user có role `ADMIN|SUPER_ADMIN`
  - Default: exclude `DELETED` (hoặc để filter bằng query, tuỳ bạn chọn; đề xuất exclude để giống “đã xoá”)
  - Implement pagination (`PaginationQueryDto` đã có): [pagination.dto.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/common/pagination.dto.ts)

Test:
- SUPER_ADMIN token gọi list → thấy ít nhất `admin01`, `admin02`, `superadmin`.
- ADMIN token gọi list → 403.
- ARTIST token gọi list → 403.

### Phase 3 — API: POST create admin
Mục tiêu: tạo mới admin, validate email unique.
- Implement `POST /admin/users/admins`
  - Hash password bằng `bcryptjs.hash` (tương thích `bcryptjs.compare`)
  - Insert `users` trước, sau đó insert `user_roles` role `ADMIN`
  - Nếu insert fail do email unique → trả 409 (Conflict)

Test:
- Tạo admin mới email chưa tồn tại → list tăng thêm 1 record.
- Tạo admin email trùng → 409.

### Phase 4 — API: PATCH edit admin
Mục tiêu: sửa thông tin admin.
- Implement `PATCH /admin/users/admins/:adminId`
  - Cho phép update `full_name`, `email`, `password_hash` (nếu có password mới), role (nếu cho)
  - Chặn thao tác nếu target có role `SUPER_ADMIN`

Test:
- Update fullName/email/password của 1 admin.
- Login bằng password mới (nếu bạn đổi password) để confirm.
- Thử edit superadmin → 403.

### Phase 5 — API: LOCK/UNLOCK admin
Mục tiêu: enforce “bị khoá không login được”.
- Implement `PATCH /admin/users/admins/:adminId/status`
  - Update `users.status` = `LOCKED` hoặc `ACTIVE`
  - Chặn thao tác nếu target `SUPER_ADMIN`

Test:
- Lock `admin02` → login `admin02` trả 403 (`User is not active`).
- Unlock → login lại OK.

### Phase 6 — API: DELETE (soft delete) admin
Mục tiêu: “xoá khỏi hệ thống” theo soft delete.
- Implement `DELETE /admin/users/admins/:adminId`
  - Update `users.status` = `DELETED`
  - Chặn thao tác nếu target `SUPER_ADMIN`

Test:
- Delete `admin01` → login `admin01` fail.
- List mặc định không hiển thị `DELETED` (nếu bạn chọn exclude).

### Phase 7 — UI: chặn truy cập Admin List cho non-superadmin
Mục tiêu: đúng requirement về phân quyền ngay cả ở UI.
- Router: route `/admin/admins` cần `requiresSuperAdmin`
- Guard: `isSuperAdmin` thay vì `isAdmin`
- Auth store: thêm computed `isSuperAdmin`

Test:
- Login ADMIN → vào `/admin/admins` bị redirect.
- Login ARTIST → không vào được admin area.

### Phase 8 — UI: Admin List (read-only, nối API)
Mục tiêu: thay dummy data bằng gọi API.
- Tạo `admins.api.ts` dùng axios wrapper `apiGet`
- Tạo `admins.store.ts` (Pinia) để load list + pagination
- Update [AdminListPage.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/admin/AdminListPage.vue) hiển thị:
  - columns: Admin ID, Full Name, Email, Role, Status, Created At

Test:
- Load page thấy đúng seed admins.
- Pagination hoạt động.

### Phase 9 — UI: Create Admin
Mục tiêu: tạo admin từ UI.
- Form modal: `fullName`, `email`, `password`, `role` (default ADMIN), `status` (fixed ACTIVE)
- Handle errors:
  - 409 → hiển thị “Email đã tồn tại”

Test:
- Create thành công → list refresh.
- Create trùng email → show error.

### Phase 10 — UI: Edit + Lock + Delete
Mục tiêu: hoàn thiện admin actions.
- Edit modal (fullName/email/password/role)
- Action buttons trên table row:
  - Lock/Unlock (call PATCH status)
  - Delete (call DELETE)
- Chặn thao tác đối với superadmin (ẩn button hoặc disable)

Test:
- Lock admin → login fail.
- Delete admin → biến mất khỏi list (default).

## 6) File-level plan (BE/FE sẽ sửa ở execution)

### Backend (dự kiến)
- `apps/api/src/common/auth/*` (guards, decorators, types)
- `apps/api/src/admin-users/*` (module/controller/service/dto/swagger)
- `apps/api/src/app.module.ts` (register module)
- `apps/api/src/main.ts` (Swagger bearer auth)

### Frontend (dự kiến)
- `apps/web/src/features/admins/*` (api + store)
- `apps/web/src/views/admin/AdminListPage.vue` (replace dummy)
- `apps/web/src/features/auth/auth.store.ts` (isSuperAdmin)
- `apps/web/src/router/index.ts` (requiresSuperAdmin)

## 7) Verification checklist (Definition of Done)
- SUPER_ADMIN:
  - Xem list admins (API + UI)
  - Tạo admin mới (reject email trùng)
  - Edit admin
  - Lock admin → admin đó không login được
  - Delete (soft) admin → admin đó không login được, không xuất hiện trong list mặc định
- ADMIN:
  - Không truy cập được admin list (API trả 403, UI redirect)
- ARTIST (Creator):
  - Không truy cập được admin list (API 403, UI redirect)

