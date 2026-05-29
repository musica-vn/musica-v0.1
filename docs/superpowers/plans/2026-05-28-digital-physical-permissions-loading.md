# Implementation Plan

1. Bổ sung computed trong `LicensingConfigManagementPage.vue` để xác định:
   - `core permissions` đang tải
   - block `Quyền phụ thuộc` có nên hiển thị loading state
   - nút submit có cần bị khóa trong lúc chờ dữ liệu

2. Cập nhật UI của form `Tạo` và `Cập nhật` cho `digital` và `physical`:
   - thêm loading placeholder/skeleton cho block `Quyền phụ thuộc`
   - tách rõ loading state và empty state
   - khóa thao tác tick chọn trong lúc đang tải

3. Cập nhật nút `Tạo` và `Lưu`:
   - disable khi `isSubmitting`
   - disable khi dialog thuộc `digital/physical` và `core permissions` chưa tải xong

4. Chạy xác minh:
   - `pnpm -C apps/web typecheck`
   - `GetDiagnostics` cho file vừa sửa
   - kiểm tra local flow nếu cần
