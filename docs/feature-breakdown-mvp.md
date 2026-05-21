# Feature Breakdown MVP

## 1. Nguyên tắc chia feature

MVP được chia theo 4 feature groups bám theo nghiệp vụ cốt lõi và phù hợp với mô hình modular monolith của codebase hiện tại:

- IAM & RBAC
- Catalog & Ingestion
- Licensing Purchase & Certificate
- Operations Dashboard & Administration

Mỗi feature group bên dưới ghi rõ mục tiêu, phạm vi, business rules và Definition of Done.

## 2. IAM & RBAC

### 2.1 Mục tiêu

Thiết lập lớp định danh và phân quyền tối thiểu để hệ thống vận hành an toàn với 4 roles: `SUPER_ADMIN`, `ADMIN`, `ARTIST`, `BUYER`.

### 2.2 Actors

- Super Admin
- Admin
- Buyer
- Artist (chỉ hiện diện trong dữ liệu, chưa có portal riêng)

### 2.3 Phạm vi

#### FE

- Login page
- Redirect theo role
- Route protection
- Basic profile page

#### BE

- Login endpoint
- Auth guard
- Role guard
- User management endpoints

#### DB

- `users`
- `roles`
- `user_roles`

### 2.4 Business Rules

- Email là unique
- `status` của user gồm `ACTIVE`, `LOCKED`, `DELETED`
- Buyer chỉ thấy dữ liệu của chính mình
- Super Admin quản lý danh sách Admin
- Admin quản lý Artist và Buyer
- Artist không có self-service actions trong MVP

### 2.5 Definition of Done

- Đăng nhập bằng email/password hoạt động ổn định
- FE chặn route theo role
- BE chặn API theo role
- Super Admin tạo/khóa Admin được
- Admin tạo/khóa Buyer và Artist được
- User bị `LOCKED` không đăng nhập được
- Swagger có mô tả auth và roles ở mức endpoint

## 3. Catalog & Ingestion

### 3.1 Mục tiêu

Cho phép Admin ingest bài hát, quản lý metadata, upload audio assets và publish để Buyer có thể khám phá.

### 3.2 Actors

- Admin
- Buyer

### 3.3 Phạm vi

#### FE

- Track list cho Admin
- Track create/edit form
- Upload original/preview
- Publish toggle
- Public/buyer catalog page

#### BE

- Track CRUD cơ bản
- Upload URL hoặc upload handling
- Publish/unpublish logic
- Filter published catalog

#### DB

- `tracks`
- strategy lưu `usage_rights`

#### Storage

- Bucket audio gốc
- Bucket preview audio

### 3.4 Business Rules

- Track mặc định `HIDDEN`
- Chỉ Admin được tạo/sửa/publish track
- Track phải có original file và preview file trước khi publish
- `usage_rights` phải chọn từ danh sách quyền hợp lệ
- Chỉ track `PUBLISHED` mới hiện ở catalog buyer

### 3.5 Definition of Done

- Admin tạo track mới với metadata tối thiểu được
- Admin upload original và preview thành công
- Admin set usage rights được
- Admin publish/unpublish track được
- Buyer chỉ nhìn thấy track `PUBLISHED`
- API list catalog có pagination meta chuẩn
- Preview file có thể phát/tải theo policy đã định, original file không public trực tiếp

## 4. Licensing Purchase & Certificate

### 4.1 Mục tiêu

Biến catalog thành luồng mua quyền có đầu ra pháp lý rõ ràng là certificate PDF.

### 4.2 Actors

- Buyer
- Admin

### 4.3 Phạm vi

#### FE

- Track detail
- Chọn usage right
- Mock checkout
- Purchase history
- Certificate detail/download

#### BE

- Checkout endpoint
- Certificate generation orchestration
- Certificate history
- Certificate download metadata

#### DB

- `certificates`
- snapshot data cho track/buyer/right tại thời điểm mua

#### Storage

- Bucket certificate PDF

### 4.4 Business Rules

- Buyer phải đăng nhập mới được mua
- Mock checkout luôn đi qua validation dữ liệu thật
- Mỗi lần mua thành công sinh 1 certificate immutable
- Certificate lưu snapshot tên bài hát, buyer, quyền đã mua
- Buyer có thể tải lại certificate
- Admin chỉ được xem/tra cứu, không sửa nội dung certificate

### 4.5 Definition of Done

- Buyer xem được chi tiết track và usage rights
- Buyer chọn quyền và hoàn tất mock checkout
- Hệ thống sinh certificate record và PDF file
- Buyer thấy certificate trong lịch sử mua
- Buyer tải lại PDF thành công
- Admin tra cứu certificate theo buyer hoặc track được
- Không có API chỉnh sửa certificate sau phát hành

## 5. Operations Dashboard & Administration

### 5.1 Mục tiêu

Cho phép đội vận hành theo dõi dữ liệu chính và xử lý các đối tượng quản trị hằng ngày.

### 5.2 Actors

- Super Admin
- Admin

### 5.3 Phạm vi

#### FE

- Dashboard cards
- Admin management page cho Super Admin
- User management page cho Admin
- Certificate management page

#### BE

- Dashboard summary endpoints
- User management endpoints
- Certificate listing/search endpoints

#### DB

- aggregate query từ `users`, `tracks`, `certificates`

### 5.4 Business Rules

- Super Admin là role duy nhất quản lý Admin list
- Admin quản lý Artist và Buyer
- Dashboard ưu tiên số liệu vận hành đơn giản, không đi sâu BI
- Certificate search phải hỗ trợ ít nhất track title, buyer name/email, date range

### 5.5 Definition of Done

- Super Admin list/create/lock Admin được
- Admin list/create/lock Buyer và Artist được
- Dashboard hiển thị các metric tối thiểu
- Admin tra cứu certificates được theo filter cơ bản
- Không role nào ngoài quyền được truy cập màn hình quản trị tương ứng

## 6. Ưu tiên triển khai

### P0

- IAM & RBAC
- Catalog & Ingestion
- Licensing Purchase & Certificate

### P1

- Operations Dashboard & Administration

## 7. Phụ thuộc liên feature

- IAM & RBAC là tiền đề cho toàn bộ hệ thống
- Catalog & Ingestion phải xong trước để có dữ liệu bán
- Purchase & Certificate phụ thuộc published tracks và auth buyer
- Dashboard phụ thuộc dữ liệu phát sinh từ các feature còn lại
