# Musica AI Entry (Start Here)

## Bạn nên đọc theo thứ tự
1) [AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/AGENT.md)
2) [global.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/global.md)
3) [api-contracts.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/api-contracts.md)
4) [README.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/README.md)
5) Theo scope:
   - FE: [apps/web/AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/AGENT.md)
   - BE: [apps/api/AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/api/AGENT.md)

## Project map
- FE: `apps/web` (Vue 3 + Vite + Pinia + Vue Router + PrimeVue + VueUse + Axios)
- BE: `apps/api` (NestJS + Swagger/OpenAPI)
- Shared: `packages/contracts` (API response/pagination types dùng chung)

## Global skills (Trae)
- Global skills nằm ở: [.trae/ai/skills](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/ai/skills)
- Repo đã có “superpower skills” để dùng chung; chỉ thêm skills riêng theo scope ở `apps/web/AGENT.md` và `apps/api/AGENT.md`.

## Quy ước quan trọng
- Không hardcode secrets, không log secrets.
- API response phải theo `@musica/contracts` (bao gồm `statusCode`, `requestId`, `timestamp`).
- List endpoints phải có `meta.pagination` (offset pagination).

## Commands thường dùng
- Dev: `pnpm dev`
- Generate OpenAPI + FE types: `pnpm gen:types`
- Supabase (BE): `pnpm db:push`
