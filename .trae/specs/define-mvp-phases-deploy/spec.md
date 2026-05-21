# Musica MVP Phases & Deployment Spec

## Why
Hiện tại repo đã có PRD, kiến trúc giải pháp, ERD, API blueprint và hướng dẫn Supabase; nhưng chưa có một lộ trình phase thống nhất để triển khai theo thứ tự phụ thuộc và chốt tiêu chí “xong phase → có thể deploy/demo”.

## What Changes
- Chuẩn hóa “phase gating”: mỗi phase có đầu ra (deliverables) và tiêu chí pass/fail rõ ràng trước khi sang phase tiếp theo.
- Map modules nghiệp vụ (IAM, Users, Tracks, Catalog, Checkout, Certificates, Dashboard) sang thứ tự triển khai tối thiểu để chạy end-to-end.
- Chuẩn hóa deployment flow Netlify (FE) + Render (BE) + Supabase (DB/Storage) và biến môi trường bắt buộc.
- Chuẩn hóa security baseline cho MVP (role-based authorization ở BE, Storage access policy, RLS mức tối thiểu cho Buyer).
- Chuẩn hóa cách làm việc spec-driven trong Trae (Builder Mode, Context Management, Tool/Terminal integration) để đội dev chạy đúng quy trình.

## Impact
- Affected specs: IAM & RBAC, Catalog & Ingestion, Licensing Purchase & Certificate, Operations Dashboard & Administration, Deployment & Environment, Supabase schema/seed, Security baseline.
- Affected code: `apps/api` (NestJS modules + Swagger/OpenAPI), `apps/web` (Vue features + routes), `apps/api/supabase` (schema/migrations), `packages/contracts` (response envelope).

## ADDED Requirements
### Requirement: Phased Delivery
Hệ thống SHALL được triển khai theo các phase có tiêu chí nghiệm thu rõ ràng để đảm bảo luôn có bản chạy được (locally và deployed) trước khi mở rộng tính năng.

#### Scenario: Phase progression
- **WHEN** Phase N đạt toàn bộ tiêu chí nghiệm thu
- **THEN** đội dev mới bắt đầu Phase N+1
- **AND** bản deploy tương ứng Phase N phải hoạt động tối thiểu trên môi trường demo

### Requirement: Deployment Baseline
Hệ thống SHALL deploy theo kiến trúc Netlify (FE) + Render (BE) + Supabase (DB/Storage) với cấu hình env không lộ secrets.

#### Scenario: Production-like deployment
- **WHEN** deploy BE lên Render và FE lên Netlify với env chuẩn
- **THEN** FE gọi được BE qua `VITE_API_BASE_URL`
- **AND** BE kết nối được Supabase (DB/Storage) bằng service role key (chỉ ở BE)
- **AND** Swagger UI `/docs` và health check `/health` hoạt động

### Requirement: Security Baseline
Hệ thống SHALL đảm bảo:
- BE enforce role-based authorization cho các route quản trị và buyer routes.
- Storage buckets tuân thủ policy: original/private, preview controlled, certificate private + signed URL.
- Buyer chỉ đọc được certificates của chính mình (RLS hoặc policy tương đương).

#### Scenario: Buyer access isolation
- **WHEN** Buyer A truy cập danh sách certificates
- **THEN** chỉ nhận certificates có `buyer_id = Buyer A`

## MODIFIED Requirements
### Requirement: MVP Modules Ordering
Thứ tự triển khai SHALL theo phụ thuộc nghiệp vụ:
1) IAM & RBAC → 2) Users → 3) Tracks (ingestion) → 4) Catalog → 5) Checkout → 6) Certificates → 7) Dashboard.

## REMOVED Requirements
### Requirement: None
**Reason**: Không loại bỏ yêu cầu nào trong MVP, chỉ chuẩn hóa thứ tự và tiêu chí nghiệm thu.
**Migration**: N/A

## Context Hiện Tại (Tóm Tắt)
- Product: marketplace mua bản quyền âm nhạc; đầu ra pháp lý là certificate PDF; không phải streaming app.
- Roles: `SUPER_ADMIN`, `ADMIN`, `ARTIST` (chỉ dữ liệu), `BUYER`.
- Core flows: ingest track (Admin) → publish → buyer browse → mock checkout → generate certificate record + PDF → buyer tải lại.
- API: Swagger-first, response envelope theo `@musica/contracts`, list endpoints có `meta.pagination`, responses có `requestId`.
- Data: Postgres (Supabase) với `users`, `roles`, `user_roles`, `tracks`, `certificates` + snapshot fields; Storage cho originals/previews/cert PDFs.

## Phase Breakdown (Build → Deploy)
### Phase 0: Repo & Tooling Baseline (Local)
- Output: chạy được monorepo, start BE/FE, truy cập Swagger `/docs`.
- Gating: `/health` trả envelope chuẩn; FE build thành công.

### Phase 1: Supabase Foundation (Schema/Seed/Storage)
- Output: schema/migrations khớp ERD; seed demo users/tracks/certificates; tạo buckets và policy mức cao.
- Gating: seed SQL chạy được; có dữ liệu demo; original/cert buckets không public.

### Phase 2: Backend Core APIs (Swagger-first)
- Output: implement tối thiểu các nhóm API theo [rest-api-mvp.md](file:///c:/Users/Admin/Desktop/musica-v0.1/docs/rest-api-mvp.md).
- Gating: smoke test qua Swagger pass (auth, admin CRUD cơ bản, catalog published-only, checkout tạo certificate).

### Phase 3: Frontend Core UI (Role-based portals)
- Output: Buyer portal (catalog/detail/history/download) + Admin portal (users/tracks/certificates) + Super Admin admin-management.
- Gating: end-to-end demo flow chạy bằng data thật (không chỉ mock UI).

### Phase 4: Deployment (Demo Environment)
- Output: Render chạy BE + Netlify chạy FE + Supabase remote (DB/Storage) + env đầy đủ.
- Gating: FE ↔ BE ↔ Supabase hoạt động; signed URL download certificate hoạt động; không lộ secrets.

### Phase 5: Hardening (MVP quality)
- Output: RLS/policies chặt hơn, audit logs tối thiểu, rate limiting/guards, basic monitoring.
- Gating: kiểm thử quyền truy cập âm tính (forbidden/unauthorized) pass; không có endpoint lộ original audio.

## Trae Workflow (Onboarding Chuẩn)
- Builder Mode: sau khi spec được duyệt, triển khai theo `tasks.md` bằng sub-agents; mỗi task nhỏ, kiểm chứng được.
- Context Management: dùng @ để đính kèm `docs/*.md`, file code, hoặc toàn workspace; ưu tiên đưa đúng 1-3 file liên quan để giảm nhiễu.
- Tool/Terminal Integration: Terminal dùng để chạy scripts (pnpm, tests, dev servers); thay đổi file qua cơ chế patch để tránh lệch format và dễ review.

