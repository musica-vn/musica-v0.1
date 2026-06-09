# Marketplace API (List + Detail) — Spec cho FE ghép UI

Tài liệu này dùng để giao task cho FE ghép UI marketplace (browse list + product detail). Scope **chưa bao gồm flow mua**.

Trạng thái codebase hiện tại:
- **Đã có API thật** để lấy products theo role **ADMIN** và **ARTIST** (không public).
- **Chưa có** endpoints public cho marketplace (`/marketplace/*`). Phần “Public API Spec” bên dưới là **spec đề xuất** dựa trên data model + filter/sort logic đang tồn tại trong module products.

---

## 1) Contract bắt buộc (FE phải unwrap theo envelope)

### 1.1 Response envelope
- Source of truth: [@musica/contracts](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src)
- Success: [ApiSuccessResponse](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/api-success-response.ts#L1-L8)
- Error: [ApiErrorResponse](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/api-error-response.ts#L1-L11)

### 1.2 Pagination meta (list endpoints)
- `meta.pagination`: [PaginationMeta](file:///c:/Users/Admin/Desktop/musica-v0.1/packages/contracts/src/pagination-meta.ts#L1-L10)

### 1.3 RequestId
- Client có thể gửi `x-request-id` (optional).
- Server sẽ luôn trả `requestId` trong response để trace.

---

## 2) Data Model cho Marketplace UI

Source of truth về shape “product đầy đủ” trong API:
- DTO: [ProductDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/product.dto.ts#L129-L204)
- FE types đang dùng: [Product](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/types/products.types.ts#L70-L95)

### 2.1 MarketplaceProductListItem (đủ để render list/grid)

| Field | Type | Nullable | UI dùng để | Notes |
|---|---:|---:|---|---|
| `id` | `string (uuid)` | No | route detail (`/marketplace/products/:id`) | |
| `title` | `string` | No | card title | |
| `authorName` | `string` | Yes | subtitle/artist name | Từ `author_name` |
| `genres` | `string[]` | No | filter chips / tags | `genres` fallback từ `genre` trong BE ([mapProductRowToDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L183-L197)) |
| `duration` | `number` | Yes | duration badge | seconds |
| `artistId` | `string (uuid)` | No | filter theo artist | |
| `thumbnailUrl` | `string (signed url)` | Yes | render image | Public spec sẽ trả inline; TTL theo signed URL |
| `previewAudioUrl` | `string (signed url)` | Yes | play preview | Public spec sẽ trả inline; nếu object không tồn tại thì `null` |
| `createdAt` | `string (ISO)` | No | sort | |
| `updatedAt` | `string (ISO)` | No | sort | |

### 2.2 MarketplaceProductDetail (đủ để render detail page)

Bao gồm toàn bộ fields của `MarketplaceProductListItem` + thêm:

| Field | Type | Nullable | UI dùng để | Notes |
|---|---:|---:|---|---|
| `description` | `string` | Yes | mô tả sản phẩm | |
| `useCases` | `string[]` | No | tags/use-case section | BE fallback từ `use_case` ([mapProductRowToDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L191-L194)) |
| `allowedPermissions` | `{ id,name,lawReference }[]` | No | “quyền được cấp” section | BE join từ `track_allowed_permissions` → `core_permissions` ([ProductAllowedPermissionDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/product.dto.ts#L3-L12)) |

### 2.3 Public field policy (để tránh leak admin/internal)

Public marketplace (browse) đề xuất **KHÔNG expose** các fields internal/admin sau (vì hiện phục vụ admin workflow):
- `complianceLegalStatus`, `complianceReviewStatus`
- `originalAudioKey`, `sheetMusicPdfKey`, `thumbnailKey` (public chỉ cần `thumbnailUrl` + `previewAudioUrl`)
- `createdBy`
- `licensingEligibility`, `digitalPackageRegistrations`, `physicalPackageRegistrations` (nếu marketplace UI chưa render gói/eligibility)

Nếu UI marketplace cần hiển thị eligibility/gói sau này, nên define thêm “PublicEligibilityView” riêng thay vì expose nguyên admin model.

---

## 3) Existing APIs (call thật trong codebase hiện tại)

Mục đích phần này: FE có thể lấy data thật để ghép UI trong lúc public endpoints chưa implement.

### 3.1 Admin products (data thật, yêu cầu JWT + role)

Controller: [AdminProductsController](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/admin-products.controller.ts#L47-L213)  
Auth: `JwtAuthGuard` + `RolesGuard` + `RequireRoles('ADMIN','SUPER_ADMIN')` ([admin-products.controller.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/admin-products.controller.ts#L47-L51))

| Method | Endpoint | Purpose | Protected | Key Query/Body |
|---|---|---|---:|---|
| GET | `/admin/products` | List products (pagination + filter + sort) | Yes | Query: `page,pageSize,keyword?,genre?,artistId?,status?,sort?` ([AdminProductsListQueryDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/admin-products.dto.ts#L18-L84)) |
| GET | `/admin/products/:productId` | Product detail | Yes | Path: `productId (uuid)` |
| GET | `/admin/products/:productId/thumbnail-url` | Signed thumbnail URL | Yes | TTL signed URL = 6h ([SIGNED_URL_EXPIRES_IN_SECONDS](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L232-L233)) |

Ghi chú quan trọng cho FE:
- Admin list trả `thumbnailKey`, không trả `thumbnailUrl`. Nếu muốn render thumbnail, gọi thêm `GET /admin/products/:id/thumbnail-url` ([createThumbnailUrl](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L1448-L1466)).
- Search/filter logic của admin list (gần đúng marketplace):
  - `genre`: `.contains('genres', [genre])`
  - `artistId`: `.eq('artist_id', artistId)`
  - `keyword`: OR ilike trên `title`, `author_name`, `genre`, `use_case` ([applyProductAdminFilters](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L921-L954))

### 3.2 Creator products (ARTIST, có list + detail)

Controller: [CreatorProductPackageRegistrationsController](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/product-package-registrations/creator-product-package-registrations.controller.ts#L34-L63)  
Auth: `RequireRoles('ARTIST')` ([creator-product-package-registrations.controller.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/product-package-registrations/creator-product-package-registrations.controller.ts#L34-L38))

| Method | Endpoint | Purpose | Protected | Notes |
|---|---|---|---:|---|
| GET | `/creator/products` | List products của artist | Yes | Không có pagination query ở endpoint này (BE trả list theo user) |
| GET | `/creator/products/:productId` | Detail product của artist | Yes | |

---

## 4) Public Marketplace API Spec (đề xuất để implement)

Chốt requirement:
- Public browse: **không cần login**
- Public list/detail: **chỉ trả products status = `PUBLISHED`**
- Base path: **`/marketplace`**
- Inline thumbnail URL (signed)
- Filter: `keyword + genre + artistId` (+ pagination)
- Sort: `createdAt | updatedAt | title` (asc/desc)

### 4.1 GET /marketplace/products (List)

#### Fundamental Purpose
- FE gọi endpoint này để render **marketplace list/grid**: filter/search/sort/pagination.

#### Technical Flow (gợi ý bám theo logic có sẵn)
- Có thể reuse phần filter/sort từ admin list:
  - Sort parsing: mapping `createdAt/updatedAt/title` → `created_at/updated_at/title` ([parseSort](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L234-L259))
  - Filter logic: keyword/genre/artistId ([applyProductAdminFilters](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L921-L954))
- Force thêm filter `status = PUBLISHED`.
- Với `thumbnailUrl` inline: BE tạo signed URL từ `thumbnail_key` (TTL 6h) như flow admin ([createThumbnailUrl](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/products/products.service.ts#L1448-L1466)).
- Với `previewAudioUrl` inline: BE tạo signed URL từ bucket preview theo convention `products/<productId>/preview.mp3` (nếu không có object thì trả `null`).

#### Query params

| Param | Type | Required | Default | Meaning |
|---|---|---:|---:|---|
| `page` | number | Yes | 1 | trang |
| `pageSize` | number | Yes | 12 | số item/trang |
| `keyword` | string | No | - | search theo `title/author/genre/useCase` (ilike) |
| `genre` | string | No | - | lọc theo `genres contains [genre]` |
| `artistId` | uuid | No | - | lọc theo artist |
| `sort` | enum | No | `createdAt:desc` | `createdAt|updatedAt|title` + `:asc|:desc` |

Đề xuất enum:
- `createdAt:desc | createdAt:asc | updatedAt:desc | updatedAt:asc | title:asc | title:desc`

#### Response shape

`ApiSuccessResponse<{ items: MarketplaceProductListItem[] }, PaginationMeta>`

#### Example (success)

Request:
`GET /marketplace/products?page=1&pageSize=12&keyword=synth&sort=createdAt:desc`

Response:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "2f1b7a4d-6c1b-4b9a-8a01-0b2d3c4e5f60",
        "title": "Neon Skyline (Instrumental)",
        "authorName": "Musica Studio",
        "genres": ["Electronic", "Synthwave"],
        "duration": 182,
        "artistId": "6f8c8c2e-1c33-4b6f-9d8a-1f2e3d4c5b6a",
        "thumbnailUrl": "https://<signed-url>",
        "previewAudioUrl": "https://<signed-url>",
        "createdAt": "2026-06-01T08:00:00.000Z",
        "updatedAt": "2026-06-08T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 12,
      "totalItems": 120,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "requestId": "e1b0c3a0-4e2d-4a77-9d2a-0e3f4a5b6c7d",
  "timestamp": "2026-06-08T10:40:00.000Z"
}
```

#### Example (validation error)

Request:
`GET /marketplace/products?page=1&pageSize=12&sort=invalid`

Response:
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "sort must be one of the following values: createdAt:desc, createdAt:asc, updatedAt:desc, updatedAt:asc, title:asc, title:desc",
    "details": {
      "statusCode": 400,
      "message": [
        "sort must be one of the following values: createdAt:desc, createdAt:asc, updatedAt:desc, updatedAt:asc, title:asc, title:desc"
      ],
      "error": "Bad Request"
    }
  },
  "requestId": "c3f2d1a0-5b6c-4d7e-8f90-1a2b3c4d5e6f",
  "timestamp": "2026-06-08T10:40:10.000Z"
}
```

### 4.2 GET /marketplace/products/:productId (Detail)

#### Fundamental Purpose
- FE gọi endpoint này để render trang product detail (title/description/permissions/use-cases/thumbnail).

#### Path params
- `productId`: uuid

#### Response shape
- `ApiSuccessResponse<MarketplaceProductDetail>`

#### Example (success)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "2f1b7a4d-6c1b-4b9a-8a01-0b2d3c4e5f60",
    "title": "Neon Skyline (Instrumental)",
    "authorName": "Musica Studio",
    "genres": ["Electronic", "Synthwave"],
    "useCases": ["INTRO", "BRANDING"],
    "duration": 182,
    "artistId": "6f8c8c2e-1c33-4b6f-9d8a-1f2e3d4c5b6a",
    "thumbnailUrl": "https://<signed-url>",
    "previewAudioUrl": "https://<signed-url>",
    "description": "Nhạc nền synthwave phù hợp intro/branding video.",
    "allowedPermissions": [
      {
        "id": "c0a8012e-8b1c-4f0f-9c1a-2b3c4d5e6f70",
        "name": "Public performance",
        "lawReference": "LAW-REF-001"
      }
    ],
    "createdAt": "2026-06-01T08:00:00.000Z",
    "updatedAt": "2026-06-08T10:00:00.000Z"
  },
  "requestId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
  "timestamp": "2026-06-08T10:41:00.000Z"
}
```

---

## 5) Mapping nhanh: Marketplace spec ↔ Existing admin APIs

| Marketplace need | Public spec (to implement) | Existing call thật (workaround) | Notes |
|---|---|---|---|
| List products | `GET /marketplace/products` | `GET /admin/products` | Cần login admin; list trả `thumbnailKey` (không có `thumbnailUrl`) |
| Thumbnail inline | `thumbnailUrl` trong list/detail | `GET /admin/products/:id/thumbnail-url` | Signed URL TTL 6h |
| Audio preview inline | `previewAudioUrl` trong list/detail | Chưa có public tương đương | Admin có `GET /admin/products/:id/original-playback-url` nhưng đó là original audio (không phải preview) |
| Product detail | `GET /marketplace/products/:id` | `GET /admin/products/:id` | Admin detail trả full model (nhiều field internal) |
