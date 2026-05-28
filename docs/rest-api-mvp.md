# REST API MVP

## 1. Nguyên tắc API

Tất cả APIs trong MVP cần tuân theo các nguyên tắc sau:

- Thiết kế RESTful
- Swagger/OpenAPI là source of truth
- Response phải theo envelope của `@musica/contracts`
- List endpoints phải có `meta.pagination`
- Có `requestId` trong response
- Phân quyền theo role ở tầng guard

## 2. Response envelope chuẩn

## 2.1 Success

```ts
{
  success: true,
  statusCode: number,
  data: TData,
  meta?: TMeta,
  requestId: string,
  timestamp: string
}
```

## 2.2 Error

```ts
{
  success: false,
  statusCode: number,
  error: {
    code: string,
    message: string,
    details?: unknown
  },
  requestId: string,
  timestamp: string
}
```

## 3. Nhóm Auth & Profile

## 3.1 `POST /auth/login`

- Actor: `SUPER_ADMIN`, `ADMIN`, `BUYER`
- Mục tiêu: đăng nhập bằng email/password
- Request body:
  - `email`
  - `password`
- Response data:
  - `accessToken`
  - `user`
  - `roles`
- Errors:
  - `INVALID_CREDENTIALS`
  - `USER_LOCKED`

## 3.2 `GET /auth/me`

- Actor: authenticated user
- Mục tiêu: lấy hồ sơ hiện tại và roles
- Response data:
  - `id`
  - `email`
  - `fullName`
  - `status`
  - `roles`

## 4. Nhóm Super Admin - Admin Management

## 4.1 `GET /admin/users/admins`

- Actor: `SUPER_ADMIN`
- Mục tiêu: list Admin
- Query:
  - `page`
  - `pageSize`
  - `keyword`
  - `status`

## 4.2 `POST /admin/users/admins`

- Actor: `SUPER_ADMIN`
- Mục tiêu: tạo Admin
- Request body:
  - `email`
  - `password`
  - `fullName`

## 4.3 `PATCH /admin/users/admins/:adminId/status`

- Actor: `SUPER_ADMIN`
- Mục tiêu: khóa/mở Admin
- Request body:
  - `status`

## 5. Nhóm Admin - User Management

## 5.1 `GET /admin/users`

- Actor: `ADMIN`
- Mục tiêu: list Artist và Buyer
- Query:
  - `role`
  - `status`
  - `keyword`
  - `page`
  - `pageSize`

## 5.2 `POST /admin/users`

- Actor: `ADMIN`
- Mục tiêu: tạo user role `ARTIST` hoặc `BUYER`
- Request body:
  - `email`
  - `password`
  - `fullName`
  - `role`

## 5.3 `GET /admin/users/:userId`

- Actor: `ADMIN`
- Mục tiêu: xem chi tiết user

## 5.4 `PATCH /admin/users/:userId`

- Actor: `ADMIN`
- Mục tiêu: cập nhật thông tin user
- Request body:
  - `fullName`
  - `status`

## 6. Nhóm Track Ingestion

## 6.1 `GET /admin/products`

- Actor: `ADMIN`
- Mục tiêu: list tracks để quản trị
- Query:
  - `status`
  - `genre`
  - `artistId`
  - `keyword`
  - `page`
  - `pageSize`

## 6.2 `POST /admin/products`

- Actor: `ADMIN`
- Mục tiêu: tạo track metadata
- Request body:
  - `title`
  - `artistId`
  - `authorName`
  - `genre`
  - `duration`
  - `usageRights`

## 6.3 `GET /admin/products/:trackId`

- Actor: `ADMIN`
- Mục tiêu: xem chi tiết track

## 6.4 `PATCH /admin/products/:trackId`

- Actor: `ADMIN`
- Mục tiêu: cập nhật metadata track

## 6.5 `POST /admin/products/:trackId/original-upload-url`

- Actor: `ADMIN`
- Mục tiêu: lấy signed upload URL cho original audio
- Response data:
  - `uploadUrl`
  - `fileKey`

## 6.6 `POST /admin/products/:trackId/preview-upload-url`

- Actor: `ADMIN`
- Mục tiêu: lấy signed upload URL cho preview audio
- Response data:
  - `uploadUrl`
  - `fileKey`

## 6.7 `PATCH /admin/products/:trackId/publish`

- Actor: `ADMIN`
- Mục tiêu: chuyển trạng thái `PUBLISHED`

## 6.8 `PATCH /admin/products/:trackId/hide`

- Actor: `ADMIN`
- Mục tiêu: chuyển trạng thái `HIDDEN`

## 7. Nhóm Buyer Catalog

## 7.1 `GET /catalog/tracks`

- Actor: public hoặc authenticated buyer
- Mục tiêu: list catalog published
- Query:
  - `keyword`
  - `genre`
  - `usageRight`
  - `page`
  - `pageSize`
- Response:
  - chỉ trả track `PUBLISHED`
  - có `meta.pagination`

## 7.2 `GET /catalog/tracks/:trackId`

- Actor: public hoặc authenticated buyer
- Mục tiêu: xem chi tiết track published
- Response data:
  - metadata cơ bản
  - preview audio URL
  - usage rights khả dụng

## 8. Nhóm Mock Checkout & Purchase

## 8.1 `POST /buyer/checkout`

- Actor: `BUYER`
- Mục tiêu: xác nhận mua quyền cho 1 track
- Request body:
  - `trackId`
  - `selectedUsageRights`
- Luồng xử lý:
  - validate track tồn tại
  - validate track là `PUBLISHED`
  - validate buyer hợp lệ
  - snapshot dữ liệu
  - tạo certificate record
  - sinh PDF
- Response data:
  - `certificateId`
  - `status`
  - `downloadAvailable`
- Errors:
  - `TRACK_NOT_FOUND`
  - `TRACK_NOT_PUBLISHED`
  - `INVALID_USAGE_RIGHTS`

## 9. Nhóm Buyer Certificates

## 9.1 `GET /buyer/certificates`

- Actor: `BUYER`
- Mục tiêu: list certificates của chính buyer
- Query:
  - `page`
  - `pageSize`
  - `keyword`
  - `fromDate`
  - `toDate`

## 9.2 `GET /buyer/certificates/:certificateId`

- Actor: `BUYER`
- Mục tiêu: xem chi tiết certificate của chính mình

## 9.3 `GET /buyer/certificates/:certificateId/download`

- Actor: `BUYER`
- Mục tiêu: lấy signed download URL cho PDF certificate
- Response data:
  - `downloadUrl`
  - `fileName`

## 10. Nhóm Admin Certificates

## 10.1 `GET /admin/certificates`

- Actor: `ADMIN`
- Mục tiêu: tra cứu certificates toàn hệ thống
- Query:
  - `buyerKeyword`
  - `trackKeyword`
  - `artistId`
  - `status`
  - `fromDate`
  - `toDate`
  - `page`
  - `pageSize`

## 10.2 `GET /admin/certificates/:certificateId`

- Actor: `ADMIN`
- Mục tiêu: xem chi tiết certificate

## 10.3 `GET /admin/certificates/:certificateId/download`

- Actor: `ADMIN`
- Mục tiêu: lấy signed download URL cho PDF

## 11. Nhóm Dashboard

## 11.1 `GET /admin/dashboard/summary`

- Actor: `ADMIN`, `SUPER_ADMIN`
- Mục tiêu: lấy số liệu tóm tắt
- Response data:
  - `totalTracks`
  - `publishedTracks`
  - `totalBuyers`
  - `totalArtists`
  - `totalCertificates`

## 11.2 `GET /admin/dashboard/certificate-trends`

- Actor: `ADMIN`, `SUPER_ADMIN`
- Mục tiêu: biểu đồ số certificate theo thời gian
- Query:
  - `fromDate`
  - `toDate`
  - `groupBy`

## 11.3 `GET /admin/dashboard/top-genres`

- Actor: `ADMIN`, `SUPER_ADMIN`
- Mục tiêu: top genres theo số lượng tracks hoặc số lượng certificates

## 12. Health & System

## 12.1 `GET /health`

- Actor: public
- Mục tiêu: health check cho Render

## 13. Gợi ý status codes

- `200` success read/update
- `201` success create
- `400` validation/business rule error
- `401` unauthenticated
- `403` forbidden
- `404` resource not found
- `409` conflict

## 14. API coverage theo nghiệp vụ

### Ingestion

- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/:trackId`
- `POST /admin/products/:trackId/original-upload-url`
- `POST /admin/products/:trackId/preview-upload-url`
- `PATCH /admin/products/:trackId/publish`
- `PATCH /admin/products/:trackId/hide`

### Discovery & Purchase

- `GET /catalog/tracks`
- `GET /catalog/tracks/:trackId`
- `POST /buyer/checkout`
- `GET /buyer/certificates`
- `GET /buyer/certificates/:certificateId/download`

### Operations

- `GET /admin/users`
- `POST /admin/users`
- `GET /admin/certificates`
- `GET /admin/dashboard/summary`
- `GET /admin/users/admins`
- `POST /admin/users/admins`

## 15. Gợi ý module mapping trong NestJS

- `auth`
- `users`
- `tracks`
- `catalog`
- `checkout`
- `certificates`
- `dashboard`

Đây là cấu trúc phù hợp với modular monolith và thuận tiện cho Swagger grouping.
