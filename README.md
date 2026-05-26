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
- Quản lý `Track` với upload audio, publish/hide, preview waveform
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
pnpm.cmd -C apps/api seed:dev
```

- Tài khoản dev mặc định:
  - `superadmin@musica.local / Password123!`
  - `admin01@musica.local / Password123!`

### 4. Chạy dự án local
- Chạy cả monorepo:

```bash
pnpm.cmd dev
```

- Nếu cần chạy riêng từng app:

```bash
pnpm.cmd -C apps/api dev
pnpm.cmd -C apps/web dev
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

### Frontend
- `apps/web/src/features/admin-shell`
  - `layouts`: layout dùng chung cho admin
  - `pages`: dashboard, admin list, user management, track, certificate
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
- `apps/web/src/features/tracks`
  - API, types và các reusable component cho track
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
- `apps/api/src/tracks`: quản lý track và audio flow
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

### Tracks
- `GET /admin/tracks`
- `GET /admin/tracks/summary`
- `POST /admin/tracks`
- `PATCH /admin/tracks/:trackId`
- `POST /admin/tracks/:trackId/original-upload-url`
- `POST /admin/tracks/:trackId/preview-upload-url`
- `POST /admin/tracks/:trackId/confirm-audio-upload`
- `GET /admin/tracks/:trackId/preview-playback-url`
- `PATCH /admin/tracks/:trackId/publish`
- `PATCH /admin/tracks/:trackId/hide`

### Certificates
- `GET /admin/certificates`
- `GET /admin/certificates/:certificateId`
- `GET /admin/certificates/:certificateId/download`
- `GET /admin/certificates/template`
- `PUT /admin/certificates/template`
- `GET /admin/certificates/:certificateId/render-html`

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
### Login / init / link
```bash
pnpm --filter api sb:login
pnpm --filter api sb:init
pnpm --filter api sb:link -- --project-ref <SUPABASE_PROJECT_REF>
```

### Pull / push schema
```bash
pnpm db:pull
pnpm db:push
```

### Tạo migration mới
```bash
pnpm --filter api exec node scripts/supabase.mjs migration new <name>
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
