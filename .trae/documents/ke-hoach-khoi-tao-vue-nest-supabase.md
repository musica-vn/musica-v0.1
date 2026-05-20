# Kế hoạch khởi tạo dự án (Vue/Vite + Pinia/Router + PrimeVue + VueUse/Axios) & (NestJS + Swagger) & Supabase

## 1) Tóm tắt

* Khởi tạo **monorepo pnpm workspaces** gồm:

  * `apps/web`: Vue 3 + Vite + TypeScript + Pinia + Vue Router + PrimeVue + VueUse + Axios

  * `apps/api`: NestJS + Swagger/OpenAPI (xuất JSON để FE generate types)

  * `packages/contracts`: chuẩn hoá **API request/response**, pagination + metadata dùng chung FE/BE

* Database dùng **Supabase**: chỉ setup **.env templates**, và tự động hoá **schema-as-code** bằng **Supabase CLI migrations** để khi schema thay đổi (qua migrations) có thể sync lên Supabase remote qua pipeline/deploy hooks.

* Deploy:

  * FE deploy lên **Netlify**

  * BE deploy lên **Render**

## 2) Phân tích hiện trạng

* Repo tại `c:\Users\LHP02\Desktop\musica-v0.1` hiện **đang rỗng**, chưa có `package.json`/source/config.

* Vì repo trống nên kế hoạch tập trung vào scaffolding + conventions từ đầu, không có ràng buộc legacy.

## 3) Quyết định & giả định (đã chốt)

* Monorepo: **pnpm workspaces**

* UI: **PrimeVue**

* BE: **NestJS + Swagger**

* Schema-as-code: **Supabase CLI migrations**

* Domain mẫu: **skeleton tối thiểu**

* Auth: **chưa tích hợp ngay**

* FE types: **auto-generate từ Swagger/OpenAPI**

* Pagination: **offset-based** (`page`, `pageSize`)

## 4) Kiến trúc thư mục đề xuất

* `pnpm-workspace.yaml`

* `package.json` (root) + `tsconfig.base.json` (nếu dùng)

* `apps/`

  * `web/`

  * `api/`

* `packages/`

  * `contracts/`

* `supabase/` (do Supabase CLI quản lý: migrations, config)

* `.env.example` (root) và `.env.example` theo app

* `netlify.toml`, `render.yaml` (hoặc cấu hình Render UI; ưu tiên `render.yaml` để version hoá)

## 5) Chuẩn hoá API contracts (request/response/pagination/metadata)

### 5.1 Types dùng chung (đặt trong `packages/contracts`)

* `ApiSuccessResponse<TData, TMeta = undefined>`:

  * `success: true`

  * `statusCode: number`

  * `data: TData`

  * `meta?: TMeta`

  * `requestId: string`

  * `timestamp: string` (ISO)

* `ApiErrorResponse`:

  * `success: false`
  * `statusCode: number`


  * `error: { code: string; message: string; details?: unknown }`

  * `requestId: string`

  * `timestamp: string`

### 5.2 Pagination + list response

* Query chuẩn:

  * `page` (>= 1, default 1)

  * `pageSize` (>= 1, <= 100, default 20)

  * `q` (optional search keyword)

  * `sort` (optional, ví dụ `createdAt:desc`)

* `PaginationMeta`:

  * `pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean }`

* List response dạng:

  * `ApiSuccessResponse<{ items: T[] }, PaginationMeta>`

### 5.3 Mapping vào NestJS

* Global interceptor:

  * Gói mọi response thành `ApiSuccessResponse` (set `statusCode` theo HTTP response)

* Global exception filter:

  * Chuẩn hoá lỗi thành `ApiErrorResponse` (mapping từ `HttpException`/unknown errors, set `statusCode`)

* DTO validation:

  * Dùng `class-validator`/`class-transformer` + `ValidationPipe` global (whitelist, transform)

## 6) FE (Vue/Vite) – thiết kế khởi tạo

### 6.1 Stack & cấu hình

* Vue 3 + Vite + TypeScript

* State: Pinia (setup stores theo module)

* Routing: Vue Router (route-level code splitting)

* UI: PrimeVue + theme (chọn 1 preset theme ổn định) + icon set phù hợp

* Utilities: `@vueuse/core`

* HTTP: Axios

### 6.2 API client + types generation

* BE expose OpenAPI JSON (file hoặc endpoint).

* FE chạy script để:

  * fetch OpenAPI spec từ `apps/api` (local) hoặc từ file build output

  * generate `*.d.ts` / types vào `apps/web/src/shared/api/generated/`

* `apps/web/src/shared/api/http.ts`:

  * `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })`

  * interceptors:

    * unwrap `ApiResponse`

    * chuẩn hoá lỗi sang 1 error type (`ApiClientError`)

### 6.3 Skeleton UI tối thiểu

* `AppLayout` + 1–2 pages:

  * `Home`

  * `ExampleList` (call BE list endpoint có pagination)

* Components theo pattern:

  * `src/components/` cho UI reusable

  * `src/features/` cho module/page-specific logic

## 7) BE (NestJS) – thiết kế khởi tạo

### 7.1 Stack & cấu hình

* NestJS + TypeScript

* Swagger:

  * `/docs` (Swagger UI)

  * `/docs-json` hoặc script xuất `openapi.json`

* Modules tối thiểu:

  * `HealthModule` (`GET /health`)

  * `ExampleModule` (`GET /examples` trả list + pagination meta)

### 7.2 Persistence (Supabase)

* Kết nối Postgres của Supabase:

  * Ưu tiên dùng `DATABASE_URL` để app truy cập DB

* Truy cập Supabase APIs (nếu cần về sau):

  * `SUPABASE_URL`

  * `SUPABASE_SERVICE_ROLE_KEY` (chỉ BE, tuyệt đối không đưa sang FE)

## 8) Supabase – schema-as-code & tự động sync


* Dùng Supabase CLI để quản lý migrations trong `supabase/migrations`.

* Quy ước:

  * Mọi thay đổi schema phải đi qua migration (không chỉnh trực tiếp trên dashboard nếu muốn giữ “single source of truth”).

### 8.2 Scripts đề xuất (root/package.json)

* `db:start`: chạy local supabase (nếu dùng local)

* `db:diff`: generate migration từ schema thay đổi

* `db:push`: apply migrations lên Supabase remote (CI/deploy)

* `db:pull`: pull schema về local (khi cần sync ngược)

### 8.3 Lệnh Supabase cần chạy khi bắt đầu dự án (bootstrap)
- Đăng nhập CLI:
  - `supabase login`
- Init folder Supabase trong repo:
  - `supabase init`
- Link repo với Supabase project remote:
  - `supabase link --project-ref <SUPABASE_PROJECT_REF>`
- (Khuyến nghị) kéo schema remote về local để tạo baseline:
  - `supabase db pull`
- (Khuyến nghị) tạo migration đầu tiên/baseline (tuỳ workflow):
  - `supabase migration new init`
- Khi thay đổi schema (schema-as-code):
  - tạo migration mới: `supabase migration new <name>`
  - viết SQL trong file migration (hoặc dùng diff khi có local supabase): `supabase db diff --use-migra -f <name>`
- Sync migrations lên Supabase remote (automation):
  - `supabase db push`

### 8.4 CI/CD & secrets


  * `SUPABASE_ACCESS_TOKEN`

  * `SUPABASE_PROJECT_REF`

  * `SUPABASE_DB_PASSWORD` (hoặc connection string tương ứng)

* Render predeploy command:

  * chạy `db:push` trước khi start API để đảm bảo schema cập nhật

## 9) Deploy plan

### 9.1 Netlify (FE)

* `netlify.toml`:

  * base directory: `apps/web`

  * build: `pnpm -w build --filter web` (tuỳ theo workspace scripts)

  * publish: `apps/web/dist`

* Env trên Netlify:

  * `VITE_API_BASE_URL`

  * (nếu FE dùng Supabase trực tiếp về sau) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 9.2 Render (BE)

* `render.yaml` (hoặc cấu hình UI):

  * build command: `pnpm -w build --filter api`

  * start command: `pnpm -w start --filter api` (hoặc `node dist/main.js`)

  * predeploy: `pnpm -w db:push`

* Env trên Render:

  * `NODE_ENV`

  * `PORT`

  * `DATABASE_URL`

  * `SUPABASE_*` (nếu dùng)

## 10) Danh sách thay đổi cụ thể theo file (executor checklist)

### 10.1 Root

* Tạo `package.json` (root) + `pnpm-workspace.yaml`

* Tạo scripts workspace: `dev`, `build`, `lint`, `typecheck`, `gen:openapi`, `gen:types`, `db:*`

* Tạo `.env.example` + `.gitignore`

### 10.2 `packages/contracts`

* Tạo package TypeScript export:

  * `ApiResponse` types

  * `PaginationMeta`

  * helper types cho list payload

### 10.3 `apps/api` (NestJS)

* Khởi tạo NestJS project (TS) + cấu hình Swagger

* Thêm global pipes/interceptor/exception filter theo contracts

* Thêm `HealthModule`, `ExampleModule` (pagination response)

* Thêm script generate `openapi.json` (để FE consume)

### 10.4 `apps/web` (Vue/Vite)

* Khởi tạo Vue 3 + TS

* Setup Pinia + Router

* Setup PrimeVue + theme

* Setup VueUse

* Setup Axios client (baseURL từ env) + typed wrappers

* Thêm script `gen:types` để generate types từ openapi.json

* Tạo minimal pages/layout + call list endpoint

### 10.5 Supabase

* Init Supabase CLI (`supabase/` folder)

* Tạo migrations baseline

* Thêm scripts `db:diff`, `db:push` và tài liệu env/secrets

## 11) Verification (cách xác nhận hoàn thành)

* Monorepo:

  * cài deps bằng pnpm thành công

  * chạy dev FE/BE cùng lúc được

* BE:

  * mở `/docs` xem Swagger UI hoạt động

  * endpoint `/health` trả `ApiSuccessResponse`

  * endpoint list trả `items` + `meta.pagination`

* FE:

  * build thành công

  * route hoạt động

  * gọi được list endpoint và render dữ liệu

  * types được generate từ OpenAPI và compile không lỗi

## 12) README.md (tổng quan + hướng dẫn lệnh Supabase)
### 12.1 Nội dung README đề xuất (sẽ tạo trong bước thực thi)
- Tổng quan:
  - monorepo structure (`apps/web`, `apps/api`, `packages/contracts`)
  - tech stack FE/BE + mục tiêu chuẩn hoá response/pagination
- Quick start:
  - cài pnpm deps
  - chạy dev FE/BE
  - generate OpenAPI + generate FE types
- Supabase workflow (auto sync):
  - các lệnh bootstrap: `supabase login/init/link/db pull`
  - tạo migration mới + quy ước “không sửa schema trực tiếp trên dashboard”
  - apply remote: `supabase db push`
  - secrets cần có để chạy CI/deploy
- Deploy:
  - Netlify (web) env vars
  - Render (api) env vars + predeploy `db:push`

* Supabase:

  * chạy `db:push` apply migration lên project Supabase remote thành công (dùng secrets)
