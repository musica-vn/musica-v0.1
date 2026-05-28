# Digital & Physical Permissions Loading Design

## Mục tiêu

Tối ưu UX của trường `Quyền phụ thuộc` trong form `Digital rights` và `Physical rights` để tránh trạng thái form mở ra nhưng danh sách quyền chưa xuất hiện vì request `core permissions` vẫn đang tải.

## Phạm vi

- Chỉ áp dụng cho resource `digital` và `physical`.
- Không thay đổi API, payload, route, store contract hay logic backend.
- Không thay đổi behavior của `expression` và `modification`.

## Hành vi mong muốn

- Dialog `Tạo` và `Cập nhật` vẫn được mở ngay.
- Nếu danh sách `core permissions ACTIVE` đang tải:
  - block `Quyền phụ thuộc` hiển thị loading state dạng skeleton/placeholder
  - các item chọn quyền không tương tác được
  - nút `Tạo` và `Lưu` bị disable
- Khi dữ liệu tải xong:
  - loading state biến mất
  - danh sách tick chọn hiển thị ngay mà không cần đóng/mở lại dialog
  - nút submit được bật lại nếu không còn trạng thái submit khác
- Nếu tải xong nhưng không có quyền khả dụng:
  - hiển thị empty state riêng: `Hiện chưa có quyền cốt lõi đang hoạt động để lựa chọn.`

## Trạng thái hiển thị

- `Đang tải quyền phụ thuộc...`: dùng cho loading state.
- `Hiện chưa có quyền cốt lõi đang hoạt động để lựa chọn.`: dùng cho empty state sau khi tải xong.

## Thiết kế kỹ thuật

- Tận dụng `corePermissionsStore.isLoading` và `corePermissionsStore.activeItems`.
- Thêm computed để phân biệt:
  - có phải resource `digital/physical`
  - block quyền phụ thuộc đang loading
  - submit có cần bị khóa vì đang chờ dữ liệu quyền hay không
- Tránh hard-block toàn bộ dialog; chỉ khóa đúng phần liên quan và nút submit.

## Xác minh

- `typecheck` frontend pass
- mở dialog `Digital rights` ngay khi vào trang vẫn thấy loading state thay vì block rỗng
- sau khi dữ liệu về, danh sách quyền xuất hiện tự động
- mở dialog `Physical rights` có cùng behavior
