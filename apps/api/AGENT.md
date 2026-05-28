# BE AGENT.md

## Scope
- Mọi thay đổi thuộc BE nằm trong `apps/api`.
- Mục tiêu: API theo chuẩn response + Swagger/OpenAPI + Supabase migrations.

## File/Folder quan trọng
- Nest entry: `src/main.ts`
- Modules: `src/*`
- Response envelope: `src/common/api-response.interceptor.ts`
- Error format: `src/common/api-exception.filter.ts`
- Pagination query: `src/common/pagination.dto.ts`
- OpenAPI output: `openapi.json`

## Supabase
- Config/migrations: `apps/api/supabase`
- CLI wrapper (sandbox safe): `apps/api/scripts/supabase.mjs`
- Commands:
  - `pnpm --filter api sb:login`
  - `pnpm --filter api sb:init`
  - `pnpm --filter api sb:link -- --project-ref <SUPABASE_PROJECT_REF>`
  - `pnpm db:push`

## Quy ước
- Không hardcode secrets, không log secrets.
- Response/error phải theo `@musica/contracts` (có `statusCode`, `requestId`, `timestamp`).
- List endpoints phải trả `meta.pagination` (offset).
- Ưu tiên giữ logic theo module domain (`src/<domain>`), DTO rõ ràng, service không trộn concern storage/auth/business rule.
- Migrations phải additive và an toàn cho dữ liệu hiện có; mọi FK/index/check constraint mới cần cân nhắc backfill.
- Khi thêm hoặc sửa endpoint, cập nhật Swagger/OpenAPI tương ứng.

## Runtime guide
- Dùng `SupabaseService` làm entry point cho DB/storage, tránh rải config trực tiếp trong service.
- Business errors nên trả `HttpException` với message/code ổn định để FE map được.
- Các flow có side effects nhiều bước cần ưu tiên idempotent và validate trước khi ghi dữ liệu.
- Không để debug snippets hoặc file `.dbg` phụ thuộc vào runtime code sau khi fix xong.

## Verification
- Sau thay đổi đáng kể, chạy tối thiểu:
  - `pnpm --filter api test -- --runInBand`
  - `pnpm --filter api lint`
