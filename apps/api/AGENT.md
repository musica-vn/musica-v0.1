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

## Local skills (bạn điền)
- Dán skill/prompt BE-specific ở đây để AI áp dụng khi làm việc trong BE.
