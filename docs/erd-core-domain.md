# ERD Core Domain

## 1. Mục tiêu

Tài liệu này chuẩn hóa ERD cho MVP bán bản quyền âm nhạc, dựa trên:

- codebase hiện tại dùng NestJS + Supabase
- input domain trong file `data_model_admin_example`
- roles mục tiêu: `Super Admin`, `Admin`, `Artist`, `Buyer`

Điểm điều chỉnh quan trọng là mẫu cũ dùng khái niệm `Creator`, trong khi domain mới cần tách rõ:

- `Artist`: chủ sở hữu hoặc đại diện tác phẩm
- `Buyer`: người mua quyền sử dụng

## 2. Nguyên tắc thiết kế dữ liệu

- Dùng UUID cho các bảng nghiệp vụ chính
- Áp dụng RBAC qua `roles` và `user_roles`
- `certificates` là dữ liệu immutable sau khi tạo
- Lưu snapshot pháp lý ở thời điểm mua để tránh sai lệch khi track hoặc user bị sửa
- Tách Storage keys cho original audio, preview audio, certificate PDF

## 3. Bảng dữ liệu cốt lõi

## 3.1 `users`

### Vai trò

Lưu thông tin tài khoản hệ thống cho `SUPER_ADMIN`, `ADMIN`, `ARTIST`, `BUYER`.

### Cột đề xuất

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | primary key |
| `email` | VARCHAR UNIQUE | unique index |
| `password_hash` | VARCHAR | hash password |
| `full_name` | VARCHAR | tên hiển thị |
| `status` | ENUM | `ACTIVE`, `LOCKED`, `DELETED` |
| `created_at` | TIMESTAMP | default now |
| `updated_at` | TIMESTAMP | updated by app |

### Index

- unique index: `email`
- index: `status`

## 3.2 `roles`

### Vai trò

Lookup table cho RBAC.

### Cột đề xuất

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK | primary key |
| `code` | VARCHAR UNIQUE | `SUPER_ADMIN`, `ADMIN`, `ARTIST`, `BUYER` |
| `name` | VARCHAR | label hiển thị |

## 3.3 `user_roles`

### Vai trò

Pivot table ánh xạ user và role.

### Cột đề xuất

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | references `users.id` |
| `role_id` | INT FK | references `roles.id` |
| `created_at` | TIMESTAMP | audit |

### Constraints

- composite unique: (`user_id`, `role_id`)

## 3.4 `tracks`

### Vai trò

Lưu nội dung âm nhạc có thể cấp quyền.

### Cột đề xuất

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | primary key |
| `title` | VARCHAR | tên bài hát |
| `artist_id` | UUID FK | references `users.id`, user có role `ARTIST` |
| `author_name` | VARCHAR | optional snapshot/tác giả hiển thị |
| `genre` | VARCHAR | filter field |
| `duration` | INT | tính theo giây |
| `status` | ENUM | `HIDDEN`, `PUBLISHED` |
| `usage_rights` | JSONB hoặc TEXT[] | danh sách quyền sử dụng |
| `original_audio_key` | VARCHAR | storage path file gốc |
| `preview_audio_key` | VARCHAR | storage path file preview |
| `created_by` | UUID FK | references `users.id`, user có role `ADMIN` |
| `created_at` | TIMESTAMP | default now |
| `updated_at` | TIMESTAMP | updated by app |

### Index

- index: `genre`
- index: `status`
- index: `artist_id`
- GIN index cho `usage_rights` nếu dùng `JSONB` hoặc `TEXT[]`

### Ghi chú quyết định

- `artist_id` được thêm để domain phản ánh đúng role `Artist`
- `created_by` dùng để audit Admin nào ingest track
- `usage_rights` có thể dùng `TEXT[]` trong MVP để đơn giản, sau này có thể tách bảng nếu pricing/pháp lý phức tạp hơn

## 3.5 `certificates`

### Vai trò

Lưu giao dịch cấp phép và chứng từ pháp lý phát sinh sau mua.

### Cột đề xuất

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | primary key |
| `track_id` | UUID FK | references `tracks.id` |
| `buyer_id` | UUID FK | references `users.id`, user có role `BUYER` |
| `artist_id` | UUID FK | references `users.id`, snapshot owner link |
| `selected_usage_rights` | JSONB hoặc TEXT[] | quyền đã mua tại thời điểm giao dịch |
| `track_snapshot_name` | VARCHAR | snapshot tên track |
| `buyer_snapshot_name` | VARCHAR | snapshot tên buyer |
| `artist_snapshot_name` | VARCHAR | snapshot tên artist |
| `pdf_file_key` | VARCHAR | storage path file PDF |
| `status` | ENUM | `ACTIVE` cho MVP |
| `valid_from` | TIMESTAMP | thời điểm hiệu lực |
| `valid_until` | TIMESTAMP NULL | null trong MVP nếu license vô thời hạn |
| `created_at` | TIMESTAMP | thời điểm phát hành |

### Index

- index: `track_id`
- index: `buyer_id`
- index: `artist_id`
- index: `status`
- index: `created_at`

### Quy tắc immutable

Sau khi record được tạo:

- không sửa snapshot fields
- không đổi `pdf_file_key`
- không đổi `selected_usage_rights`
- chỉ cho phép truy xuất hoặc đánh dấu trạng thái mở rộng trong phase sau nếu business yêu cầu

## 4. Quan hệ giữa các bảng

- `users` 1 - n `user_roles`
- `roles` 1 - n `user_roles`
- `users (artist)` 1 - n `tracks`
- `users (admin)` 1 - n `tracks.created_by`
- `tracks` 1 - n `certificates`
- `users (buyer)` 1 - n `certificates`
- `users (artist)` 1 - n `certificates`

## 5. ERD mô tả text

```text
users
  ├─< user_roles >─ roles
  ├─< tracks.artist_id
  ├─< tracks.created_by
  ├─< certificates.buyer_id
  └─< certificates.artist_id

tracks
  └─< certificates.track_id
```

## 6. Enum đề xuất

### `user_status`

- `ACTIVE`
- `LOCKED`
- `DELETED`

### `track_status`

- `HIDDEN`
- `PUBLISHED`

### `certificate_status`

- `ACTIVE`

### `usage_rights` mẫu

- `SOCIAL_USE`
- `ADS_USE`
- `YOUTUBE_USE`
- `EVENT_USE`
- `COMMERCIAL_USE`

Trong MVP, bộ quyền có thể hardcode ở tầng app để đẩy nhanh tiến độ. Sau này có thể tách bảng `usage_rights_catalog`.

## 7. Quyết định lưu `usage_rights`

### Option được chọn cho MVP

Lưu `usage_rights` và `selected_usage_rights` dưới dạng `TEXT[]` hoặc `JSONB` với GIN index.

### Lý do

- Nhanh để triển khai
- Linh hoạt cho nhiều quyền trong một track/certificate
- Phù hợp với nhu cầu filter/search cơ bản

### Khi nào cần tách bảng

- Khi có pricing theo từng right
- Khi có versioning/legal rules cho từng right
- Khi có need phân tích reporting sâu

## 8. Gợi ý RLS mức cao trong Supabase

- `BUYER`: chỉ đọc certificates của chính mình
- `ADMIN`: quản lý tracks, artists, buyers, certificates theo quyền hệ thống
- `SUPER_ADMIN`: toàn quyền quản trị
- `ARTIST`: chưa mở portal trong MVP nên có thể chưa cần public client policy riêng

## 9. Dữ liệu mẫu tối thiểu

- 1 `SUPER_ADMIN`
- 2 `ADMIN`
- 3 `ARTIST`
- 8 `BUYER`
- 15 `tracks`
- 10 `certificates`

## 10. Ghi chú mapping từ file mẫu

Từ `data_model_admin_example`, các điểm được giữ lại:

- `users`
- `roles`
- `user_roles`
- `tracks`
- `certificates`
- các enum trạng thái chính
- ý tưởng snapshot dữ liệu trong `certificates`

Các điểm được chuẩn hóa lại:

- đổi `creator_id` thành `buyer_id`
- thêm `artist_id` để biểu diễn quyền sở hữu bài hát
- bổ sung `selected_usage_rights` để snapshot đúng quyền đã mua
