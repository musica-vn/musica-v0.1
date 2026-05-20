### API contracts (global)

#### Response envelope (bắt buộc)
Mọi endpoint từ BE phải trả về 1 trong 2 dạng dưới đây (theo `@musica/contracts`):

```ts
type ApiSuccessResponse<TData, TMeta = undefined> = {
  success: true
  statusCode: number
  data: TData
  meta?: TMeta
  requestId: string
  timestamp: string
}

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

#### Pagination meta (list endpoints)
Các endpoint trả list phải có `meta.pagination`:

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

#### Request ID
- Client có thể gửi header `x-request-id`.
- Nếu không có, server sẽ generate.
- Tất cả responses phải trả về `requestId` để trace.

#### FE expectations
- FE chỉ unwrap theo envelope; không tự ý “đổi format” response.
- Khi cần typed calls, ưu tiên types generate từ OpenAPI trong FE, nhưng envelope vẫn theo `@musica/contracts`.
