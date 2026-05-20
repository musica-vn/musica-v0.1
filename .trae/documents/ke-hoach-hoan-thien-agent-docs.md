# Kế hoạch: Hoàn thiện bộ AGENT docs (root + FE + BE) + sửa điều hướng

## 1) Tóm tắt mục tiêu
- Đảm bảo AI khi vừa vào repo có 1 entrypoint rõ ràng để đọc đúng thứ tự và biết cần nạp **global skills** ở đâu.
- Điều hướng từ root sang `apps/web/AGENT.md` (FE) và `apps/api/AGENT.md` (BE) để user có thể dán **local skills** theo scope.
- Loại bỏ link chết và giữ tương thích ngược với các link `AI.md` cũ.

## 2) Hiện trạng (đã kiểm tra trong repo)
- Đã có các file:
  - Root: `AGENT.md`
  - FE: `apps/web/AGENT.md`
  - BE: `apps/api/AGENT.md`
  - FE alias: `apps/web/AI.md` (đã trỏ sang `apps/web/AGENT.md`)
- Chưa hoàn tất:
  - `apps/api/AI.md` hiện vẫn là nội dung riêng, chưa là alias.
  - `README.md` (root) chưa có section “AGENT docs” và vẫn đang điều hướng theo `AI.md`.
- Link chết:
  - Root `AGENT.md` và root `README.md` đang link tới `.trae/rules/api-contracts.md` nhưng file này hiện **chưa tồn tại** trong `.trae/rules/`.

## 3) Thay đổi đề xuất (decision-complete)

### 3.1 Tạo `.trae/rules/api-contracts.md` để tránh link chết và làm chuẩn API (global)
**File thêm mới**
- `.trae/rules/api-contracts.md`

**Nội dung**
- Chuẩn API envelope (success/error) dựa trên `@musica/contracts`:
  - Fields bắt buộc: `success`, `statusCode`, `requestId`, `timestamp`
  - Error shape: `error.code`, `error.message`, `error.details?`
- Chuẩn list pagination meta:
  - `meta.pagination.page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, `hasPrevPage`
- Quy ước request id:
  - Header `x-request-id` được accept; nếu thiếu thì server tự generate; tất cả responses phải trả `requestId`.
- Quy ước FE:
  - FE chỉ unwrap theo envelope, không tự ý “đổi format” (để tránh lệch contracts).

### 3.2 Đổi `apps/api/AI.md` thành alias để đồng nhất với FE và tránh duplicate
**File cập nhật**
- `apps/api/AI.md`

**Cách sửa**
- Thay toàn bộ nội dung thành file ngắn chỉ điều hướng:
  - “File này chỉ dùng để tương thích với link cũ.”
  - Link tới `apps/api/AGENT.md` theo format `file:///...` giống FE.

### 3.3 Cập nhật root `README.md` thêm section “AGENT docs” và điều hướng đúng
**File cập nhật**
- `README.md` (root)

**Cách sửa**
- Trong “Điều hướng tài liệu”:
  - Thêm section “AGENT docs” trỏ tới:
    - `AGENT.md` (root)
    - `apps/web/AGENT.md`
    - `apps/api/AGENT.md`
- Trong “Theo module”:
  - Giữ link `AI.md` (vì tương thích ngược) nhưng thêm một dòng ghi rõ `AI.md` là alias trỏ tới `AGENT.md`.
- Nếu có nhắc tới `.trae/rules/api-contracts.md` thì giữ nguyên (vì bước 3.1 sẽ tạo file đó).

### 3.4 (Tuỳ chọn, an toàn) Đồng bộ wording trong root `AGENT.md`
**File cân nhắc cập nhật**
- `AGENT.md` (root)

**Cách sửa (nếu cần)**
- Không đổi cấu trúc, chỉ đảm bảo:
  - Link `.trae/rules/api-contracts.md` trỏ đúng (sau khi tạo file).
  - Câu chữ nhấn mạnh: global skills ở `.trae/ai/skills`, local skills dán ở `apps/*/AGENT.md`.

## 4) Assumptions & Decisions
- `AGENT.md` là entrypoint chính cho AI ở từng scope.
- `AI.md` được giữ lại như alias để không phá link cũ.
- Global rules/skills nằm trong `.trae/` và luôn được ưu tiên đọc trước local scope docs.

## 5) Verification (sau khi implement)
- Mở và click link trong:
  - Root `AGENT.md`: đảm bảo link tới `.trae/rules/global.md`, `.trae/rules/api-contracts.md`, `.trae/ai/skills`, `apps/web/AGENT.md`, `apps/api/AGENT.md` đều hợp lệ.
  - Root `README.md`: có “AGENT docs” và không còn link chết.
  - `apps/web/AI.md` và `apps/api/AI.md`: đều là alias trỏ đúng sang `AGENT.md` tương ứng.
