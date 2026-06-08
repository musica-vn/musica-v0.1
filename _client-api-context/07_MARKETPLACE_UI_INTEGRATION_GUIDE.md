# Marketplace UI Integration Guide (Buyer-facing) — ghép API vào UI

Tài liệu này dành cho FE dev mới, mục tiêu: **dựng trang marketplace (browse → detail → pricing → buy)** theo đúng patterns trong repo, và biết rõ endpoint nào **call thật được ngay** vs endpoint nào đang **chưa tồn tại** (cần mock theo “desired contract”).

---

## 1) Fundamental Purpose

- **Marketplace page** là nơi Buyer duyệt danh sách sản phẩm (product), xem chi tiết, chọn variant/license config, tính giá và thực hiện mua.
- Trong repo hiện tại:
  - **Có**: `POST /auth/login`, `POST /public/variant-pricing/calculate`, rất nhiều `/admin/*` endpoints.
  - **Chưa có**: buyer endpoints kiểu `/marketplace/products`, `/buyer/orders`, `/buyer/purchases`, `/buyer/certificates` (không thấy trong code + OpenAPI).

---

## 2) Technical Flow (FE data flow) — cách ghép theo chuẩn codebase

### 2.1 Cấu trúc FE nên dùng (theo patterns đang có)

- **Route (đã có sẵn skeleton)**: routes public (không require admin) đã được add vào [router/index.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/router/index.ts#L16-L40)
  - `/marketplace` (list)
  - `/marketplace/products/:productId` (detail)
- **Views (đã có sẵn skeleton)**:
  - List: [MarketplaceListView.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/marketplace/MarketplaceListView.vue)
  - Detail + pricing widget: [MarketplaceDetailView.vue](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/views/marketplace/MarketplaceDetailView.vue)
- **Service layer (đã có sẵn)**: [marketplace.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/services/marketplace.service.ts) theo style [products.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/services/products.service.ts#L1-L200)
  - Datasource toggle qua env: `VITE_MARKETPLACE_DATA_SOURCE=mock|admin|creator` ([apps/web/.env](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/.env#L1-L2))
  - `mock`: dùng data mock local + gọi thật pricing API
  - `admin/creator`: gọi endpoints tương ứng (cần login đúng role)
- **Store/Composable**:
  - Nếu state shared nhiều page: tạo Pinia store tương tự [auth.store.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/stores/auth.store.ts#L66-L107)
  - Nếu state scope trong 1 page: dùng composable + `ref/computed` là đủ

### 2.2 Error handling (để UI không “vỡ”)

- Mọi API call có thể throw `ApiClientError` (wrapper của ApiErrorResponse) ([axios.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/api/axios.ts#L7-L20))
- UI cần map tối thiểu:
  - `statusCode === 401` hoặc `code === 'UNAUTHORIZED'` → logout + redirect login (nếu page cần auth)
  - `statusCode === 403` hoặc `code === 'AUTH_INSUFFICIENT_ROLE'` → show “không có quyền”
  - `code === 'VALIDATION_ERROR'` → render lỗi input dựa trên `details`

---

## 3) API Integration (thực tế có trong repo) — dùng ngay cho marketplace UI

### 3.1 Pricing calculator (Public) — dùng được ngay

#### Purpose

- Marketplace cần tính giá theo “variant” (digital/physical + subject/duration/scope + expression/modification).

#### Flow

- FE gọi `POST /public/variant-pricing/calculate`
- BE validate input (class-validator) → trả về total price + breakdown lines

#### Endpoint spec

| Method | Endpoint | Protected? | Body |
|---|---|---:|---|
| POST | `/public/variant-pricing/calculate` | No | `platformType` + các configId/field optional |

Request DTO: [PublicVariantPricingCalculateRequestDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/pricing/variant-pricing.dto.ts#L21-L60)  
Response DTO: [PublicVariantPricingCalculateDataDto](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/api/src/modules/pricing/variant-pricing.dto.ts#L70-L81)

#### Example (request/response envelope)

Request
```json
{
  "platformType": "DIGITAL",
  "digitalRightConfigId": "7b9e2d5a-2e9a-4b3b-9aa4-2d3b2d4a1b11",
  "subject": "BUSINESS",
  "duration": "ONE_YEAR",
  "scope": "VIETNAM",
  "expressionConfigId": "8d6f2a18-1f2c-4c39-9f58-5b6f9f1e2d3c",
  "modificationConfigId": "0fb9e8cf-0f7a-4b4d-8a90-1d2c3b4a5f6e"
}
```

Response (success)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalPrice": 1200000,
    "currency": "VND",
    "breakdown": [
      { "key": "BASE", "label": "Base price" },
      { "key": "DURATION", "label": "Duration modifier" }
    ]
  },
  "requestId": "c6f2f6f0-4f5b-4d55-9f0a-8d5b3d2b1a00",
  "timestamp": "2026-06-08T10:30:00.000Z"
}
```

Response (validation error)
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "platformType must be one of the following values: DIGITAL, PHYSICAL",
    "details": {
      "statusCode": 400,
      "message": [
        "platformType must be one of the following values: DIGITAL, PHYSICAL"
      ],
      "error": "Bad Request"
    }
  },
  "requestId": "8c7f0a2b-3d4e-4f50-9a1b-2c3d4e5f6071",
  "timestamp": "2026-06-08T10:30:10.000Z"
}
```

---

## 4) Product Data cho Marketplace — hiện có gì, thiếu gì

### 4.1 Data model “Product” đã có type trên FE

- FE đang có type `Product` (dùng cho admin/creator) tại [products.types.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/types/products.types.ts#L70-L95)
- Marketplace UI có thể reuse fields hiển thị:
  - `title`, `authorName`, `genres`, `duration`, `description`, `thumbnailKey`, `status`

### 4.2 Endpoint “browse products” cho Buyer: hiện chưa có

Không thấy endpoint public/buyer trong BE cho:
- list products public
- product detail public
- purchase / order
- certificate download cho buyer

Thực tế BE hiện có:
- Admin list products: `GET /admin/products` (requires `ADMIN/SUPER_ADMIN`) ([products.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/services/products.service.ts#L25-L31))
- Creator list products: `GET /creator/products` (requires `ARTIST`) ([products.service.ts](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/services/products.service.ts#L157-L163))

---

## 5) Real-world Integration Plan cho dev mới (để ghép marketplace UI “ngay”)

### Option A (khuyến nghị): Hybrid mocking theo “desired contract”

- Mục tiêu: build UI marketplace đúng flow, không bị block bởi thiếu buyer endpoints.
- Source of truth cho contract:  
  - [03_CLIENT_API_CATALOG_DESIRED.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/03_CLIENT_API_CATALOG_DESIRED.md)  
  - [04_HYBRID_MOCKING_STRATEGY.md](file:///c:/Users/Admin/Desktop/musica-v0.1/_client-api-context/04_HYBRID_MOCKING_STRATEGY.md)
- Cách ghép:
  - Marketplace page dùng mock cho:
    - `GET /marketplace/products`
    - `GET /marketplace/products/:id`
    - `POST /buyer/purchases` (checkout)
  - Nhưng call thật cho:
    - `POST /public/variant-pricing/calculate` (pricing widget)
    - `POST /auth/login` (nếu marketplace yêu cầu login trước khi mua)

### Option B (tạm thời, dev nội bộ): reuse `/admin/products` để có “data thật”

- Dùng token admin để:
  - list products: `GET /admin/products?page=1&pageSize=20`
  - load thumbnail URL: `GET /admin/products/:id/thumbnail-url`
- Nhược điểm:
  - Buyer marketplace không nên phụ thuộc admin auth trong production
  - Data shape ok cho UI list/detail nhưng permission/role sẽ không đúng

---

## 6) Checklist cho marketplace page (UI wiring)

- **Data fetching**
  - List page: fetch products (mock hoặc `/admin/products`), render card grid, filter/sort UI map ra query
  - Detail page: fetch product by id (mock hoặc `/admin/products/:id` nếu có), fetch thumbnail signed URL nếu cần
- **Pricing widget**
  - Form chọn platformType + configs + subject/duration/scope
  - On submit: call `POST /public/variant-pricing/calculate` và render `totalPrice` + `breakdown`
- **Auth boundary**
  - Nếu “mua” yêu cầu login: dùng [useAuthStore](file:///c:/Users/Admin/Desktop/musica-v0.1/apps/web/src/stores/auth.store.ts#L66-L107) để check `isAuthenticated`
- **Error UX**
  - Handle `ApiClientError` code/status và show message + requestId (để debug)
