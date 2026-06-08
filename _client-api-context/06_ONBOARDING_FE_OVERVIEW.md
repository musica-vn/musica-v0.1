# Onboarding FE (Monorepo Musica) — Tổng quan để tích hợp API nhanh

Tài liệu này dành cho FE dev mới vào team, mục tiêu: **hiểu đúng response contract, auth flow, vị trí code FE gọi API**, và chạy local để bắt đầu ghép API ngay.

---

## 1) Fundamental Purpose

- **Monorepo** giúp FE/BE chia sẻ **API envelope contract** và FE generate **endpoint types** từ OpenAPI để tránh sai lệch khi tích hợp.
- FE trong repo này hiện tại tập trung vào **admin/creator UI**; buyer marketplace flow đang được mô tả ở dạng “desired contract” trong folder này.

---

## 2) System Design (Monorepo Architecture)

### Thành phần chính

| Component | Path | Mục đích |
|---|---|---|
| API server (NestJS) | [apps/api](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api) | Expose REST endpoints + Swagger/OpenAPI |
| Web app (Vue + Vite) | [apps/web](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web) | UI gọi API (axios wrapper theo envelope) |
| Shared contracts | [packages/contracts](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts) | TypeScript types cho response envelope + pagination meta |

### Dependency graph (thực tế)

- `apps/api` → `@musica/contracts` (wrap success/error theo contract)
- `apps/web` → `@musica/contracts` (unwrap response theo contract)
- `apps/web` generate endpoint types từ `apps/api/openapi.json`

---

## 3) Core Request-Response Contract (bắt buộc)

### Success envelope

Source of truth: [api-success-response.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/api-success-response.ts#L1-L8)

```ts
type ApiSuccessResponse<TData, TMeta = undefined> = {
  success: true
  statusCode: number
  data: TData
  meta?: TMeta
  requestId: string
  timestamp: string
}
```

### Error envelope

Source of truth: [api-error-response.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/api-error-response.ts#L1-L11)

```ts
type ApiErrorResponse = {
  success: false
  statusCode: number
  error: { code: string; message: string; details?: unknown }
  requestId: string
  timestamp: string
}
```

### Pagination meta (list endpoints)

Source of truth: [pagination-meta.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/pagination-meta.ts#L1-L10)

---

## 4) Technical Flow (FE → API) — những file quan trọng trong apps/web

### 4.1 Axios wrapper (unwrap envelope + throw typed error)

- File: [axios.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/api/axios.ts#L1-L224)
- Cách dùng chuẩn trong services:
  - `apiGet<TData, TMeta>(url, { params })`
  - `apiPost<TData, TBody>(url, body)`
- Error model:
  - `ApiClientError` chứa `statusCode`, `code`, `details`, `requestId` để UI xử lý thống nhất.

### 4.2 Auth store (persist token + set Bearer header)

- Store: [auth.store.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/stores/auth.store.ts#L66-L107)
- Persist key: `localStorage["musica_auth_v1"]`
- Set token vào axios defaults: `setHttpBearerToken(accessToken)` ([axios.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/api/axios.ts#L34-L41))

### 4.3 Router guard

- Router: [router/index.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/router/index.ts#L16-L107)
- Guard hiện có:
  - `/admin/*` cần `isAdmin`
  - `requiresSuperAdmin` cần `isSuperAdmin`

### 4.4 Product service pattern (cách viết service đúng chuẩn repo)

- Service: [products.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/services/products.service.ts#L1-L200)
- Đặc điểm:
  - Mỗi endpoint map thành 1 function rõ ràng
  - Types nằm ở `apps/web/src/types/*.types.ts`

---

## 5) OpenAPI → Type-safety cho FE

### Generate OpenAPI từ BE

- Output: `apps/api/openapi.json`
- Command (root): `pnpm gen:openapi` ([package.json](file:///c:/Users/Admin/Desktop/musica-v0.1/package.json#L11-L13))

### Generate types cho FE

- Output: `apps/web/src/shared/api/generated/schema.d.ts`
- Command (root): `pnpm gen:types` ([package.json](file:///c:/Users/Admin/Desktop/musica-v0.1/package.json#L11-L13))

---

## 6) Quick-start chạy local cho FE tích hợp API

### Chạy API + Web

- `pnpm install`
- `pnpm dev` (chạy song song api + web) ([package.json](file:///c:/Users/Admin/Desktop/musica-v0.1/package.json#L6-L8))

### Env tối thiểu cho API (cần để BE boot được)

- Xem danh sách: [apps/api/README.md](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/README.md#L9-L20)
- Web base URL:
  - [apps/web/.env](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/.env#L1)

---

## 7) Tài liệu liên quan buyer marketplace flow

- Index: [00_INDEX.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/00_INDEX.md#L1-L21)
- Envelope/pagination: [01_API_ENVELOPE_AND_PAGINATION.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/01_API_ENVELOPE_AND_PAGINATION.md)
- Auth/login/JWT: [02_AUTH_LOGIN_JWT.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/02_AUTH_LOGIN_JWT.md)
- Client API catalog (desired): [03_CLIENT_API_CATALOG_DESIRED.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/03_CLIENT_API_CATALOG_DESIRED.md)
- Hybrid mocking strategy: [04_HYBRID_MOCKING_STRATEGY.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/04_HYBRID_MOCKING_STRATEGY.md)
- Assets signed URLs: [05_ASSETS_SIGNED_URLS.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/05_ASSETS_SIGNED_URLS.md)

