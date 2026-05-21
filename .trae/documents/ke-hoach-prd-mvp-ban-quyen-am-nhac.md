# Kế hoạch PRD MVP - Nền tảng mua bản quyền âm nhạc

## Summary

Mục tiêu là tạo bộ tài liệu sản phẩm/kiến trúc ở thư mục `docs/` cùng cấp với `apps/`, bám sát codebase hiện tại:

- FE: Vue 3 + Vite + Pinia, deploy Netlify
- BE: NestJS + Swagger/OpenAPI, deploy Render
- DB: Supabase Postgres + Supabase CLI migrations
- Shared contracts: `packages/contracts`

Bộ tài liệu sẽ mô tả một MVP bán quyền sử dụng âm nhạc và phát hành certificate PDF, không phải nền tảng streaming giải trí.

## Current State Analysis

### Codebase hiện có

- Root là monorepo `pnpm workspace` với `apps/*` và `packages/*`.
- `apps/web` đã có nền tảng FE cơ bản:
  - Vue 3 + Vite + TypeScript
  - `vue-router`
  - Pinia đã được mount nhưng chưa có domain stores rõ ràng
  - Axios client đã unwrap response envelope qua `@musica/contracts`
  - Dùng `VITE_API_BASE_URL`
- `apps/api` đã có nền tảng BE cơ bản:
  - NestJS
  - Swagger UI tại `/docs`
  - chuẩn response/error envelope
  - request id middleware
  - ví dụ endpoint `/examples`, `/health`
- `packages/contracts` đang là nơi giữ chuẩn `ApiSuccessResponse`, `ApiErrorResponse`, pagination meta.
- `apps/web/netlify.toml` và `apps/api/render.yaml` đã có skeleton deploy.
- `apps/api/supabase/config.toml` đã sẵn cho local Supabase workflow.

### Khoảng trống sản phẩm/nghiệp vụ

- Chưa có tài liệu PRD chính thức cho bài toán licensing marketplace.
- Chưa có mô hình feature breakdown theo MVP / DoD.
- Chưa có ERD chuẩn hóa theo roles mới `Super Admin`, `Admin`, `Artist`, `Buyer`.
- Chưa có danh sách REST API tối thiểu cho toàn bộ luồng ingestion, discovery/purchase, operations.
- Chưa có tài liệu hướng dẫn mock data và mapping Supabase cho domain này.

### Inputs đã được khóa

- Giá trị cốt lõi: bán quyền sử dụng âm nhạc, cấp certificate PDF.
- Roles chính: `Super Admin`, `Admin`, `Artist`, `Buyer`.
- Nghiệp vụ trọng tâm:
  - Ingestion: Admin upload original/preview, khai báo usage rights, publish
  - Discovery + purchase: Buyer mua quyền, hệ thống sinh certificate PDF, buyer tải về
  - Operations: quản lý user, admin list, certificates, dashboard
- Quyết định MVP đã chốt:
  - Thanh toán: mock checkout, chưa tích hợp payment gateway thật
  - Artist: chỉ là chủ sở hữu nội dung trong dữ liệu, chưa có portal self-service
  - Buyer: bắt buộc đăng nhập trước khi mua
  - Certificate: sinh một lần, immutable sau khi phát hành
- Input ERD tham chiếu: file `data_model_admin_example`

## Proposed Changes

### 1. Tạo thư mục tài liệu sản phẩm

**File/folder**

- `docs/`

**What**

- Tạo thư mục tài liệu cùng cấp với `apps/` để chứa toàn bộ sản phẩm bàn giao dưới dạng `.md`.

**Why**

- Đúng yêu cầu output.
- Tách tài liệu business/solution khỏi `.trae/documents` nội bộ.

**How**

- Tạo mới thư mục `docs/`.
- Tên file rõ theo mục đích để người triển khai, reviewer và stakeholder tra cứu nhanh.

### 2. Tạo PRD chính cho MVP

**File**

- `docs/prd-mvp-ban-quyen-am-nhac.md`

**What**

- Viết PRD hoàn chỉnh theo góc nhìn Product Manager + Solution Architect.

**Why**

- Đây là tài liệu gốc điều phối toàn bộ product scope, roadmap MVP và ranh giới hệ thống.

**How**

- Cấu trúc PRD sẽ gồm:
  - Product vision và problem statement
  - User roles và phân quyền cấp cao
  - Business goals, non-goals
  - Phạm vi MVP và ngoài phạm vi
  - Core user journeys
  - Feature modules theo nhóm nghiệp vụ
  - DOD cho từng feature
  - Functional requirements
  - Non-functional requirements
  - Kiến trúc logic mức solution
  - Deployment shape: Netlify / Render / Supabase
  - KPI/acceptance cho MVP

### 3. Tạo tài liệu feature breakdown + DoD

**File**

- `docs/feature-breakdown-mvp.md`

**What**

- Chia nhỏ MVP theo feature để team execution có checklist rõ ràng.

**Why**

- Người dùng yêu cầu nhóm theo từng feature và tập trung vào Definition of Done.

**How**

- Chia theo 4 cụm:
  - IAM & RBAC
  - Catalog & Ingestion
  - Licensing Purchase & Certificate
  - Operations Dashboard & Administration
- Mỗi feature sẽ có:
  - Mục tiêu
  - Actors
  - Business rules
  - UI/BE/DB scope
  - Definition of Done
  - Dependencies

### 4. Tạo tài liệu ERD và domain model

**File**

- `docs/erd-core-domain.md`

**What**

- Mô tả các bảng dữ liệu cốt lõi, quan hệ, constraints và đề xuất mở rộng tối thiểu cho MVP.

**Why**

- Cần bridge giữa `data_model_admin_example` và roles/nghiệp vụ thực tế.

**How**

- Cơ sở bắt buộc từ yêu cầu:
  - `users`
  - `roles`
  - `user_roles`
  - `tracks`
  - `certificates`
- Mở rộng tối thiểu để nghiệp vụ tròn hơn trong Supabase:
  - `track_usage_rights` hoặc enum array strategy cho usage rights
  - cân nhắc `certificate_items`/`license_rights_snapshot` nếu cần snapshot quyền chi tiết
- Tài liệu sẽ chốt:
  - PK/FK
  - enums
  - indexes
  - immutable fields cho `certificates`
  - mapping `Artist` là entity người sở hữu tác phẩm, `Buyer` là người mua license
- ERD sẽ ghi rõ decision thay thế từ mẫu cũ:
  - `Creator` trong mẫu được tách nghĩa thành `Artist` và `Buyer` cho domain mới.

### 5. Tạo tài liệu REST API tối thiểu

**File**

- `docs/rest-api-mvp.md`

**What**

- Liệt kê REST API routes tối thiểu để đáp ứng các nghiệp vụ đã nêu.

**Why**

- Là đầu vào cho Swagger-first/OpenAPI và giúp FE/BE align sớm.

**How**

- Nhóm routes theo module:
  - Auth / profile
  - Admin user management
  - Admin management by super admin
  - Tracks ingestion
  - Public/Buyer catalog discovery
  - Checkout mock purchase
  - Certificate download/history
  - Dashboard analytics
- Mỗi route sẽ mô tả:
  - method + path
  - actor được phép gọi
  - intent
  - request body/query/path params
  - response envelope theo `@musica/contracts`
  - status codes và lỗi nghiệp vụ chính

### 6. Tạo tài liệu Supabase integration + mock data

**File**

- `docs/supabase-setup-va-mock-data.md`

**What**

- Hướng dẫn cách kết nối dự án với Supabase local/remote và cách seed dữ liệu giả để demo MVP.

**Why**

- Người dùng yêu cầu hướng dẫn kết nối và mock data.
- Repo hiện mới có workflow CLI nhưng chưa có tài liệu domain-specific.

**How**

- Nội dung sẽ gồm:
  - vai trò Supabase trong hệ thống
  - cách dùng `apps/api/supabase/config.toml`
  - biến môi trường cần thiết cho local và Render
  - gợi ý schema-as-code workflow: pull / migration / push
  - seed dataset tối thiểu:
    - 1 super admin
    - 2 admin
    - 3 artist
    - 8 buyer
    - 15 tracks với trạng thái `HIDDEN` và `PUBLISHED`
    - 10 certificates đã phát hành
  - mock strategy cho storage:
    - original audio bucket
    - preview audio bucket
    - certificates bucket
  - mock strategy cho PDF certificate metadata

### 7. Tạo tài liệu architecture mapping ngắn giữa business và codebase

**File**

- `docs/solution-architecture-mvp.md`

**What**

- Tài liệu bridge business modules sang repo modules hiện tại.

**Why**

- Giúp execution bám codebase thật thay vì viết PRD tách rời implementation reality.

**How**

- Map các concern:
  - FE modules dự kiến trong `apps/web/src/features/*`
  - BE modules dự kiến trong `apps/api/src/*`
  - OpenAPI generation flow từ BE sang FE types
  - Netlify FE + Render BE + Supabase DB/Storage/Auth
- Chỉ ra boundaries phù hợp với modular monolith:
  - IAM
  - Catalog
  - Licensing
  - Certificates
  - Reporting

## Assumptions & Decisions

- MVP chưa tích hợp payment thật; dùng mock checkout để validate nhu cầu và flow certificate.
- Artist chưa có portal riêng; mọi thao tác ingestion do Admin thực hiện.
- Buyer phải đăng nhập để mua và truy xuất lịch sử certificate.
- Certificate là immutable document; chỉ cho tải lại hoặc xem metadata.
- Hệ thống tập trung vào quyền sử dụng/licensing, không xây tính năng nghe nhạc xã hội, playlist, comment, follow.
- Swagger/OpenAPI là nguồn truth cho hợp đồng API giữa FE và BE.
- Response format phải tuân thủ chuẩn `@musica/contracts` hiện có trong repo.
- Triển khai ưu tiên mô hình modular monolith để phù hợp codebase NestJS hiện tại.

## Verification Steps

Khi thoát Plan Mode và bắt đầu tạo tài liệu thật, cần verify:

1. `docs/` được tạo đúng cấp thư mục với `apps/`.
2. Tất cả file `.md` được viết bằng tiếng Việt, thuật ngữ kỹ thuật giữ nguyên English.
3. PRD phản ánh đúng stack thật của repo:
   - Vue 3/Vite ở FE
   - NestJS/Swagger ở BE
   - Supabase cho DB/Storage/Auth
   - Netlify/Render cho deploy
4. Feature breakdown có Definition of Done rõ cho từng nhóm.
5. ERD khớp với `data_model_admin_example` nhưng đã chuẩn hóa lại roles thành `Super Admin`, `Admin`, `Artist`, `Buyer`.
6. API routes tối thiểu cover đủ 3 cụm nghiệp vụ: ingestion, purchase/certificate, operations.
7. Tài liệu Supabase có hướng dẫn mock data khả thi với workflow CLI hiện có trong repo.
