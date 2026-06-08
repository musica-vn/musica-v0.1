# Client API Context (Buyer + Artist UI)

Mục tiêu của folder này: cung cấp “đề bài + API contract” để Trae (ở codebase UI khác) hiểu đúng bối cảnh và tạo UI theo đúng flow: **browse products → xem chi tiết → mua → download certificate**.

Lưu ý quan trọng:
- Backend trong repo này hiện tại chủ yếu expose **/admin/** endpoints (admin-only). Folder này mô tả **Client API (desired)** để bạn mock trước và triển khai BE sau.
- Những endpoint “call thật ngay” hiện có: `POST /auth/login`, `GET /health`.
- Tất cả responses bắt buộc theo envelope `@musica/contracts` (xem [01_API_ENVELOPE_AND_PAGINATION.md](./01_API_ENVELOPE_AND_PAGINATION.md)).

## Cách dùng nhanh trong project UI
- Base URL: `VITE_API_BASE_URL` (vd: `http://localhost:3000`)
- Headers:
  - `Authorization: Bearer <accessToken>` (sau login)
  - `x-request-id: <uuid>` (optional)

## Tài liệu trong folder
- [01_API_ENVELOPE_AND_PAGINATION.md](./01_API_ENVELOPE_AND_PAGINATION.md): response envelope + pagination meta.
- [02_AUTH_LOGIN_JWT.md](./02_AUTH_LOGIN_JWT.md): login, JWT, roles, rules.
- [03_CLIENT_API_CATALOG_DESIRED.md](./03_CLIENT_API_CATALOG_DESIRED.md): danh sách endpoint “client app cần có” + request/response shape để mock.
- [04_HYBRID_MOCKING_STRATEGY.md](./04_HYBRID_MOCKING_STRATEGY.md): cách triển khai hybrid (mock + call thật) và mapping từng endpoint.
- [05_ASSETS_SIGNED_URLS.md](./05_ASSETS_SIGNED_URLS.md): contract signed URL cho assets (certificate download, thumbnail/audio preview).
- [06_ONBOARDING_FE_OVERVIEW.md](./06_ONBOARDING_FE_OVERVIEW.md): tổng quan monorepo + flow FE gọi API + type-safety pipeline.
- [07_MARKETPLACE_UI_INTEGRATION_GUIDE.md](./07_MARKETPLACE_UI_INTEGRATION_GUIDE.md): hướng dẫn ghép API vào UI marketplace (browse → detail → pricing → buy), kèm chiến lược mock/call thật.
- [08_MARKETPLACE_PUBLIC_API_SPEC.md](./08_MARKETPLACE_PUBLIC_API_SPEC.md): spec API public `/marketplace/*` để FE ghép list + detail (lọc/sort/search/pagination) dựa trên codebase hiện tại.
