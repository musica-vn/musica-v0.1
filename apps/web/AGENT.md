# FE AGENT.md

## Scope
- Mọi thay đổi thuộc FE nằm trong `apps/web`.
- Mục tiêu: UI + routing + state + typed API client (OpenAPI).

## File/Folder quan trọng
- Routes: `src/router`
- Pages: `src/views`
- Feature modules: `src/features/<feature>`
- HTTP client: `src/shared/api/http.ts`
- Generated types: `src/shared/api/generated/schema.d.ts`

## Quy ước
- Ưu tiên typed API calls dựa trên `schema.d.ts`.
- Không tự ý thay đổi format response của API; FE phải unwrap theo `@musica/contracts`.
- UI ưu tiên PrimeVue.

## Local skills (bạn điền)
- Dán skill/prompt FE-specific ở đây để AI áp dụng khi làm việc trong FE.
