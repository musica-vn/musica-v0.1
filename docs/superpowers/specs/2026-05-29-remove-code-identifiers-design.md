# Remove Code Identifiers Design

## Goal

- Bỏ toàn bộ các trường mã nhân tạo như `code`, `product_code`, `compliance_code`, `legacy_code`, `role_code` khỏi database.
- Chuẩn hóa toàn bộ backend chỉ dùng `id` làm định danh nội bộ cho quan hệ dữ liệu, mutation, routing và authorization context.
- Không hiển thị `id` trên UI vì UUID không có ý nghĩa vận hành với người dùng.
- Refactor UI để dùng các thuộc tính có ý nghĩa nghiệp vụ như `name`, `title`, `email`, `status`, `category`, `createdAt`, `updatedAt`.
- Giữ dữ liệu hiện có bằng migration an toàn thay vì reset database.

## Scope

- Áp dụng cho database schema, migration, seed và các SQL helper liên quan đến:
  - `roles`
  - `core_permissions`
  - `digital_right_configs`
  - `physical_right_configs`
  - `expression_configs`
  - `modification_configs`
  - `products`
  - `compliance_reviews`
  - `certificate_templates`
- Áp dụng cho backend DTO, service, auth flow, guard, mapper response và OpenAPI contract liên quan đến các domain trên.
- Áp dụng cho generated API types và các màn hình quản trị FE đang hiển thị hoặc tìm kiếm theo `code`.
- Không đổi response envelope chuẩn của dự án.
- Không thay đổi bản chất các quan hệ bằng foreign key UUID đang tồn tại.

## Current Problems

- Nhiều bảng đang lưu thêm một lớp mã nhân tạo dù hệ thống đã có `id` UUID.
- Nhiều API và UI đang phải mang theo `code` chỉ để hiển thị hoặc filter, làm payload và bảng dữ liệu rối hơn.
- `code` đang len vào auth, role management, permission management và licensing config, khiến logic bị phụ thuộc vào string business key thay vì quan hệ dữ liệu thật.
- Một số migration và seed đang tạo sequence hoặc function chỉ để cấp mã, làm schema phức tạp hơn nhu cầu thực tế.
- Nếu giữ nguyên mô hình hiện tại, mọi module mới sẽ có xu hướng tiếp tục sinh thêm mã không cần thiết.

## Desired Behavior

### Database

- Mỗi bảng chỉ giữ `id` làm định danh nội bộ.
- Xóa các cột mã nhân tạo và toàn bộ `unique constraint`, `index`, `sequence`, `function`, `RPC` chỉ phục vụ sinh hoặc tra cứu theo mã.
- Các quan hệ giữa bảng tiếp tục dùng foreign key UUID như hiện tại.
- Seed phải tạo và liên kết dữ liệu bằng `id` hoặc bằng truy vấn theo trường có ý nghĩa nghiệp vụ thật, không dựa vào mã nhân tạo.

### Backend API

- Mọi DTO request/response bỏ toàn bộ field `code` và các biến thể tương đương.
- Các endpoint list/detail/create/update/delete chỉ làm việc với `id` ở tầng nội bộ.
- Các filter đang dùng `code` chuyển sang filter theo các trường người dùng hiểu được như `name`, `title`, `email`, `description`.
- Response envelope vẫn theo chuẩn `success/statusCode/data/meta/requestId/timestamp`.

### Auth and authorization

- User profile, login response và auth context không còn `roleCode` hoặc `roleCodes`.
- Mapping role của user dựa vào `roleId`.
- Các kiểm tra quyền không so sánh string mã role rải rác trong code.
- Các helper authorization phải đọc từ quan hệ role hoặc permission đã load theo `id`.

### Frontend UI

- Không hiển thị UUID trên table, detail view, select option hoặc form.
- Không hiển thị các cột mã, badge mã, placeholder tìm kiếm theo mã, hoặc chip `code - name`.
- Các bảng quản trị chuyển sang hiển thị những thuộc tính có ý nghĩa vận hành:
  - `name`
  - `title`
  - `email`
  - `status`
  - `category`
  - `type`
  - `createdAt`
  - `updatedAt`
- Dropdown và autocomplete dùng `label` thân thiện thay vì mã nội bộ.

## Domain Changes

### Roles

- Bỏ `roles.code`.
- Các luồng tạo user, gán role, lọc danh sách user/admin chuyển sang dùng `roleId`.
- Nếu cần phân biệt vai trò hệ thống ở backend, dùng metadata ổn định của role hoặc cấu hình authorization tập trung, không so sánh trực tiếp với mã cứng.

### Core permissions

- Bỏ `core_permissions.code` và `legacy_code`.
- Bỏ logic cấp mã tự động.
- Danh sách, form và lookup chỉ còn `name`, `description`, `lawReference`, `status` và metadata quản trị.

### Licensing configs

- Bỏ `code` ở các bảng cấu hình `digital`, `physical`, `expression`, `modification`.
- Bỏ các function/RPC sinh mã như `DIGI`, `PHYS`, `EXPR`, `MOD`.
- Màn quản trị chỉ còn dữ liệu mô tả cấu hình và trạng thái vận hành.

### Products

- Bỏ `product_code`.
- Danh sách sản phẩm dùng `title`, `artist`, `category`, `status`, `createdAt`, `updatedAt`.
- Các liên kết từ màn sản phẩm sang domain khác tiếp tục truyền `productId`.

### Compliance reviews

- Bỏ `code` hoặc `compliance_code`.
- Danh sách hồ sơ pháp lý hiển thị tên track, trạng thái, loại hồ sơ, ngày tạo và ngày cập nhật.

### Certificate templates

- Bỏ `code`.
- Logic lấy template mặc định không còn `.eq('code', 'DEFAULT')`.
- Nếu chỉ có một template hoạt động, resolve theo cờ trạng thái hoặc theo bản ghi đang active.

## Migration Strategy

### Order

- Bước 1: thêm migration cập nhật các function, view, trigger, seed dependency và query backend đang cần `id`.
- Bước 2: cập nhật dữ liệu hiện có nếu bất kỳ luồng nào còn tham chiếu gián tiếp đến mã cũ.
- Bước 3: drop các index, unique constraint, sequence, function hoặc RPC liên quan đến `code`.
- Bước 4: drop các cột `code` và biến thể theo từng bảng.

### Safety rules

- Migration phải chạy được trên database hiện có mà không làm mất dữ liệu bản ghi.
- Mọi thao tác drop nên có điều kiện tồn tại để tránh fail khi chạy lặp.
- Không giả định database trống.
- Seed sau refactor phải tương thích với schema mới.

## API Contract Changes

### Request DTO

- Bỏ các field nhập hoặc cập nhật `code`.
- Các luồng chọn role hoặc relation dùng `id` thay cho mã string.

### Response DTO

- Bỏ `code`, `productCode`, `complianceCode`, `roleCode`, `roleCodes` khỏi payload.
- Giữ lại các field mô tả cần thiết để UI hiển thị.

### Search and filters

- Bỏ các query param và keyword search dựa trên mã.
- Chuyển sang tìm theo trường mô tả hoặc thuộc tính nghiệp vụ có ý nghĩa với người dùng.

## Frontend Refactor Plan

### Generated types

- Regenerate schema/type sau khi backend đổi contract.
- Sửa mọi type alias và mapper đang phụ thuộc `code`.

### Pages impacted

- `Admin List`
- `User Management`
- `Core Permission Settings`
- `Licensing Config Management`
- `Product Management`
- `Compliance Management`
- `Certificate Management`

### UI rules

- Bỏ toàn bộ cột bảng hiển thị mã.
- Bỏ toàn bộ input read-only hoặc auto-generated code trong form.
- Bỏ mọi text hướng dẫn tìm kiếm theo mã.
- Dùng nhãn ngắn gọn và dữ liệu mô tả để giữ UI dễ đọc.

## Error Handling

- Nếu migration phát hiện dependency chưa được cập nhật, phải fail sớm ở môi trường dev thay vì im lặng bỏ qua.
- Nếu API nhận input cũ có `code`, backend phải bỏ support đồng bộ trong cùng lượt refactor để tránh contract nửa cũ nửa mới.
- UI phải hiển thị lỗi rõ ràng nếu dữ liệu sau refactor thiếu field mô tả cần thiết.

## Verification

- Schema database không còn các cột và helper liên quan đến mã nhân tạo ở các domain trong scope.
- Login, current user, admin management và user management vẫn hoạt động bình thường.
- CRUD `core permissions`, `licensing configs`, `products`, `compliance`, `certificate templates` hoạt động mà không cần `code`.
- Generated types FE không còn field `code` thuộc các domain trong scope.
- UI không hiển thị UUID thay thế cho `code`.
- Tất cả list/filter/search chính vẫn dùng được với các trường mô tả thay thế.

## Risks

- `Auth` và `authorization` là vùng rủi ro cao nhất vì đang có khả năng phụ thuộc vào role string ở nhiều điểm.
- Các màn list/filter có thể mất khả năng nhận diện bản ghi nếu không bổ sung trường hiển thị phù hợp.
- Seed và migration dễ sót helper SQL cũ nếu không rà hết các file migration trước đó.

## Non Goals

- Không đổi sang định danh khác ngoài UUID.
- Không thêm lớp mã hiển thị mới để thay thế `code`.
- Không redesign UI ngoài những thay đổi cần thiết để bỏ `code` và giữ trải nghiệm dễ hiểu.
