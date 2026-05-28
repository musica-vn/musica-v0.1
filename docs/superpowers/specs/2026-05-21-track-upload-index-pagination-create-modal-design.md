# Track Upload Index + Pagination + Create Modal Design

## Goal

- Upload mp3 vào **root** của bucket với key dạng **số thứ tự tăng dần** (`1.mp3`, `2.mp3`, ...).
- **Tách counter theo bucket**: `original-audio` có counter riêng, `preview-audio` có counter riêng.
- Pagination list track: **10 items / page**.
- Bỏ cột **Details** trên list.
- Create modal: **không cho nhập duration**, duration được đọc từ file mp3 và hiển thị readonly (format `m:ss`).

## Buckets

Không đổi tên bucket, sử dụng đúng 3 bucket đang có:

- `original-audio`
- `preview-audio`
- `certificates` (không thay đổi)

## Storage Semantics

- File được lưu **bên trong bucket** của Supabase Storage.
- Với key `N.mp3`, object nằm ở **root** bucket (không có folder con).
- FE upload trực tiếp lên Supabase Storage bằng **signed upload URL** (browser `PUT`).

## Desired Behavior

### Upload original

- Endpoint: `POST /admin/products/:trackId/original-upload-url`
- Tạo key: `{n}.mp3` (n lấy từ counter của bucket `original-audio`)
- Signed upload URL trỏ tới: `original-audio/{n}.mp3`
- DB update:
  - `tracks.original_audio_key = '{n}.mp3'`
  - `tracks.preview_audio_key` không thay đổi

### Upload preview

- Endpoint: `POST /admin/products/:trackId/preview-upload-url`
- Tạo key: `{n}.mp3` (n lấy từ counter của bucket `preview-audio`)
- Signed upload URL trỏ tới: `preview-audio/{n}.mp3`
- DB update:
  - `tracks.preview_audio_key = '{n}.mp3'`
  - `tracks.original_audio_key` không thay đổi

### Playback

- Endpoint: `GET /admin/products/:trackId/preview-playback-url`
- Đọc `preview_audio_key` trước, nếu thiếu thì dùng `original_audio_key`.
- Xin signed playback URL theo key đang có trong DB.
- Không thay đổi bucket `certificates`.

## Database Changes (Supabase)

### New table: `public.storage_counters`

- `bucket` text primary key
- `last_index` int not null default 0
- `updated_at` timestamptz not null default now()

### New function: `public.allocate_storage_index(p_bucket text) returns int`

Hành vi:
- Upsert row cho bucket nếu chưa có.
- Tăng `last_index` lên 1 và trả về giá trị mới.
- Phải atomic để tránh race-condition khi nhiều người upload đồng thời.

### Seed / bootstrap counters

Tạo sẵn 2 row:
- `original-audio` với `last_index = 0`
- `preview-audio` với `last_index = 0`

## Backend Changes (Nest API)

### TracksService

- Tạo helper `allocateNextStorageKey(bucket: string): Promise<string>`
  - call `supabaseService.client.rpc('allocate_storage_index', { p_bucket: bucket })`
  - nhận `n` và trả về `${n}.mp3`
- `createOriginalUploadUrl(trackId)`:
  - bucket = `STORAGE_BUCKET_ORIGINAL_AUDIO`
  - fileKey = allocate theo bucket original
  - create signed upload URL cho `fileKey`
  - update DB chỉ `original_audio_key`
- `createPreviewUploadUrl(trackId)`:
  - bucket = `STORAGE_BUCKET_PREVIEW_AUDIO`
  - fileKey = allocate theo bucket preview
  - create signed upload URL cho `fileKey`
  - update DB chỉ `preview_audio_key`

### Error handling

- Nếu RPC fail: trả 500 với message rõ.
- Nếu update DB fail: trả 500.

## Frontend Changes (Vue)

### List / Pagination

- Default `pageSize = 10`
- Không cho đổi `pageSize` (giữ cố định 10 trên UI).
- Bỏ cột **Details** khỏi DataTable.

### Create Modal

- Không hiển thị input duration để user nhập tay.
- Khi chọn file original mp3:
  - đọc duration bằng `HTMLAudioElement` (metadata) như hiện có
  - hiển thị duration readonly dạng `m:ss`
- Layout:
  - Nhóm fields thành 2 khối: `Metadata` và `Audio`
  - Dùng icons (PrimeIcons) cho các header/section

## Migration Note (existing data)

- Không tự động migrate các key cũ (`test.mp3` hoặc key khác).
- Sau khi triển khai, mọi upload mới sẽ sinh key `N.mp3`.

## Verification

- DB: gọi RPC `allocate_storage_index('original-audio')` và `allocate_storage_index('preview-audio')` đảm bảo tăng dần độc lập.
- API:
  - `original-upload-url` trả `fileKey` dạng `N.mp3`
  - `preview-upload-url` trả `fileKey` dạng `N.mp3`
- UI:
  - List page size = 10
  - Không còn cột Details
  - Create modal: chọn mp3 -> duration hiển thị đúng
  - Upload original/preview tạo object ở root bucket với tên số tăng dần

