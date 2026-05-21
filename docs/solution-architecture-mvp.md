# Solution Architecture MVP

## 1. Mục tiêu

Tài liệu này map bài toán business licensing marketplace sang codebase hiện tại để đội phát triển có thể triển khai theo hướng thực dụng, không tách rời stack đang có.

## 2. Stack được chốt theo codebase

### Frontend

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Axios
- PrimeVue
- Deploy: Netlify

### Backend

- NestJS
- Swagger/OpenAPI
- ValidationPipe
- Response/Error envelope theo `@musica/contracts`
- Deploy: Render

### Shared

- `packages/contracts` cho API contracts

### Data layer

- Supabase Postgres
- Supabase Storage
- Supabase CLI workflow trong `apps/api/supabase`

## 3. Kiến trúc tổng thể

```text
Buyer/Admin/Super Admin
        |
        v
   Vue 3 Frontend (Netlify)
        |
        v
   NestJS API (Render)
        |
        +---- Postgres (Supabase)
        |
        +---- Storage (Supabase)
        |
        +---- OpenAPI JSON -> FE generated types
```

## 4. Module boundaries đề xuất

MVP nên giữ theo hướng modular monolith, mỗi domain là một module rõ trách nhiệm.

### 4.1 IAM

Trách nhiệm:

- login
- profile
- roles
- route/API authorization

### 4.2 Users

Trách nhiệm:

- Super Admin quản lý Admin
- Admin quản lý Artist và Buyer
- user status lifecycle

### 4.3 Tracks

Trách nhiệm:

- track metadata
- upload keys
- publish/hide
- usage rights

### 4.4 Catalog

Trách nhiệm:

- public/buyer catalog
- filter/search
- track detail cho buyer

### 4.5 Checkout

Trách nhiệm:

- validate purchase request
- mock payment success
- orchestration certificate generation

### 4.6 Certificates

Trách nhiệm:

- snapshot dữ liệu pháp lý
- PDF generation
- signed download URL
- listing/search

### 4.7 Dashboard

Trách nhiệm:

- summary stats
- charts/trends cơ bản

## 5. Mapping sang codebase hiện tại

## 5.1 Frontend

Codebase hiện đã có cấu trúc phù hợp để mở rộng theo domain:

- `apps/web/src/features/*` cho feature modules
- `apps/web/src/router` cho route map
- `apps/web/src/shared/api` cho axios client và generated types
- `apps/web/src/views` cho page shells

### Đề xuất nhóm feature FE

- `features/auth`
- `features/admin-users`
- `features/tracks`
- `features/catalog`
- `features/certificates`
- `features/dashboard`

## 5.2 Backend

Codebase hiện đã có pattern NestJS module-based:

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/*`

### Đề xuất nhóm module BE

- `src/auth`
- `src/users`
- `src/tracks`
- `src/catalog`
- `src/checkout`
- `src/certificates`
- `src/dashboard`

## 5.3 Shared Contracts

- `packages/contracts` tiếp tục giữ:
  - success envelope
  - error envelope
  - pagination meta

Điều này giúp FE và BE thống nhất định dạng response ngay từ đầu.

## 6. Data flow theo nghiệp vụ

## 6.1 Ingestion flow

1. Admin thao tác trên FE admin
2. FE gọi BE để tạo track metadata
3. BE sinh signed upload URL cho original/preview
4. FE upload file vào Supabase Storage
5. FE gọi BE cập nhật `fileKey`
6. Admin publish track
7. Track xuất hiện ở catalog

## 6.2 Purchase flow

1. Buyer mở catalog trên FE
2. FE gọi catalog APIs từ BE
3. Buyer chọn usage rights và submit mock checkout
4. BE validate track + role + rights
5. BE tạo certificate record
6. BE generate PDF metadata/file
7. PDF lưu vào Supabase Storage
8. Buyer nhận certificate trong history

## 6.3 Operations flow

1. Super Admin/Admin mở dashboard
2. FE gọi summary APIs
3. BE aggregate dữ liệu từ users/tracks/certificates
4. FE render cards và bảng quản trị

## 7. OpenAPI-first workflow

Codebase hiện đã có nền tảng này sẵn:

- BE generate `openapi.json`
- FE generate types từ `openapi.json`

Luồng chuẩn:

1. Cập nhật DTOs/Swagger decorators ở NestJS
2. Generate OpenAPI JSON
3. Generate FE types
4. FE consume typed APIs qua `src/shared/api`

## 8. Deployment architecture

## 8.1 Frontend - Netlify

- Build từ `apps/web`
- Env chính: `VITE_API_BASE_URL`
- Public UI cho buyer/admin/super admin

## 8.2 Backend - Render

- Build/start từ `apps/api`
- Swagger expose tại `/docs`
- Có thể chạy `db:push` ở pre-deploy

## 8.3 Supabase

- Postgres cho domain data
- Storage cho file audio và certificate
- RLS có thể bổ sung theo từng phase

## 9. Security và boundary decisions

- Original audio luôn private
- Certificate PDF private, chỉ tải qua signed URL
- Buyer chỉ thấy certificates của mình
- Admin có quyền vận hành, Super Admin có quyền quản trị hệ thống
- Service role key chỉ dùng ở backend

## 10. Kiến trúc phù hợp cho MVP

Lý do chọn modular monolith trên stack hiện tại:

- Codebase NestJS đang phù hợp với module boundaries
- MVP cần đi nhanh hơn microservices
- Domain chưa đủ phức tạp để tách service
- Swagger/OpenAPI và contracts có thể giữ nhất quán dễ hơn

## 11. Khả năng mở rộng sau MVP

- Tách payment module thật
- Tách notification service
- Tách PDF generation worker
- Mở artist portal
- Bổ sung BI/reporting nâng cao
