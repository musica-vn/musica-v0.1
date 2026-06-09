# Hybrid strategy (Mock + Call thật)

Mục tiêu: UI codebase mới có thể chạy ngay (mock) nhưng vẫn tận dụng BE thật ở những phần đã có.

## 1) Call thật ngay (BE repo này đã có)

- `POST /auth/login`
- `GET /health`

## 2) Mock trước (đề xuất contract trong [03_CLIENT_API_CATALOG_DESIRED.md](./03_CLIENT_API_CATALOG_DESIRED.md))

- `GET /products`, `GET /products/:id`
- `POST /checkout/quote`
- `POST /purchases`
- `GET /me/certificates`, `GET /me/certificates/:id`, `GET /me/certificates/:id/download`
- `GET /me/products`, `GET /me/products/:id` (artist)

## 3) Quy ước mock data (để UI không “lạc đường”)

- Product `id` phải là UUID string.
- `productCode` theo format `PROD-000001` (6 digits).
- Certificate `id` phải là UUID string.
- Khi mock list, luôn trả `meta.pagination` đúng format.
- Errors: luôn trả `ApiErrorResponse` với `statusCode` đúng (`401|403|404|400`).

## 4) Cách chuyển từ Mock → Real (không đổi UI)

Khuyến nghị UI layer theo pattern:
- `ApiClient` nhận `baseUrl` + `getToken()`.
- Tất cả API functions trả về `data` đã unwrap từ envelope.
- Có “adapter” để switch mock/real theo feature flag:
  - `VITE_USE_MOCK_PRODUCTS=true`
  - `VITE_USE_MOCK_PURCHASE=true`

## 5) Guard rails (để Trae không gọi nhầm /admin)

- UI buyer/artist không gọi `/admin/*`.
- Nếu cần reuse data từ admin API trong giai đoạn dev, chỉ dùng bằng admin token ở môi trường nội bộ, không merge vào production client flow.
