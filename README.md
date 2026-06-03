# Musica Monorepo

## Tổng quan
- FE: Vue 3 + Vite + TypeScript + Pinia + Vue Router + PrimeVue + Tailwind CSS + Axios
- BE: NestJS + Swagger/OpenAPI
- Shared: `@musica/contracts` chuẩn hoá response envelope và pagination
- Database: Supabase (remote) + migrations quản lý trong repo
- Deploy: Netlify cho FE, Render cho BE

## Tính năng hiện có
- Xác thực admin với redirect theo role
- Trang đăng nhập mới, hiện đại hơn, mặc định là entrypoint của dự án
- Auto-fill tài khoản `super-admin` trong môi trường `Dev`
- Admin shell mới với:
  - Dashboard dùng dữ liệu thật từ API
  - Theme `light/dark` toàn cục cho khu vực admin
  - Sidebar, header và theme toggle đồng bộ
- Quản lý admin nội bộ cho `SUPER_ADMIN`
- Quản lý `BUYER` và `ARTIST`
- Quản lý `Product` với upload audio, publish/hide, preview waveform
- Quản lý `Certificate` với template HTML và render preview

## Bắt đầu nhanh
### 1. Cài dependencies
```bash
pnpm install
```

### 2. Cấu hình biến môi trường
- Backend:
  - Tạo `apps/api/.env.development` hoặc dùng `apps/api/.env`
  - Các biến bắt buộc:
    - `PORT`
    - `JWT_SECRET`
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `STORAGE_BUCKET_ORIGINAL_AUDIO`
    - `STORAGE_BUCKET_PREVIEW_AUDIO`
    - `STORAGE_BUCKET_CERTIFICATES`
- Frontend:
  - Tạo `apps/web/.env.development`
  - Thêm:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Seed dữ liệu dev
```bash
pnpm --filter api seed:dev
```

- Seed hiện tạo sẵn:
  - user dev
  - track / certificate mẫu
  - core permissions mẫu
  - digital / physical / expression / modification configs
  - compliance reviews, legal files và allowed permissions mẫu cho DB V2

- Tài khoản dev mặc định:
  - `superadmin@musica.local / Password123!`
  - `admin01@musica.local / Password123!`

### 4. Chạy dự án local
- Chạy cả monorepo:

```bash
pnpm dev
```

- Nếu cần chạy riêng từng app:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

### 5. Truy cập local
- Frontend: `http://localhost:5173` hoặc cổng Vite khả dụng tiếp theo
- Backend API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`

## Cấu trúc thư mục
### Root
- `apps/api`: backend NestJS
- `apps/web`: frontend Vue
- `packages/contracts`: shared contracts cho FE/BE
- `docs`: tài liệu nghiệp vụ, kiến trúc, API
- `.trae`: rules, plans, specs và AI docs
- `.superpowers`: shared setup cho agent workflows trong repo

## AI guidance files
- `AGENT.md`: runtime entrypoint chính cho coding agent ở root repo
- `apps/web/AGENT.md`: runtime guide ngắn cho FE
- `apps/api/AGENT.md`: runtime guide ngắn cho BE
- `apps/web/AGENTS.md`: handbook để bảo trì local skill library của FE
- `apps/web/skills`: thư viện tham khảo local, chỉ đọc theo nhu cầu của task

### Frontend
- `apps/web/src/features/admin-shell`
  - `layouts`: layout dùng chung cho admin
  - `pages`: dashboard, admin list, user management, product, certificate
  - `components`: UI dùng chung riêng cho shell admin
- `apps/web/src/features/auth`
  - `pages`: login page
  - `auth.api.ts`, `auth.store.ts`, `auth.types.ts`
- `apps/web/src/features/landing`
  - `pages`: landing page sau login với user không phải admin
- `apps/web/src/features/admins`
  - API, store, types cho admin accounts
- `apps/web/src/features/managed-users`
  - API, store, types cho buyer/artist
- `apps/web/src/features/products`
  - API, types và các reusable component cho product
- `apps/web/src/features/certificates`
  - API, types và item component cho certificate
- `apps/web/src/shared`
  - `api`: HTTP client và generated schema
  - `theme`: theme manager cho light/dark mode
  - `pinia.ts`: khởi tạo store
- `apps/web/src/router`
  - khai báo route và guard

### Backend
- `apps/api/src/auth`: login, JWT, guards, role handling
- `apps/api/src/admin-users`: quản lý admin nội bộ
- `apps/api/src/managed-users`: quản lý buyer/artist
- `apps/api/src/products`: quản lý product và audio flow
- `apps/api/src/certificates`: quản lý certificate và template
- `apps/api/src/common`: interceptor, middleware, pagination, error handling
- `apps/api/scripts`: seed dev, helper Supabase CLI
- `apps/api/supabase`: migrations và config

## Luồng chạy local
### Backend env resolution
- Backend load env theo thứ tự:
  - `.env.${NODE_ENV}`
  - `.env`
- Nếu không set `NODE_ENV`, backend dùng `development`

### Frontend theme
- Admin shell hỗ trợ `light/dark mode`
- Theme được lưu local bằng `localStorage`
- PrimeVue và Tailwind cùng bám theo cùng một theme state để icon, text, background và surface đổi màu đồng bộ

## API chính cho admin
### Auth
- `POST /auth/login`

### Admin users
- `GET /admin/users/admins`
- `POST /admin/users/admins`
- `PATCH /admin/users/admins/:adminId`
- `PATCH /admin/users/admins/:adminId/status`
- `DELETE /admin/users/admins/:adminId`

### Managed users
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:userId`
- `PATCH /admin/users/:userId/status`
- `DELETE /admin/users/:userId`

### Products
- `GET /admin/products`
- `GET /admin/products/summary`
- `POST /admin/products`
- `PATCH /admin/products/:productId`
- `PUT /admin/products/:productId/allowed-permissions`
- `POST /admin/products/:productId/original-upload-url`
- `POST /admin/products/:productId/thumbnail-upload-url`
- `POST /admin/products/:productId/confirm-audio-upload`
- `POST /admin/products/:productId/confirm-thumbnail-upload`
- `GET /admin/products/:productId/thumbnail-url`
- `GET /admin/products/:productId/original-playback-url`
- `PATCH /admin/products/:productId/publish`
- `PATCH /admin/products/:productId/hide`

### Certificates
- `GET /admin/certificates`
- `GET /admin/certificates/:certificateId`
- `GET /admin/certificates/:certificateId/download`
- `GET /admin/certificates/template`
- `PUT /admin/certificates/template`
- `GET /admin/certificates/:certificateId/render-html`

### Licensing configs
- `GET /admin/digital-right-configs`
- `GET /admin/digital-right-configs/:configId`
- `POST /admin/digital-right-configs`
- `PATCH /admin/digital-right-configs/:configId`
- `PATCH /admin/digital-right-configs/:configId/status`
- `DELETE /admin/digital-right-configs/:configId`
- `GET /admin/physical-right-configs`
- `GET /admin/physical-right-configs/:configId`
- `POST /admin/physical-right-configs`
- `PATCH /admin/physical-right-configs/:configId`
- `PATCH /admin/physical-right-configs/:configId/status`
- `DELETE /admin/physical-right-configs/:configId`
- `GET /admin/expression-configs`
- `GET /admin/expression-configs/:configId`
- `POST /admin/expression-configs`
- `PATCH /admin/expression-configs/:configId`
- `PATCH /admin/expression-configs/:configId/status`
- `DELETE /admin/expression-configs/:configId`
- `GET /admin/modification-configs`
- `GET /admin/modification-configs/:configId`
- `POST /admin/modification-configs`
- `PATCH /admin/modification-configs/:configId`
- `PATCH /admin/modification-configs/:configId/status`
- `DELETE /admin/modification-configs/:configId`

## OpenAPI và generated types
### Generate lại schema
```bash
pnpm gen:openapi
pnpm gen:types
```

- FE types được generate vào:
  - `apps/web/src/shared/api/generated/schema.d.ts`

## Chuẩn API response
Tất cả endpoint backend trả về theo response envelope:

```ts
type ApiSuccessResponse<TData, TMeta = undefined> = {
  success: true
  statusCode: number
  data: TData
  meta?: TMeta
  requestId: string
  timestamp: string
}

type ApiErrorResponse = {
  success: false
  statusCode: number
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId: string
  timestamp: string
}
```

List endpoint phải trả thêm:

```ts
type PaginationMeta = {
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
```

## Supabase workflow
### One-time setup
```bash
pnpm --filter api exec supabase login
pnpm --filter api exec supabase link --project-ref <SUPABASE_PROJECT_REF>
```

### Nếu muốn dùng token thay vì interactive login
```bash
SUPABASE_ACCESS_TOKEN=<YOUR_TOKEN>
```

### Tạo migration mới
```bash
pnpm --filter api exec node scripts/supabase.mjs migration new <migration_name>
```

### Update DB remote theo repo
```bash
pnpm --filter api db:push
```

### Pull schema từ remote về repo khi cần diff
```bash
pnpm --filter api db:pull
```

### Kiểm tra local Supabase nếu cần test migration trước
```bash
pnpm --filter api db:start
pnpm --filter api db:status
pnpm --filter api db:stop
```

### Sau khi đổi API contract hoặc thêm endpoint mới
```bash
pnpm --filter api build
pnpm --filter api gen:openapi
pnpm --filter web gen:types
```

### Quy trình chuẩn để update DB an toàn
1. Tạo migration mới trong `apps/api/supabase/migrations`.
2. Test migration trên local Supabase nếu thay đổi lớn hoặc có backfill dữ liệu.
3. Link đúng remote project bằng `supabase link`.
4. Chạy `pnpm --filter api db:push`.
5. Chạy `pnpm --filter api build`, `gen:openapi`, rồi `pnpm --filter web gen:types`.
6. Chạy typecheck trước khi commit:

```bash
pnpm --filter api typecheck
pnpm --filter web typecheck
```

## Deploy
### Frontend
- `apps/web/netlify.toml`
- Env: `VITE_API_BASE_URL`

### Backend
- `apps/api/render.yaml`
- PreDeploy nên chạy:

```bash
pnpm -w db:push
```
