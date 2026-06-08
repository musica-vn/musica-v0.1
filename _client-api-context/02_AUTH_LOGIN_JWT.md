# Auth: Login + JWT Bearer

## Endpoint (đã có thật trong BE hiện tại)

### `POST /auth/login`

- Auth: public
- Content-Type: `application/json`

#### Request body

```json
{
  "email": "buyer01@musica.local",
  "password": "Password123!"
}
```

#### Success response (envelope)

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresInSeconds": 604800,
    "user": {
      "id": "uuid",
      "email": "buyer01@musica.local",
      "fullName": "Buyer 01",
      "status": "ACTIVE"
    },
    "roles": ["BUYER"]
  },
  "requestId": "uuid",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

## Gắn JWT vào các call sau

- Header: `Authorization: Bearer <accessToken>`
- Nếu thiếu token hoặc token invalid: `401`
- Nếu token đúng nhưng thiếu role/scope: `403`

## Roles hiện có (theo DB seed + BE guards)

- `SUPER_ADMIN`
- `ADMIN`
- `ARTIST`
- `BUYER`

## Quy ước route

- `/admin/*`: admin-only (đã implement trong BE).
- Client app (buyer/artist) nên dùng các route **không có prefix `/admin`** (xem [03_CLIENT_API_CATALOG_DESIRED.md](./03_CLIENT_API_CATALOG_DESIRED.md)).
