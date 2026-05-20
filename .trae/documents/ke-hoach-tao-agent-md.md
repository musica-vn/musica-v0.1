# Kế hoạch: Tạo AGENT.md (root + FE + BE) để định hướng AI

## 1) Tóm tắt
- Tạo `AGENT.md` ở **root** để AI hiểu tổng quan dự án ngay khi vào repo và biết “phải đọc gì trước”.
- Tạo `AGENT.md` riêng cho **FE** và **BE** để nạp conventions/skills theo scope.
- Đưa **global rules/skills** của Trae vào `.trae/` (đã có) và thêm điều hướng từ root sang các file này.
- Giữ lại các file `AI.md` hiện có như “alias” (chỉ chứa link) hoặc thay thế bằng `AGENT.md` để tránh duplicate nội dung.

## 2) Hiện trạng (đã kiểm tra trong repo)
- Global Trae rules đang nằm tại:
  - `.trae/rules/global.md`
  - `.trae/rules/api-contracts.md`
- Global Trae skills (bao gồm “superpower skills”) đang nằm tại:
  - `.trae/ai/skills/` (đã có nhiều thư mục skills)
- Theo module hiện có:
  - FE notes: `apps/web/AI.md`
  - BE notes: `apps/api/AI.md`
- Root README có điều hướng tới `.trae/*` và `apps/*/AI.md` nhưng chưa có `AGENT.md`.

## 3) Đề xuất thay đổi (decision-complete)

### 3.1 Tạo file root `AGENT.md`
**File mới**
- `AGENT.md`

**Nội dung đề xuất**
- **Start here**: hướng dẫn AI đọc theo thứ tự:
  1) `AGENT.md` (root)
  2) `.trae/rules/global.md`
  3) `.trae/rules/api-contracts.md`
  4) `README.md`
  5) `apps/web/AGENT.md` hoặc `apps/api/AGENT.md` theo task
- **Project map**: mô tả nhanh `apps/web`, `apps/api`, `packages/contracts`.
- **Global skills**: chỉ dẫn tới `.trae/ai/skills` (user đã đưa superpower skills vào đây).
- **How to work**: conventions quan trọng (không hardcode secrets, response contracts, pagination).
- **Common commands**: link/nhắc các commands quan trọng (`pnpm dev`, `pnpm gen:types`, `pnpm db:push`…).

### 3.2 Tạo `apps/web/AGENT.md` (FE scope)
**File mới**
- `apps/web/AGENT.md`

**Nội dung đề xuất**
- Stack FE + conventions:
  - Router ở `src/router`, views ở `src/views`, features ở `src/features/*`.
  - Typed API dựa trên `src/shared/api/generated/schema.d.ts`.
  - Axios wrapper ở `src/shared/api/http.ts`.
- “Do/Don’t” khi sửa FE (không đổi API envelope, ưu tiên typed calls, UI PrimeVue).
- Optional section “Local skills” (chỗ để user dán prompt/skill riêng cho FE).

### 3.3 Tạo `apps/api/AGENT.md` (BE scope)
**File mới**
- `apps/api/AGENT.md`

**Nội dung đề xuất**
- Stack BE + conventions:
  - NestJS + Swagger/OpenAPI.
  - Response/error chuẩn theo `@musica/contracts`.
  - Pagination DTO: `src/common/pagination.dto.ts`.
- Supabase scope:
  - Config nằm ở `apps/api/supabase`.
  - Wrapper CLI: `apps/api/scripts/supabase.mjs`.
- Optional section “Local skills” (chỗ để user dán prompt/skill riêng cho BE).

### 3.4 Giữ `AI.md` như alias (để không phá link cũ)
**Files cập nhật**
- `apps/web/AI.md` đổi thành file ngắn chỉ link tới `apps/web/AGENT.md`
- `apps/api/AI.md` đổi thành file ngắn chỉ link tới `apps/api/AGENT.md`

### 3.5 Cập nhật điều hướng từ root
**Files cập nhật**
- `README.md`:
  - Thêm section “AGENT docs” trỏ tới:
    - `AGENT.md` (root)
    - `apps/web/AGENT.md`
    - `apps/api/AGENT.md`
  - Sửa link cũ (AI notes) để trỏ sang AGENT (hoặc giữ cả 2).

## 4) Assumptions & Decisions
- Quy ước “AGENT.md” là entrypoint chính cho AI ở từng scope.
- Giữ `AI.md` làm alias để giảm rủi ro broken links/đội ngũ quen file cũ.
- Không thay đổi logic code/app, chỉ thêm tài liệu định hướng AI.

## 5) Verification
- Mở `AGENT.md` root: đảm bảo có link tới `.trae/rules/*`, `.trae/ai/skills/*`, `apps/web/AGENT.md`, `apps/api/AGENT.md`.
- Mở `apps/web/AI.md` và `apps/api/AI.md`: đảm bảo nội dung chỉ điều hướng sang `AGENT.md`.
- Mở `README.md`: đảm bảo điều hướng rõ ràng tới bộ AGENT docs và không còn link chết.
