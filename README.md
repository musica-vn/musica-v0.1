# Musica Monorepo

## Tổng quan
- FE: Vue 3 + Vite + TypeScript + Pinia + Vue Router + PrimeVue + VueUse + Axios
- BE: NestJS + Swagger/OpenAPI
- Shared: `@musica/contracts` chuẩn hoá API response/pagination
- Database: Supabase (Postgres) + Supabase CLI migrations (schema-as-code)
- Deploy: Netlify (FE), Render (BE)

## Cấu trúc thư mục
- `apps/web`: frontend
- `apps/api`: backend
- `packages/contracts`: shared types (API response/pagination)
- `apps/api/supabase`: migrations + config (chỉ BE dùng)

## Điều hướng tài liệu
### Global (Trae)
- Rules: [.trae/rules/global.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/global.md)
- API Contracts: [.trae/rules/api-contracts.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/api-contracts.md)
- Skill templates: [.trae/ai/skills](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/ai/skills)

### AGENT docs
- Root entry: [AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/AGENT.md)
- FE scope: [apps/web/AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/AGENT.md)
- BE scope: [apps/api/AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/AGENT.md)

### Theo module
- FE notes (alias -> AGENT): [apps/web/AI.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/AI.md)
- BE notes (alias -> AGENT): [apps/api/AI.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/AI.md)

## Quick start
### Cài dependencies
```bash
pnpm install
```

### Chạy dev (FE + BE)
```bash
pnpm dev
```

### Swagger
- Swagger UI: `http://localhost:3000/docs`

## Admin Tracks & Certificates (BE)
### Auth
- `POST /auth/login` -> lấy `accessToken` (Bearer) cho các API admin

### Tracks (Admin)
- `GET /admin/tracks` (pagination + filters: `status`, `genre`, `artistId`, `keyword`)
- `POST /admin/tracks`
- `GET /admin/tracks/:trackId`
- `PATCH /admin/tracks/:trackId`
- `POST /admin/tracks/:trackId/original-upload-url`
- `POST /admin/tracks/:trackId/preview-upload-url`
- `PATCH /admin/tracks/:trackId/publish`
- `PATCH /admin/tracks/:trackId/hide`

### Certificates (Admin)
- `GET /admin/certificates` (pagination + filters: `buyerKeyword`, `trackKeyword`, `artistId`, `status`, `fromDate`, `toDate`)
- `GET /admin/certificates/:certificateId`
- `GET /admin/certificates/:certificateId/download`
- `GET /admin/certificates/template`
- `PUT /admin/certificates/template`
- `GET /admin/certificates/:certificateId/render-html`

### Env vars (BE)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `STORAGE_BUCKET_ORIGINAL_AUDIO`
- `STORAGE_BUCKET_PREVIEW_AUDIO`
- `STORAGE_BUCKET_CERTIFICATES`

## Local run: Dev / Pro
### BE env selection
- BE load env theo thứ tự: `.env.${NODE_ENV}` rồi fallback `.env`
- Mặc định nếu không set `NODE_ENV` thì dùng `development` (tức ưu tiên `.env.development`)

### Dev (ưu tiên)
- Mục tiêu: FE local + BE local, DB vẫn dùng Supabase remote qua `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Chuẩn bị:
  - Tạo `apps/api/.env.development` (copy từ `apps/api/.env`) và đảm bảo có đủ env vars ở mục Env vars (BE)
  - Tạo `apps/web/.env.development`:
    - `VITE_API_BASE_URL=http://localhost:3000`
- Chạy:
  - `pnpm.cmd dev`

### Pro (local, connect Supabase remote)
- Chuẩn bị:
  - Tạo `apps/api/.env.production` (copy từ `apps/api/.env`)
  - Tạo `apps/web/.env.production`:
    - `VITE_API_BASE_URL=http://localhost:3000`
- Chạy (PowerShell):
  - `$env:NODE_ENV='production'`
  - `pnpm.cmd -C apps/api start`
  - `pnpm.cmd -C apps/web build`
  - `pnpm.cmd -C apps/web preview`

## Mock data (seed dev)
- Chạy seeding vào DB đang cấu hình trong `apps/api/.env*`:
  - `pnpm.cmd -C apps/api seed:dev`
- Script sẽ xoá và tạo lại các records có email `*@musica.local` và track title có hậu tố `(Seed)` để đảm bảo idempotent.

### Generate OpenAPI + FE types
```bash
pnpm gen:openapi
pnpm gen:types
```

## Chuẩn hoá API response
Tất cả endpoints BE trả về theo format:
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
  error: { code: string; message: string; details?: unknown }
  requestId: string
  timestamp: string
}
```

List endpoints dùng pagination meta:
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

## Supabase (schema-as-code + auto sync)
### Setup CLI
Supabase CLI được cài dạng devDependency trong `apps/api` (`supabase` npm package).

Login:
```bash
pnpm --filter api sb:login
```

Init (tạo folder `apps/api/supabase/` nếu chưa có):
```bash
pnpm --filter api sb:init
```

Link với project Supabase remote:
```bash
pnpm --filter api sb:link -- --project-ref <SUPABASE_PROJECT_REF>
```

Pull schema remote về local (baseline):
```bash
pnpm db:pull
```

### Workflow migrations
Tạo migration mới:
```bash
pnpm --filter api exec node scripts/supabase.mjs migration new <name>
```

Apply migrations lên Supabase remote (auto sync):
```bash
pnpm db:push
```

### Secrets cần có cho CI/Render
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

## Deploy
### Netlify (FE)
- Config: `apps/web/netlify.toml`
- Env: `VITE_API_BASE_URL`

### Render (BE)
- Config: `apps/api/render.yaml`
- PreDeploy chạy `pnpm -w db:push` để sync migrations trước khi start
