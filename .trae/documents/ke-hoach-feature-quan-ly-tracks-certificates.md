# Kế hoạch phát triển: Quản lý Tracks & Certificates (Admin)

## 1) Tóm tắt

Implement nhóm API Admin để quản lý `tracks` và tra cứu/tải `certificates`, dựa trên ERD hiện có và spec trong [rest-api-mvp.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/docs/rest-api-mvp.md#L137-L300).

Phạm vi đã chốt với bạn:
- Chỉ **Admin Tracks + Admin Certificates**
- Storage dùng **3 buckets tách riêng**
- Certificate hiển thị trước bằng **HTML template (editable bởi Admin)**; chưa làm PDF generation trong scope hiện tại

## 2) Phân tích hiện trạng (grounded)

### 2.1 Database (Supabase migrations)

- Bảng `tracks` và `certificates` đã có trong migration [20260520155905_remote_schema.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L53-L99)
- Enum:
  - `track_status`: `HIDDEN | PUBLISHED` ([remote_schema.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L7-L9))
  - `certificate_status`: `ACTIVE` ([remote_schema.sql](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/supabase/migrations/20260520155905_remote_schema.sql#L11-L13))
- Hiện chưa có RLS policies trong migrations.

### 2.2 Backend (NestJS)

- Đã có response envelope + request id:
  - Global interceptor [api-response.interceptor.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/common/api-response.interceptor.ts)
  - Global exception filter [api-exception.filter.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/common/api-exception.filter.ts)
  - RequestId middleware [request-id.middleware.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/common/request-id.middleware.ts)
- Auth hiện có `POST /auth/login` trả JWT chứa `sub` + `roles` ([auth.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/auth/auth.service.ts#L23-L85)), nhưng **chưa có guard/role enforcement** cho các endpoint khác.
- Chưa có module/controller/service cho `tracks` hoặc `certificates` (chưa có routes `/admin/tracks`, `/admin/certificates`).
- Supabase client dùng service-role key (bypass RLS) tại [supabase.service.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/supabase/supabase.service.ts#L9-L20) nên RBAC cần enforce ở tầng app.

### 2.3 Frontend

- Admin routes đã có page:
  - `/admin/tracks` -> `TrackManagementPage.vue`
  - `/admin/certificates` -> `CertificateManagementPage.vue`
  ([router/index.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/router/index.ts#L23-L36))
- FE hiện chưa có typed client cho các API này (chưa tìm thấy `tracks.api.ts`/`certificates.api.ts`).

## 3) Mục tiêu & tiêu chí thành công

### 3.1 Mục tiêu

- Admin có thể:
  - List/create/update track metadata
  - Publish/hide track
  - Lấy signed upload URL cho original/preview audio và lưu `*_audio_key` vào track
  - List/search certificate toàn hệ thống + xem detail + lấy signed download URL PDF (nếu `pdf_file_key` đã tồn tại)
  - Quản lý **HTML template** để render certificate trên UI (edit template, xem HTML đã render theo certificate)

### 3.2 Tiêu chí thành công

- Tất cả API tuân thủ response envelope theo `@musica/contracts` (rule global)
- List endpoints có `meta.pagination` đúng contract
- Admin-only endpoints bị chặn nếu:
  - thiếu/invalid JWT
  - không có role `ADMIN` hoặc `SUPER_ADMIN` (decision ở dưới)
- Swagger/OpenAPI reflect đầy đủ endpoints mới, có Bearer auth scheme

## 4) Quyết định & giả định (decision complete)

### 4.1 Roles được phép gọi Admin APIs

- Cho phép `ADMIN` và `SUPER_ADMIN` truy cập mọi endpoint dưới `/admin/*`.

### 4.2 Storage buckets

- Dùng 3 env vars:
  - `STORAGE_BUCKET_ORIGINAL_AUDIO`
  - `STORAGE_BUCKET_PREVIEW_AUDIO`
  - `STORAGE_BUCKET_CERTIFICATES`
- `original_audio_key`, `preview_audio_key`, `pdf_file_key` là **object path** trong bucket tương ứng.

### 4.3 Signed upload URL & persistence

- Khi gọi `POST /admin/tracks/:trackId/original-upload-url` hoặc `preview-upload-url`:
  - Server generate `fileKey` deterministic theo track (vd `tracks/{trackId}/original/{uuid}.mp3`) và trả `uploadUrl`.
  - Server **update track ngay lập tức** (`original_audio_key`/`preview_audio_key` = `fileKey`) để FE không cần thêm API “confirm upload”.

### 4.4 Certificate HTML template

- Thêm table mới `certificate_templates` để lưu template HTML editable bởi Admin.
- Certificate record vẫn giữ immutable như ERD; admin chỉ sửa template (không sửa snapshot trong certificate).
- Render HTML theo placeholder dạng `{{field}}` (tự implement replace, không thêm template engine dependency ở phase này).

## 5) Thiết kế API (đủ rõ để implement)

Ghi chú chung:
- Response trả về raw `data` hoặc `{ data, meta }`; interceptor sẽ wrap thành `ApiSuccessResponse`.
- Auth header: `Authorization: Bearer <accessToken>`.
- Pagination dùng [PaginationQueryDto](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/common/pagination.dto.ts).

### 5.1 Admin Tracks

#### 5.1.1 `GET /admin/tracks`

- Auth: `ADMIN|SUPER_ADMIN`
- Query:
  - `status?: HIDDEN|PUBLISHED`
  - `genre?: string`
  - `artistId?: string(uuid)`
  - `keyword?: string` (search `title` OR `author_name`)
  - `page`, `pageSize`, `sort?` (reuse PaginationQueryDto; map `q` -> `keyword`)
- Response `data`:
  - `items: TrackDto[]`
- Response `meta`:
  - `{ pagination: ... }` theo `PaginationMeta`

#### 5.1.2 `POST /admin/tracks`

- Auth: `ADMIN|SUPER_ADMIN`
- Body:
  - `title` (required)
  - `artistId` (required)
  - `authorName?`, `genre?`, `duration?`
  - `usageRights: string[]` (default `[]`)
- Behavior:
  - `created_by` lấy từ JWT `sub`
  - `status` default `HIDDEN`
- Response: `TrackDto`

#### 5.1.3 `GET /admin/tracks/:trackId`

- Auth: `ADMIN|SUPER_ADMIN`
- Response: `TrackDto`

#### 5.1.4 `PATCH /admin/tracks/:trackId`

- Auth: `ADMIN|SUPER_ADMIN`
- Body (partial):
  - `title?`, `artistId?`, `authorName?`, `genre?`, `duration?`, `usageRights?`
- Response: `TrackDto`

#### 5.1.5 `POST /admin/tracks/:trackId/original-upload-url`

- Auth: `ADMIN|SUPER_ADMIN`
- Response data:
  - `uploadUrl: string`
  - `fileKey: string`

#### 5.1.6 `POST /admin/tracks/:trackId/preview-upload-url`

- Auth: `ADMIN|SUPER_ADMIN`
- Response data:
  - `uploadUrl: string`
  - `fileKey: string`

#### 5.1.7 `PATCH /admin/tracks/:trackId/publish`

- Auth: `ADMIN|SUPER_ADMIN`
- Behavior: set `status = PUBLISHED`
- Response: `TrackDto`

#### 5.1.8 `PATCH /admin/tracks/:trackId/hide`

- Auth: `ADMIN|SUPER_ADMIN`
- Behavior: set `status = HIDDEN`
- Response: `TrackDto`

### 5.2 Admin Certificates

#### 5.2.1 `GET /admin/certificates`

- Auth: `ADMIN|SUPER_ADMIN`
- Query:
  - `buyerKeyword?: string` (search buyer `full_name` OR `email`)
  - `trackKeyword?: string` (search `track_snapshot_name`)
  - `artistId?: string(uuid)`
  - `status?: ACTIVE`
  - `fromDate?: string(ISO)`
  - `toDate?: string(ISO)`
  - `page`, `pageSize`, `sort?`
- Response data:
  - `items: CertificateListItemDto[]` (include snapshot fields + created_at + buyer email/name + track title snapshot)
- Response meta:
  - `{ pagination: ... }`

#### 5.2.2 `GET /admin/certificates/:certificateId`

- Auth: `ADMIN|SUPER_ADMIN`
- Response: `CertificateDetailDto` (include snapshot + selected_usage_rights + valid_from/until + pdf_file_key)

#### 5.2.3 `GET /admin/certificates/:certificateId/download`

- Auth: `ADMIN|SUPER_ADMIN`
- Behavior:
  - Dùng `STORAGE_BUCKET_CERTIFICATES`
  - Create signed download URL từ `pdf_file_key`
- Response data:
  - `downloadUrl: string`
  - `fileName: string` (vd `certificate-{certificateId}.pdf`)
- Errors:
  - `CERTIFICATE_PDF_NOT_AVAILABLE` nếu `pdf_file_key` rỗng/không sign được

### 5.3 Admin Certificate Template (HTML)

#### 5.3.1 `GET /admin/certificates/template`

- Auth: `ADMIN|SUPER_ADMIN`
- Response:
  - `code: 'DEFAULT'`
  - `htmlTemplate: string`
  - `updatedAt: string`

#### 5.3.2 `PUT /admin/certificates/template`

- Auth: `ADMIN|SUPER_ADMIN`
- Body:
  - `htmlTemplate: string` (required)
- Response: cùng shape với GET

#### 5.3.3 `GET /admin/certificates/:certificateId/render-html`

- Auth: `ADMIN|SUPER_ADMIN`
- Behavior: lấy template + certificate detail, replace placeholders:
  - `{{certificateId}}`, `{{trackSnapshotName}}`, `{{buyerSnapshotName}}`, `{{artistSnapshotName}}`
  - `{{selectedUsageRights}}` (join bằng `, `)
  - `{{validFrom}}`, `{{validUntil}}`, `{{createdAt}}`
- Response:
  - `html: string`

## 6) Thay đổi đề xuất theo file/module (cụ thể)

### 6.1 Auth/RBAC foundation (bắt buộc vì dùng service-role key)

Tạo mới trong `apps/api/src/auth/`:
- `jwt.strategy` không dùng (vì đang ký JWT thủ công), thay bằng guard:
  - `jwt-auth.guard.ts`: parse/verify Bearer JWT, attach `req.user = { userId, roles }`
  - `roles.guard.ts` + `roles.decorator.ts`: enforce roles theo metadata
  - `auth.types.ts`: typed `RequestUser`

Cập nhật Swagger auth scheme:
- `apps/api/src/main.ts` và `apps/api/src/openapi.ts`:
  - `.addBearerAuth()` trong `DocumentBuilder`
  - Các admin controllers dùng `@ApiBearerAuth()`

### 6.2 Tracks module

Thêm module mới `apps/api/src/tracks/`:
- `tracks.module.ts`
- `admin-tracks.controller.ts`
- `tracks.service.ts`
- DTOs:
  - `track.dto.ts` (response shape)
  - `admin-tracks.dto.ts` (request/query dto)
  - `tracks.swagger.ts` (envelope response classes cho Swagger)

Query/DB:
- Sử dụng `SupabaseService.client.from('tracks')`
- Filtering:
  - `.eq('status', ...)`, `.eq('genre', ...)`, `.eq('artist_id', ...)`
  - keyword: `.ilike('title', %q%)` hoặc `.or('title.ilike.%q%,author_name.ilike.%q%')`
- Pagination:
  - `.range(from, to)` và `.select('*', { count: 'exact' })` để lấy total

Storage signed upload:
- Dùng `supabase.client.storage.from(bucket).createSignedUploadUrl(fileKey)`
  - Nếu signature API khác theo supabase-js version, sẽ pin theo docs v2.52.0 trong quá trình implement.

### 6.3 Certificates module

Thêm module mới `apps/api/src/certificates/`:
- `certificates.module.ts`
- `admin-certificates.controller.ts`
- `certificates.service.ts`
- DTOs + swagger:
  - `certificate.dto.ts`
  - `admin-certificates.dto.ts`
  - `certificates.swagger.ts`

Query/DB:
- List/search:
  - Base: `from('certificates').select('*, buyer:users!certificates_buyer_id_fkey(email,full_name), track:tracks(title), artist:users!certificates_artist_id_fkey(full_name)', { count: 'exact' })`
  - filter snapshot/keyword với `.ilike(...)` và `.or(...)` (ưu tiên snapshot fields để tránh join search phức tạp)
  - date range: `.gte('created_at', fromDate)`, `.lte('created_at', toDate)`
- Detail:
  - `.eq('id', certificateId).maybeSingle()`

Signed download URL:
- `supabase.client.storage.from(STORAGE_BUCKET_CERTIFICATES).createSignedUrl(pdf_file_key, expiresInSeconds)`

### 6.4 Migration cho certificate_templates

Tạo migration mới trong `apps/api/supabase/migrations/`:
- `create table public.certificate_templates (...)`
  - `id int identity pk`
  - `code text unique not null` (seed: `DEFAULT`)
  - `html_template text not null`
  - `updated_at timestamptz not null default now()`
  - trigger `set_updated_at()` tương tự `tracks`
- Update seed (`supabase-seed-mvp.sql`) để insert template default (HTML tối giản, dùng placeholders ở mục 5.3.3).

### 6.5 Wire modules vào AppModule

- Cập nhật [app.module.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/src/app.module.ts) để import:
  - `TracksModule`
  - `CertificatesModule`

## 7) Error handling (contract-friendly)

Chuẩn hóa error code (trả qua `HttpException` để filter wrap thành `ApiErrorResponse`):
- `TRACK_NOT_FOUND` -> 404
- `CERTIFICATE_NOT_FOUND` -> 404
- `CERTIFICATE_PDF_NOT_AVAILABLE` -> 409
- `FORBIDDEN`/`UNAUTHORIZED` theo guard

Trong implementation sẽ map thành `HttpException(message, status)`; `code` hiện tại của filter là `HTTP_${status}`. Nếu cần custom `code` theo list trên, sẽ nâng cấp `ApiExceptionFilter` để hỗ trợ `HttpException` payload dạng `{ code, message, details }` (decision khi implement).

## 8) Verification (trước khi báo hoàn thành)

Backend:
- Chạy typecheck/lint:
  - `pnpm -C apps/api typecheck`
  - `pnpm -C apps/api lint`
- Generate OpenAPI và confirm endpoints xuất hiện trong `apps/api/openapi.json`:
  - `pnpm -C apps/api build`
  - `pnpm -C apps/api gen:openapi`
- Smoke test manual (local):
  - `POST /auth/login` lấy token admin
  - `GET /admin/tracks` (Bearer)
  - `POST /admin/tracks` tạo track
  - `POST /admin/tracks/:id/original-upload-url` nhận uploadUrl/fileKey
  - `GET /admin/certificates` list
  - `GET /admin/certificates/template` & `PUT` update
  - `GET /admin/certificates/:id/render-html`

## 9) README update (sau khi implement)

Cập nhật [README.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/README.md) ở root để include:
- Mô tả tính năng Admin Tracks/Certificates
- Danh sách endpoints chính + auth
- Env vars mới cho Storage buckets
- Cách generate OpenAPI

