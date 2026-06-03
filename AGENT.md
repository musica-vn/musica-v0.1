# Musica AI Entry

## Đọc theo thứ tự
1) [.trae/rules/global.md](./.trae/rules/global.md)
2) [.trae/rules/api-contracts.md](./.trae/rules/api-contracts.md)
3) [README.md](./README.md)
4) Theo scope:
   - FE: [apps/web/AGENT.md](./apps/web/AGENT.md)
   - BE: [apps/api/AGENT.md](./apps/api/AGENT.md)

## Project map
- FE: `apps/web`
- BE: `apps/api`
- Shared contracts: `packages/contracts`

## Runtime notes
- File `AGENT.md` là runtime entrypoint chính cho agent.
- File `AGENTS.md` chỉ đóng vai trò handbook hoặc compatibility shim.
- `apps/web/skills` là thư viện tham khảo local; chỉ đọc đúng skill/reference cần cho task hiện tại.
- `.superpowers/` là shared setup của repo, phải được giữ trong version control khi chứa cấu hình dùng chung.

## Quy ước quan trọng
- Không hardcode secrets, không log secrets.
- API response phải theo `@musica/contracts`, bao gồm `statusCode`, `requestId`, `timestamp`.
- List endpoints phải có `meta.pagination`.

## Commands thường dùng
- Dev: `pnpm dev`
- Generate OpenAPI + FE types: `pnpm gen:types`
- Sync schema Supabase: `pnpm db:push`
