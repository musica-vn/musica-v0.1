# Digital + Physical Rights Permission Picker Design

## Goal

- Sửa màn `Digital rights` và `Physical rights` để chọn `quyền phụ thuộc` bằng kiểu tick chọn nhiều giá trị.
- Cho phép không chọn quyền nào, chọn một quyền, hoặc chọn nhiều quyền.
- Việt hóa toàn bộ nhãn hiển thị liên quan trên 2 màn này theo đúng đặc tả.
- Giữ nguyên API, route, store, payload và logic backend hiện có.

## Scope

- Chỉ áp dụng cho `digital` và `physical` trong `LicensingConfigManagementPage.vue`.
- Không thay đổi `expression` và `modification` ở lượt này.
- Không thay đổi endpoint backend hoặc structure dữ liệu gửi lên API.

## Current Problems

- Trường chọn quyền phụ thuộc đang dùng `select multiple`, khó đọc và khó thao tác.
- Nhiều nhãn trên UI còn là tiếng Anh hoặc chưa bám sát đặc tả nghiệp vụ.
- Màn dùng chung hiện tại chưa tách rõ wording của `digital` và `physical`.

## Desired Behavior

### Permission picker

- Trường `Referenced permissions` được đổi tên thành `Quyền phụ thuộc`.
- UI chọn quyền hiển thị thành danh sách các item có thể tick chọn.
- Mỗi item quyền hiển thị:
  - mã quyền
  - tên quyền
  - điều luật tham chiếu
- User có thể:
  - không chọn quyền nào
  - chọn 1 quyền
  - chọn nhiều quyền
- Danh sách mặc định lấy từ `core permission` đang `ACTIVE`.
- Nếu đang sửa dữ liệu cũ và có quyền đã liên kết trước đó, các quyền này vẫn phải hiển thị trong form để tránh mất context hiển thị.

### Digital rights

- Tiêu đề màn: `Cấu hình quyền nền tảng số`
- Mô tả màn bám theo nghiệp vụ nền tảng số.
- Các nhãn form/bảng:
  - `Platform` -> `Nền tảng áp dụng`
  - `Duration` -> `Thời hạn áp dụng`
  - `Base multiplier` -> `Hệ số giá cơ sở`
  - `Referenced permissions` -> `Quyền phụ thuộc`
- Giá trị thời hạn hiển thị tiếng Việt:
  - `ONE_YEAR` -> `1 năm`
  - `PERPETUAL` -> `Vĩnh viễn`
- Giá trị nền tảng vẫn dùng enum backend hiện có:
  - `YOUTUBE`
  - `TIKTOK`
  - `FACEBOOK`

### Physical rights

- Tiêu đề màn: `Cấu hình quyền sử dụng vật lý`
- Mô tả màn nhấn mạnh bối cảnh sử dụng ngoài đời thực.
- Các nhãn form/bảng:
  - `Venue / Usage type` -> `Loại hình sử dụng thực tế`
  - `Base multiplier` -> `Hệ số giá cơ sở`
  - `Referenced permissions` -> `Quyền phụ thuộc`

## Data Handling

- `form.referencedPermissionIds` tiếp tục là nguồn dữ liệu duy nhất cho submit.
- Khi tick chọn:
  - nếu quyền chưa có trong mảng thì thêm vào
  - nếu quyền đã có trong mảng thì bỏ ra
- Submit create/edit vẫn gửi `referencedPermissionIds` như hiện tại.

## UI Wording

### Shared

- `Code` -> `Mã cấu hình`
- `Status` -> `Trạng thái`
- `Actions` -> `Thao tác`
- `Keyword` -> `Từ khoá`
- `ACTIVE` -> `Đang hoạt động`
- `INACTIVE` -> `Ngừng hoạt động`

### Digital list

- `Platform / Duration` -> `Nền tảng / Thời hạn`
- `Base multiplier` -> `Hệ số giá cơ sở`
- `Referenced permissions` -> `Quyền phụ thuộc`

### Physical list

- `Venue / Usage type` -> `Loại hình sử dụng thực tế`
- `Base multiplier` -> `Hệ số giá cơ sở`
- `Referenced permissions` -> `Quyền phụ thuộc`

## Implementation Notes

- Giữ page dùng chung, nhưng mở rộng `resourceConfigMap` để chứa wording riêng cho `digital` và `physical`.
- Thay `select multiple` bằng permission picker dạng danh sách tick chọn trong form create/edit.
- Không cần thêm component mới nếu patch trong file hiện tại vẫn rõ ràng; nếu phần render trở nên quá dài, có thể tách component con cho permission picker.

## Error Handling

- Nếu API lỗi khi create/update/delete/toggle status, tiếp tục hiển thị `Message` như hiện tại.
- Nếu danh sách quyền trống, form vẫn cho phép lưu vì `quyền phụ thuộc` là optional.

## Verification

- Form `digital` và `physical` cho phép:
  - không chọn quyền
  - chọn 1 quyền
  - chọn nhiều quyền
- Sau khi lưu, mở lại bản ghi vẫn thấy quyền đã chọn đúng.
- Bảng list và form của `digital`/`physical` hiển thị tiếng Việt đúng theo đặc tả.
- `expression` và `modification` không bị thay đổi hành vi ngoài ý muốn.
