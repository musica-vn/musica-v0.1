# Implementation Plan (Beginner-friendly) - Setup → API → Local Test

Tài liệu này hướng dẫn thứ tự implement dự án cho người mới làm quen với `Vue 3 + Vite` (FE), `NestJS + Swagger` (BE) và `Supabase` (DB/Storage), với mục tiêu sớm nhất là:

- chạy được backend ở local
- nhìn thấy Swagger UI
- kết nối Supabase (local hoặc remote)
- test API chạy ổn ở local

## Phase 0 - Prerequisites (chuẩn bị môi trường)

### 0.1 Cài công cụ

- Node.js (LTS)
- pnpm (đúng theo repo: `pnpm@11.x`)
- Git
- VS Code (khuyến nghị)

### 0.2 Kiến thức tối thiểu nên nắm

- `pnpm workspace`: chạy scripts theo package `apps/api`, `apps/web`
- `NestJS`: module/controller/service pattern
- `Swagger/OpenAPI`: API contract + test trực tiếp trên `/docs`
- `Supabase`: Postgres + Storage + CLI workflow

## Phase 1 - Setup repo và chạy BE local (chưa cần DB)

Mục tiêu: chạy được NestJS API ở local để có nền tảng test.

### 1.1 Install dependencies

Chạy ở root repo:

```bash
pnpm install
```

### 1.2 Start backend dev

```bash
pnpm --filter api dev
```

Mặc định backend chạy ở:

- `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- Health check: `GET http://localhost:3000/health`

### 1.3 Definition of Done

- BE start không lỗi
- Swagger `/docs` mở được
- `/health` trả response thành công theo envelope chuẩn

## Phase 2 - Kết nối Supabase (local hoặc remote)

Mục tiêu: chuẩn bị database/storage để khi implement API nghiệp vụ (users/tracks/certificates) có data layer thật.

## 2A. Chọn Supabase local (dễ cho người mới)

### 2A.1 Start Supabase local

```bash
pnpm db:start
```

### 2A.2 Kiểm tra thông tin kết nối

```bash
pnpm db:status
```

Lệnh này sẽ in ra các thông tin như:

- DB URL/port (Postgres)
- Supabase API URL
- anon key / service role key (tùy output)

### 2A.3 Tạo file env cho backend

Tạo file:

- `apps/api/.env`

Và khai báo tối thiểu (dùng Supabase SDK/Data APIs, không cần kết nối trực tiếp Postgres):

```bash
NODE_ENV=development
PORT=3000

SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=...
```

Sau đó restart backend (`pnpm --filter api dev`).

## 2B. Chọn Supabase remote (khi đã có project Supabase)

### 2B.1 Login + link project

```bash
pnpm --filter api sb:login
pnpm --filter api sb:link -- --project-ref <SUPABASE_PROJECT_REF>
```

### 2B.2 Pull schema và push migrations

```bash
pnpm db:pull
pnpm db:push
```

### 2B.3 Tạo `apps/api/.env` cho remote

```bash
NODE_ENV=development
PORT=3000

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2B.4 Definition of Done

- `pnpm db:status` (local) hoặc `db:pull/db:push` (remote) chạy được
- Backend có thể đọc env và khởi động lại không lỗi
- Không lộ secrets ra repo (không commit `.env`)

## Phase 3 - Implement API nghiệp vụ tối thiểu (Swagger-first)

Mục tiêu: tạo API routes tối thiểu cho MVP để có thể test end-to-end.

Khuyến nghị implement theo thứ tự (mỗi bước đều cập nhật Swagger decorators):

1. **Auth**
   - `POST /auth/login`
   - `GET /auth/me`
2. **User management**
   - `GET /admin/users`
   - `POST /admin/users`
   - `GET /admin/users/admins` (Super Admin)
3. **Tracks**
   - `POST /admin/products`
   - `PATCH /admin/products/:trackId/publish`
   - `GET /catalog/tracks`
4. **Checkout + Certificates**
   - `POST /buyer/checkout`
   - `GET /buyer/certificates`
   - `GET /buyer/certificates/:id/download`
5. **Dashboard**
   - `GET /admin/dashboard/summary`

Gợi ý danh sách routes đầy đủ: xem [rest-api-mvp.md](file:///c:/Users/Admin/Desktop/musica-v0.1/docs/rest-api-mvp.md).

### 3.1 Definition of Done

- Swagger hiển thị đúng routes + request/response schemas
- Tất cả responses trả về đúng envelope `@musica/contracts`
- List endpoints trả `meta.pagination`
- API có role-based protection (ít nhất cho admin/buyer)

## Phase 4 - Test API chạy ở local (Swagger + smoke checks)

Mục tiêu: xác nhận “API chạy được ở local” trước khi làm UI.

### 4.1 Test bằng Swagger UI

1. Mở `http://localhost:3000/docs`
2. Test theo thứ tự:
   - `/health`
   - `/auth/login`
   - `/admin/*` routes (bằng admin token)
   - `/catalog/*`
   - `/buyer/*`

### 4.2 Smoke checks tối thiểu cần pass

- Đăng nhập được ít nhất 1 admin và 1 buyer (seed/mock)
- Catalog chỉ trả tracks `PUBLISHED`
- Checkout tạo được certificate record (dù PDF có thể mock ở MVP)
- Buyer chỉ list được certificates của chính mình
- Admin list được certificates toàn hệ thống

### 4.3 Troubleshooting nhanh

- Backend không lên port 3000: kiểm tra `PORT` trong `apps/api/.env`
- Supabase local không chạy: chạy `pnpm db:status` để xem service nào failed
- API báo thiếu env: đảm bảo `apps/api/.env` tồn tại và backend đã restart

## Phase 5 (Sau khi API ổn) - FE UI (Login + Admin dashboard)

Chỉ bắt đầu phase UI khi Phase 4 pass, để tránh làm UI rồi phải sửa lại do API contract thay đổi.

- Login UI + auth store (Pinia)
- Admin dashboard summary
- Admin tables: users/tracks/certificates

## Checklist nhanh (cho người mới)

- [ ] `pnpm install`
- [ ] `pnpm --filter api dev`
- [ ] Mở `http://localhost:3000/docs`
- [ ] `pnpm db:start` (Supabase local) hoặc link remote
- [ ] tạo `apps/api/.env` và restart backend
- [ ] test APIs trên Swagger đến khi pass smoke checks
