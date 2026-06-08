# API Envelope + Pagination (bắt buộc)

Tất cả endpoints (cả admin và client) phải trả về 1 trong 2 dạng dưới đây (theo `@musica/contracts`).

## Success envelope

```ts
type ApiSuccessResponse<TData, TMeta = undefined> = {
  success: true
  statusCode: number
  data: TData
  meta?: TMeta
  requestId: string
  timestamp: string
}
```

## Error envelope

```ts
type ApiErrorResponse = {
  success: false
  statusCode: number
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId: string
  timestamp: string
}
```

## Pagination meta (list endpoints)

List endpoints phải có `meta.pagination`:

```ts
type PaginationMeta = {
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
```

## Ví dụ

### List products (success)

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "c0f8a52d-7a50-4e9a-8d0f-9e2b1aa1c111",
        "productCode": "PROD-000001",
        "title": "Song A",
        "thumbnailUrl": "https://...",
        "artistDisplayName": "Artist 01"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "requestId": "e2efcbd8-0a70-4c9d-8e86-e88f7b0f5c5a",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### Forbidden (error)

```json
{
  "success": false,
  "statusCode": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "User does not have required roles",
    "details": {
      "required": ["ADMIN"],
      "actual": ["BUYER"]
    }
  },
  "requestId": "e2efcbd8-0a70-4c9d-8e86-e88f7b0f5c5a",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

## Request ID
- Client có thể gửi `x-request-id`.
- Nếu không có, server sẽ generate.
- UI nên log `requestId` khi báo lỗi để trace.
