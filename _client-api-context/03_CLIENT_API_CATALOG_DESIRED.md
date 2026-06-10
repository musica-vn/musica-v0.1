# Client API Catalog (Desired) — Buyer + Artist UI

Tài liệu này mô tả “API contract mong muốn” cho UI buyer + artist.

Trạng thái triển khai hiện tại:
- `POST /auth/login`: đã có thật trong BE.
- `GET /health`: đã có thật trong BE.
- Các endpoints dưới đây: dùng để **mock trước** (vì BE hiện tập trung `/admin/*`).

Mọi responses đều theo envelope `@musica/contracts` (xem [01_API_ENVELOPE_AND_PAGINATION.md](./01_API_ENVELOPE_AND_PAGINATION.md)).

## 1) Public catalog (guest hoặc logged-in)

### 1.1 List products

`GET /products`

- Auth: public
- Query:
  - `page` (number, default 1)
  - `pageSize` (number, default 20)
  - `q` (string, optional) — search theo title/artist
  - `genre` (string, optional)
- Response `data.items[]` (list item):
  - `id` (uuid)
  - `productCode` (string, vd `PROD-000001`)
  - `title` (string)
  - `thumbnailUrl` (string | null)
  - `artistDisplayName` (string)

### 1.2 Product detail

`GET /products/:productId`

- Auth: public
- Response `data`:
  - `id`, `productCode`, `title`, `description?`, `genre?`, `durationSeconds?`
  - `thumbnailUrl`
  - `artist: { id, displayName }`
  - `availableRightsSummary` (optional; UI có thể bỏ qua nếu chưa implement pricing)

### 1.3 Product thumbnail signed URL (optional)

`GET /products/:productId/thumbnail-url`

- Auth: public
- Response `data`: `{ url: string, expiresInSeconds: number }`

### 1.4 Product preview playback URL (optional)

`GET /products/:productId/playback-url`

- Auth: public (hoặc require login tuỳ policy sau)
- Response `data`: `{ url: string, expiresInSeconds: number }`

## 2) Buyer APIs (authenticated role BUYER)

### 2.1 Quote (tính giá)

`POST /checkout/quote`

- Auth: `BUYER`
- Request body (tối giản cho UI; có thể mở rộng sau):

```json
{
  "productId": "uuid",
  "selection": {
    "digital": {
      "platform": "YOUTUBE",
      "durationType": "ONE_YEAR"
    },
    "physical": null,
    "expressionConfigId": null,
    "modificationConfigId": null,
    "corePermissionIds": ["uuid"]
  }
}
```

- Response `data`:
  - `currency` (string, vd `VND`)
  - `subtotal` (number)
  - `fees` (number)
  - `tax` (number)
  - `total` (number)
  - `breakdown` (optional for UI explain)

Ghi chú: Pricing canonical ở Backend (BE compute, FE chỉ hiển thị).

### 2.2 Purchase (mua và tạo certificate)

`POST /purchases`

- Auth: `BUYER`
- Request body:

```json
{
  "productId": "uuid",
  "selection": {
    "digital": { "platform": "YOUTUBE", "durationType": "ONE_YEAR" },
    "physical": null,
    "expressionConfigId": null,
    "modificationConfigId": null,
    "corePermissionIds": ["uuid"]
  },
  "payment": {
    "provider": "MOCK",
    "method": "MOCK"
  }
}
```

- Response `data`:
  - `purchaseId` (string)
  - `certificateId` (uuid)
  - `status` (string: `SUCCEEDED` | `FAILED` | `PENDING`)

Ghi chú: Repo hiện chưa có `Order/Payment`; endpoint này nhằm unblock UI flow. Khi BE implement thật có thể đổi thành `/orders` + payment intents.

### 2.3 My certificates (list)

`GET /me/certificates`

- Auth: `BUYER`
- Query:
  - `page`, `pageSize`
  - `q` (optional) — search theo productCode/title
- Response `data.items[]`:
  - `id` (uuid)
  - `productId` (uuid)
  - `productCode` (string)
  - `productTitle` (string)
  - `artistDisplayName` (string)
  - `status` (string, vd `ACTIVE`)
  - `validFrom` (ISO string)
  - `validUntil` (ISO string | null)
  - `createdAt` (ISO string)

### 2.4 Certificate detail

`GET /me/certificates/:certificateId`

- Auth: `BUYER`
- Response `data`:
  - Tất cả fields của list item
  - `rightsSummary` (string[] hoặc object) — UI hiển thị “quyền đã mua”

### 2.5 Download certificate (signed URL)

`GET /me/certificates/:certificateId/download`

- Auth: `BUYER`
- Response `data`: `{ downloadUrl: string, expiresInSeconds: number }`

## 3) Artist APIs (authenticated role ARTIST)

### 3.1 My products (list)

`GET /me/products`

- Auth: `ARTIST`
- Query: `page`, `pageSize`, `q`, `status` (optional)
- Response `data.items[]`:
  - `id`, `productCode`, `title`, `thumbnailUrl`, `status`, `createdAt`

### 3.2 Product detail (artist scope)

`GET /me/products/:productId`

- Auth: `ARTIST`
- Response `data`: product detail + compliance summary (optional)

### 3.3 Upload flows (optional; chỉ bật nếu artist được tự upload)

- `POST /me/products/:productId/original-upload-url` → `{ uploadUrl, fileKey }`
- `POST /me/products/:productId/confirm-audio-upload` → `{ ok: true }`
- `POST /me/products/:productId/thumbnail-upload-url` → `{ uploadUrl, fileKey }`
- `POST /me/products/:productId/confirm-thumbnail-upload` → `{ ok: true }`

## 4) System

### Healthcheck (đã có thật)

`GET /health`

- Auth: public
- Response `data`: `{ ok: true }`
