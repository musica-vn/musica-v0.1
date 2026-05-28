# FE AGENT.md

## Scope
- Mọi thay đổi thuộc FE nằm trong `apps/web`.
- Mục tiêu: Vue 3 + Vite + Pinia + Vue Router theo hướng component rõ ràng, typed API calls và UI admin ổn định.

## Đọc theo thứ tự
1) [apps/web/AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/AGENT.md)
2) [AGENT.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/AGENT.md)
3) [global.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/global.md)
4) [api-contracts.md](file:///c:/Users/LHP02/Desktop/musica-v0.1/.trae/rules/api-contracts.md)

## Runtime guide
- Ưu tiên Composition API với `<script setup lang="ts">`.
- Route/page chỉ đóng vai trò orchestration; tách phần list, form, modal, item row thành components riêng khi feature không còn nhỏ.
- API client FE phải unwrap đúng envelope từ `@musica/contracts`, không tự đổi shape response.
- Khi thêm endpoint mới, ưu tiên đồng bộ từ OpenAPI/generated types trước khi khai báo type thủ công.

## Skill library trong repo
- `apps/web/skills` là thư viện tham khảo local, không mặc định auto-load bởi AI agent runtime.
- Khi làm task Vue, agent phải tự đọc `SKILL.md` hoặc reference phù hợp trong `apps/web/skills`.
- Ưu tiên đọc theo nhu cầu:
  - Vue chung: `apps/web/skills/vue-best-practices/SKILL.md`
  - Router: `apps/web/skills/vue-router-best-practices/SKILL.md`
  - Pinia: `apps/web/skills/vue-pinia-best-practices/SKILL.md`
  - Debug: `apps/web/skills/vue-debug-guides/SKILL.md`
  - Testing: `apps/web/skills/vue-testing-best-practices/SKILL.md`

## File/Folder quan trọng
- Entry: `src/main.ts`
- Router: `src/router`
- Features: `src/features`
- Shared API: `src/shared/api`
- Admin shell: `src/features/admin-shell`

## Verification
- Sau thay đổi đáng kể, chạy tối thiểu:
  - `pnpm --filter web typecheck`
