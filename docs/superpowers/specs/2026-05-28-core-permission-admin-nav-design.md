# Core Permission Confirm + Admin Nav Vietnamese Design

## Goal

- Thêm bước xác nhận trước khi xóa `core permission`.
- Bỏ thao tác đổi trạng thái trực tiếp ở bảng danh sách `core permission`.
- Đưa thao tác đổi trạng thái vào trong form sửa `core permission`.
- Khi đổi trạng thái trong form sửa, luôn hiển thị `confirm` trước khi gọi API.
- Việt hóa toàn bộ nhãn điều hướng admin và tiêu đề trang liên quan.

## Scope

- Chỉ áp dụng cho màn `Core Permission Settings`.
- Chỉ áp dụng cho `sidebar`, `page title`, và các nhãn trực tiếp liên quan trong admin layout / router.
- Không thay đổi API contract backend.
- Không thay đổi route path hiện có.
- Không sửa `digital rights`, `physical rights`, `expression`, `modification` trong lượt này.

## Current Problems

- Nút xóa `core permission` đang gọi hành động trực tiếp, không có xác nhận.
- Nút đổi trạng thái đang nằm ở bảng danh sách, dễ thao tác nhầm.
- Nhãn ở `navbar` và `page title` còn lẫn tiếng Anh.

## Desired Behavior

### Core permission list

- Mỗi dòng chỉ còn thao tác:
  - `Sửa`
  - `Xóa`
- Khi bấm `Xóa`, hệ thống mở `ConfirmDialog`.
- Nội dung confirm phải nói rõ tên hoặc mã quyền đang bị xóa.
- Nếu user từ chối, không gọi API.

### Core permission edit form

- Form sửa hiển thị:
  - mã quyền
  - tên quyền
  - điều luật tham chiếu
  - mô tả
  - trạng thái hiện tại
- Trong footer hoặc khu vực hành động của form sửa có thêm nút:
  - `Chuyển sang hoạt động` khi trạng thái hiện tại là `INACTIVE`
  - `Chuyển sang ngừng hoạt động` khi trạng thái hiện tại là `ACTIVE`
- Khi bấm nút đổi trạng thái:
  - mở `ConfirmDialog`
  - nếu user xác nhận mới gọi API đổi trạng thái
  - sau khi thành công thì refresh danh sách và đóng form sửa

## UI Wording

### Sidebar labels

- `Dashboard` -> `Bảng điều khiển`
- `Admin list` -> `Quản trị viên`
- `Core permissions` -> `Quyền cốt lõi`
- `Digital rights` -> `Quyền nền tảng số`
- `Physical rights` -> `Quyền sử dụng vật lý`
- `Expression configs` -> `Hình thức biểu hiện`
- `Modification configs` -> `Mức độ biến đổi`

### Page titles

- `Dashboard` -> `Bảng điều khiển`
- `Admin List` -> `Quản trị viên`
- `Core permissions` -> `Quyền cốt lõi`
- `Digital Rights` -> `Quyền nền tảng số`
- `Physical Rights` -> `Quyền sử dụng vật lý`
- `Expression Configs` -> `Hình thức biểu hiện`
- `Modification Configs` -> `Mức độ biến đổi`
- `User Management · Buyers` -> `Quản lý người mua`
- `User Management · Artists` -> `Quản lý nghệ sĩ`

## Implementation Notes

### Confirm pattern

- Tái sử dụng `PrimeVue ConfirmDialog` đã mount ở `App.vue`.
- Dùng `useConfirm()` trong màn `CorePermissionSettingsPage.vue`.
- Không tạo dialog xác nhận thủ công mới.

### Core permission page

- Xóa function toggle trạng thái trực tiếp từ action table.
- Bổ sung helper confirm cho:
  - xóa quyền
  - đổi trạng thái
- Bổ sung nhãn tiếng Việt cho:
  - tiêu đề màn
  - cột bảng
  - nhãn form
  - nội dung trạng thái

### Router + admin layout

- Chỉ sửa text hiển thị:
  - `AdminLayout.vue`
  - `router/index.ts`
- Không đổi `to`, `path`, quyền truy cập, hoặc logic điều hướng.

## Error Handling

- Nếu API trả lỗi khi xóa hoặc đổi trạng thái:
  - giữ dialog form hiện tại
  - hiển thị `Message` lỗi như hiện có
- Nếu confirm bị hủy:
  - không thay đổi state nào

## Verification

- Bảng `core permission` không còn nút đổi trạng thái riêng.
- Bấm `Xóa` luôn hiện confirm.
- Bấm đổi trạng thái trong form sửa luôn hiện confirm.
- Sau khi xác nhận thành công:
  - dữ liệu được cập nhật
  - danh sách được refresh
  - thông báo thành công hiển thị đúng
- Sidebar admin hiển thị tiếng Việt đồng nhất.
- Header title theo route hiển thị tiếng Việt đồng nhất.
