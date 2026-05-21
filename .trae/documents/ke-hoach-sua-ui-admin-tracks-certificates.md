# Kế hoạch: Sửa UI Admin Tracks & Certificates (FE+BE local)

## 1) Tóm tắt

Mục tiêu là sửa và hoàn thiện **UI quản lý Tracks** và **UI quản lý Certificates** trong Admin (chỉ 2 phần này), bao gồm:
- Fix vấn đề FE gọi nhầm port (request bị gửi về `http://localhost:5173/...` thay vì API `:3000`) bằng cách chuẩn hoá cách load env `VITE_API_BASE_URL`.
- Implement UI gọi API thật:
  - Tracks: list/filter/pagination + create/edit + publish/hide + **upload file** (lấy signed upload URL và upload trực tiếp).
  - Certificates: list/search/pagination + detail + download (signed URL) + **template HTML editor** + preview render HTML theo certificate.

## 2) Hiện trạng (grounded)

### 2.1 FE

- `axios.baseURL` lấy từ `import.meta.env.VITE_API_BASE_URL` tại [http.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/shared/api/http.ts#L20-L22). Nếu env không được load → `baseURL` rỗng → Axios gọi URL tương đối theo origin FE (`:5173`), dẫn đến 404 `/auth/login` như bạn gặp.
- `apps/web/.env` hiện có `VITE_API_BASE_URL=http://localhost:3000` (bạn đang mở file).
- Hai page hiện chỉ dummy data, chưa wired API:
  - [TrackManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/views/admin/TrackManagementPage.vue)
  - [CertificateManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/views/admin/CertificateManagementPage.vue)
- FE hiện đã có pattern API wrapper theo envelope (`apiGet`, `apiPost`) trong [http.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/shared/api/http.ts) và auth store set bearer token qua `setHttpBearerToken`.
- Chưa có `apiPatch/apiPut`, chưa có module `tracks.api.ts`/`certificates.api.ts`.

### 2.2 BE

- API Admin Tracks/Certificates đã có trong `apps/api/openapi.json`.
- Auth endpoint `POST /auth/login` có, trả `accessToken` và `roles` để FE set Bearer token.

## 3) Phạm vi & quyết định đã chốt

- Chỉ sửa UI của 2 trang:
  - `/admin/tracks`
  - `/admin/certificates`
- Tracks UI: **Full (kèm upload file)**
- Certificates UI: **Full (kèm template)**
- FE + BE chạy local, DB có thể dùng Supabase remote (Dev-first).

## 4) Thay đổi đề xuất (theo file, decision complete)

### 4.1 Fix env/baseURL (để không gọi nhầm port)

**Mục tiêu:** đảm bảo `VITE_API_BASE_URL` luôn được nạp đúng khi chạy dev/build, và fail-fast nếu thiếu.

Thay đổi:
- Cập nhật [vite.config.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/vite.config.ts) để set `envDir` về đúng thư mục app web (đảm bảo chạy từ đâu vẫn đọc `apps/web/.env*`).
- Cập nhật [http.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/shared/api/http.ts#L20-L22):
  - Nếu `VITE_API_BASE_URL` falsy → throw error rõ ràng (hoặc fallback explicit nếu bạn muốn).
  - (Optional) add 1 debug log có prefix `[DEBUG]` (theo rule) in dev mode để in baseURL.
- Chuẩn hoá env files:
  - `apps/web/.env.development` (dev local): `VITE_API_BASE_URL=http://localhost:3000`
  - `apps/web/.env.production` (pro local preview hoặc deploy): tuỳ môi trường

### 4.2 Shared API wrapper cho PATCH/PUT

Thêm trong [http.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/shared/api/http.ts):
- `apiPatch<TData, TBody, TMeta>()`
- `apiPut<TData, TBody, TMeta>()`

Giữ nguyên envelope unwrap logic và `ApiClientError` pattern giống `apiGet/apiPost`.

### 4.3 Tracks feature (API client + UI)

**Files mới**
- `apps/web/src/features/tracks/tracks.api.ts`
  - `listAdminTracks(query)`
  - `createTrack(body)`
  - `updateTrack(trackId, body)`
  - `publishTrack(trackId)`
  - `hideTrack(trackId)`
  - `getOriginalUploadUrl(trackId)`
  - `getPreviewUploadUrl(trackId)`
- `apps/web/src/features/tracks/tracks.types.ts`
  - Types map từ BE response (`TrackDto` + list response).
  - Nếu `gen:types` đã cập nhật schema, ưu tiên import type từ `src/shared/api/generated/schema.d.ts`.

**UI update**
- Update [TrackManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/views/admin/TrackManagementPage.vue):
  - Toolbar filter: keyword, status dropdown, genre, artistId.
  - DataTable:
    - `paginator`, `lazy` mode, bind `first`, `rows`, `totalRecords`
    - Loading state (skeleton/loader)
  - Actions per row:
    - Publish/Hide button theo status
    - Edit metadata button (Dialog)
    - Upload original/preview:
      - Bước 1: gọi API lấy signed upload URL (original hoặc preview)
      - Bước 2: upload file trực tiếp bằng `fetch(uploadUrl, { method: 'PUT', body: file })` (hoặc method theo Supabase signed upload API thực tế)
      - Hiển thị progress + kết quả + fileKey đã được BE persist
  - Create track button (Dialog):
    - title, artistId, authorName, genre, duration, usageRights (comma-separated hoặc multi input)
  - Error handling:
    - Hiển thị message rõ ràng từ `ApiClientError` (statusCode/code/message) trên UI (PrimeVue Toast hoặc inline Message).

### 4.4 Certificates feature (API client + UI + template editor)

**Files mới**
- `apps/web/src/features/certificates/certificates.api.ts`
  - `listAdminCertificates(query)`
  - `getCertificateDetail(certificateId)`
  - `getCertificateDownloadUrl(certificateId)`
  - `getCertificateTemplate()`
  - `updateCertificateTemplate(payload)`
  - `renderCertificateHtml(certificateId)`
- `apps/web/src/features/certificates/certificates.types.ts`

**UI update**
- Update [CertificateManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/views/admin/CertificateManagementPage.vue):
  - Filter: buyerKeyword, trackKeyword, status, fromDate/toDate.
  - DataTable `lazy` paginator.
  - Row actions:
    - View detail (Dialog) + render HTML preview (iframe-like bằng `v-html` trong container)
    - Download: gọi endpoint download, mở `downloadUrl` trong tab mới
  - Template editor section:
    - Load template (GET)
    - Textarea edit HTML
    - Save (PUT)
    - Quick preview: chọn 1 certificateId → gọi `render-html` → render result.
  - Security note:
    - Dùng `v-html` sẽ render HTML; trong scope nội bộ admin ok, nhưng vẫn giới hạn: không inject script; strip `<script>` client-side trước render (một sanitizer tối giản) hoặc render trong sandboxed iframe (ưu tiên).
    - Quyết định: dùng `iframe sandbox` + `srcdoc` để an toàn hơn mà không cần thêm dependency sanitizer.

### 4.5 DX: cập nhật types và tài liệu

- Chạy `pnpm gen:openapi` (root) rồi `pnpm gen:types` để FE nhận types mới.
- Update [README.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/README.md) (đã có mục endpoints) bổ sung:
  - Cách set env cho FE/BE dev
  - Lưu ý dùng `pnpm.cmd` trên Windows PowerShell

## 5) Các giả định cần chốt khi implement

- Signed upload URL từ Supabase: xác định method upload đúng (PUT/POST, headers) theo response của `createSignedUploadUrl`. UI sẽ implement theo đúng shape trả về từ BE (`uploadUrl`, `fileKey`).
- PrimeVue components dùng trong UI: `Button`, `Dialog`, `InputText`, `Dropdown`, `Textarea`, `Calendar`, `Message/Toast` (sẽ kiểm tra component availability và style hiện tại).

## 6) Verification (bắt buộc trước khi báo hoàn thành)

### 6.1 FE
- `pnpm.cmd -C apps/web typecheck`
- Run dev và confirm:
  - Login gọi đúng `http://localhost:3000/auth/login`
  - Tracks list load data thật, paginate ok
  - Upload original/preview upload được file nhỏ (test)
  - Publish/hide cập nhật status
  - Certificates list/detail/download ok
  - Template editor save và preview render-html ok

### 6.2 BE (smoke)
- Swagger `/docs` hoạt động
- `POST /auth/login` trả token có `ADMIN`

