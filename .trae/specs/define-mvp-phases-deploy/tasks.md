# Tasks

- [x] Task 0: Chuẩn hóa cách làm việc (Trae + repo baseline)
  - [x] Đọc PRD/Architecture/ERD/API docs và thống nhất scope MVP (đã có).
  - [x] Chốt tiêu chí “pass phase” và cách validate (Swagger smoke checks + UI flows).
- [x] Task 1: Phase 0 - Local baseline (Repo/Tooling)
  - [x] Cài dependencies workspace và chạy được backend ở local.
  - [x] Truy cập được Swagger `/docs` và endpoint `/health` trả envelope chuẩn.
  - [x] Chạy được frontend build (chưa cần kết nối API).
- [ ] Task 2: Phase 1 - Supabase foundation (Schema/Seed/Storage)
  - [x] Sync schema theo ERD: `users`, `roles`, `user_roles`, `tracks`, `certificates` + enums.
  - [x] Thiết lập Storage buckets: `audio-originals`, `audio-previews`, `certificate-pdfs`.
  - [x] Áp policy mức cao: originals/certificates private; preview controlled.
  - [x] Seed dataset demo (users/tracks/certificates) theo file seed SQL hiện có.
- [ ] Task 3: Phase 2 - Backend core APIs (Swagger-first)
  - [x] Implement Auth/Profile: `POST /auth/login`, `GET /auth/me`.
  - [ ] Implement Super Admin: quản lý Admins (`GET/POST/PATCH status`).
  - [ ] Implement Admin Users: list/create/update users (Artist/Buyer).
  - [ ] Implement Tracks ingestion: CRUD tối thiểu + publish/hide + signed upload URL.
  - [ ] Implement Catalog: list/detail published-only + preview URL.
  - [ ] Implement Checkout: validate + tạo certificate record + generate PDF (có thể mock PDF nhưng phải có fileKey).
  - [ ] Implement Buyer/Admin Certificates: list/detail/download signed URL.
  - [ ] Implement Dashboard: summary + trends/top-genres (tối thiểu summary cho MVP demo).
- [ ] Task 4: Phase 3 - Frontend core UI (Role-based portals)
  - [ ] Auth UI + Pinia store + route guards theo role.
  - [ ] Super Admin UI: admin list/create/lock.
  - [ ] Admin UI: users management, tracks CRUD + upload + publish, certificates search.
  - [ ] Buyer UI: catalog list/filter, track detail + chọn rights, mock checkout, purchase history + download.
  - [ ] Typed API integration theo OpenAPI + unwrap envelope nhất quán.
- [ ] Task 5: Phase 4 - Deploy demo (Netlify + Render + Supabase remote)
  - [ ] Chuẩn hóa env cho Render: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, các biến liên quan DB/Storage theo tài liệu.
  - [ ] Deploy BE lên Render, xác nhận `/health` và `/docs`.
  - [ ] Deploy FE lên Netlify, cấu hình `VITE_API_BASE_URL` trỏ về Render.
  - [ ] Smoke test end-to-end trên môi trường demo.
- [ ] Task 6: Phase 5 - Hardening (Security/Quality)
  - [ ] Bổ sung RLS tối thiểu cho Buyer certificates.
  - [ ] Siết Storage access (chỉ signed URL cho cert PDFs, originals private).
  - [ ] Negative tests cho RBAC: đảm bảo 401/403 đúng cho các route quan trọng.
  - [ ] Tối thiểu 1 bộ test tự động (unit/integration) cho flow checkout → certificate.

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 5

