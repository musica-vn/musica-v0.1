# PRD MVP - Nền tảng mua bản quyền âm nhạc

## 1. Tóm tắt sản phẩm

`Musica` là nền tảng bán quyền sử dụng âm nhạc theo mô hình licensing marketplace. Giá trị cốt lõi của hệ thống là cho phép người mua chọn bài hát, mua quyền sử dụng phù hợp, và nhận certificate PDF đóng vai trò chứng từ xác nhận bản quyền đã được cấp phép.

Hệ thống này không phải là nền tảng nghe nhạc giải trí. Mọi quyết định thiết kế trong MVP đều tập trung vào 3 bài toán:

- Quản trị danh mục bài hát có thể cấp quyền
- Mua quyền sử dụng minh bạch, đơn giản
- Sinh và lưu trữ certificate PDF có thể tải lại

## 2. Product Vision

Tạo một hệ thống MVP giúp đội vận hành có thể số hóa việc bán quyền sử dụng âm nhạc, giảm thao tác thủ công trong khâu nhập liệu, quản lý người dùng, phát hành chứng nhận bản quyền, và theo dõi hoạt động kinh doanh.

## 3. Problem Statement

Các đơn vị bán quyền nhạc thường vận hành qua email, file rời và quy trình bán thủ công. Điều này gây ra:

- Khó quản lý danh mục bài hát và trạng thái publish
- Khó chuẩn hóa quyền sử dụng cho từng giao dịch
- Khó truy xuất lại bằng chứng pháp lý sau khi bán
- Khó kiểm soát phân quyền giữa Super Admin, Admin, Artist, Buyer
- Khó mở rộng khi số lượng tracks và certificates tăng

## 4. Product Goals

### 4.1 Goals

- Cho phép Admin ingest bài hát gồm file original và preview
- Cho phép Buyer khám phá catalog published và mua quyền sử dụng
- Tự động sinh certificate PDF sau khi mua thành công
- Cho phép Buyer tải lại certificate trong tài khoản
- Cho phép Super Admin quản lý Admin
- Cho phép Admin quản lý Artist, Buyer, tracks, certificates
- Có dashboard vận hành cơ bản để theo dõi dữ liệu chính

### 4.2 Non-goals

- Không xây social/community features
- Không xây streaming app cho người nghe đại chúng
- Không tích hợp payment gateway thật trong MVP
- Không cho Artist self-service upload hay quản trị nội dung
- Không xử lý marketplace revenue sharing phức tạp
- Không xử lý legal workflow nâng cao như revoke, dispute, royalty settlement

## 5. Target Users

### 5.1 Super Admin

- Quản trị cấp hệ thống
- Quản lý danh sách Admin
- Xem dashboard tổng quan toàn hệ thống

### 5.2 Admin

- Tạo và quản lý tracks
- Upload original audio và preview audio
- Khai báo usage rights
- Publish/unpublish nội dung
- Quản lý Artist, Buyer
- Xem và tra cứu certificates

### 5.3 Artist

- Là chủ sở hữu hoặc đại diện quyền của tác phẩm trong dữ liệu
- Không có portal self-service trong MVP
- Thông tin Artist được Admin quản lý

### 5.4 Buyer

- Đăng nhập để xem catalog
- Lọc bài hát theo tiêu chí cơ bản
- Chọn quyền sử dụng
- Mua quyền theo mock checkout
- Tải certificate PDF và xem lịch sử mua

## 6. Success Metrics

- 100% giao dịch mua thành công sinh ra đúng 1 certificate PDF
- 100% certificate có thể tải lại từ lịch sử buyer
- Thời gian từ lúc Admin upload track đến lúc publish dưới 5 phút
- Buyer hoàn thành flow mua trong dưới 3 phút với mock checkout
- 0 trường hợp certificate bị chỉnh sửa sau khi phát hành

## 7. MVP Scope

## 7.1 In Scope

- RBAC với 4 roles: `SUPER_ADMIN`, `ADMIN`, `ARTIST`, `BUYER`
- User management cơ bản
- Track ingestion
- Public catalog cho nội dung published
- Mock checkout
- Certificate PDF generation
- Certificate listing/search cơ bản
- Dashboard vận hành cơ bản
- Swagger-first API documentation
- Supabase DB + Storage

## 7.2 Out of Scope

- Payment online thật
- Hợp đồng điện tử nâng cao
- Self-service portal cho Artist
- Mobile app
- Recommendation engine
- Audio waveform editor
- Subscription plans

## 8. Core Business Flows

### 8.1 Ingestion

1. Admin tạo track mới
2. Admin nhập metadata: title, artist, genre, duration, usage rights
3. Admin upload original file và preview file
4. Hệ thống lưu metadata vào DB, file vào Storage
5. Admin chuyển trạng thái sang `PUBLISHED`
6. Track xuất hiện ở catalog buyer

### 8.2 Discovery & Purchase

1. Buyer đăng nhập
2. Buyer xem catalog published
3. Buyer xem chi tiết track và các quyền sử dụng khả dụng
4. Buyer chọn quyền sử dụng cần mua
5. Buyer xác nhận mock checkout
6. Hệ thống tạo certificate, snapshot dữ liệu tại thời điểm mua, sinh PDF
7. Buyer tải certificate từ lịch sử mua

### 8.3 Operations

1. Super Admin tạo/quản lý Admin
2. Admin quản lý Artist và Buyer
3. Admin tra cứu certificates theo buyer, track, trạng thái
4. Admin theo dõi dashboard tổng quan

## 9. Functional Requirements

### 9.1 IAM & RBAC

- Người dùng đăng nhập bằng email/password
- Mỗi user có thể có một hoặc nhiều roles qua bảng `user_roles`
- Super Admin có toàn quyền hệ thống
- Admin quản lý domain vận hành
- Buyer chỉ truy cập dữ liệu của chính mình
- Artist không có giao diện đăng nhập vận hành trong MVP

### 9.2 Catalog & Track Management

- Track có metadata tối thiểu: title, artist, genre, duration, status
- Track có `usage_rights`
- Chỉ track `PUBLISHED` mới xuất hiện ở catalog
- Original audio và preview audio lưu riêng
- Admin có thể ẩn/publish track

### 9.3 Purchase & Certificate

- Buyer phải đăng nhập mới được mua
- Mock checkout trả kết quả thành công để validate flow
- Hệ thống snapshot tên track, buyer và quyền tại thời điểm mua
- Mỗi giao dịch mua thành công sinh đúng 1 certificate
- Certificate được tạo PDF và lưu key vào Storage
- Certificate immutable sau khi phát hành

### 9.4 Certificate Retrieval

- Buyer xem danh sách certificate của mình
- Buyer tải lại PDF certificate
- Admin có thể xem danh sách certificate toàn hệ thống

### 9.5 Dashboard

- Tổng số tracks
- Số tracks published
- Tổng số buyers
- Tổng số certificates
- Top genre cơ bản
- Số certificate phát hành theo khoảng thời gian

## 10. Business Rules

- Chỉ `PUBLISHED` tracks mới được mua
- Chỉ Admin mới ingest tracks
- Buyer không thể sửa certificate
- Certificate chỉ được sinh sau khi checkout thành công
- Certificate phải chứa snapshot dữ liệu để không phụ thuộc chỉnh sửa về sau
- Track original file không public trực tiếp cho buyer
- Preview file có thể public có kiểm soát
- Super Admin quản lý Admin, không đi sâu vận hành từng track hàng ngày

## 11. UX Requirements

### 11.1 Buyer UI

- Catalog page
- Track detail page
- Mock checkout page/modal
- Purchase history
- Certificate detail/download

### 11.2 Admin UI

- Login
- Dashboard
- User management
- Track management
- Certificate management

### 11.3 Super Admin UI

- Admin list
- Admin create/edit/lock
- Global overview dashboard

## 12. Non-functional Requirements

- FE dùng Vue 3 + Vite, deploy Netlify
- BE dùng NestJS + Swagger/OpenAPI, deploy Render
- DB và Storage dùng Supabase
- API response phải theo `@musica/contracts`
- List APIs phải trả pagination meta chuẩn
- Tách module theo hướng modular monolith
- Có khả năng generate OpenAPI để FE sinh types
- Có audit-friendly structure cho certificates

## 13. Solution Architecture

### 13.1 Frontend

- Framework: Vue 3 + Vite + TypeScript
- Routing: `vue-router`
- State management: Pinia
- API: Axios client + generated types từ OpenAPI
- Deploy: Netlify

### 13.2 Backend

- Framework: NestJS
- API docs: Swagger `/docs`
- API shape: envelope chuẩn trong `packages/contracts`
- Deploy: Render

### 13.3 Database & Storage

- Supabase Postgres cho dữ liệu nghiệp vụ
- Supabase Storage cho:
  - original audio
  - preview audio
  - certificate PDF

### 13.4 Codebase Mapping

- FE module domain nên đi trong `apps/web/src/features/*`
- BE module domain nên đi trong `apps/api/src/*`
- Shared contracts giữ ở `packages/contracts`
- OpenAPI JSON được BE generate và FE consume để sync types

## 14. MVP Feature Modules

### 14.1 IAM & RBAC

- Auth login
- Role-based guards
- User status control: `ACTIVE`, `LOCKED`, `DELETED`

### 14.2 Catalog & Ingestion

- Track CRUD cơ bản
- Publish control
- Upload original/preview
- Usage rights definition

### 14.3 Licensing Purchase & Certificate

- Catalog browsing
- Track detail
- Mock checkout
- Certificate generation
- Certificate history

### 14.4 Operations Dashboard

- User counts
- Track counts
- Certificate counts
- Search/filter cơ bản

## 15. Risks

- Nếu không snapshot usage rights vào certificate, dữ liệu pháp lý có thể sai lệch sau này
- Nếu preview/original không tách bucket hoặc access policy, có thể lộ file gốc
- Nếu role mapping không rõ giữa Artist và Buyer, luồng quản trị dễ lẫn trách nhiệm
- Nếu dùng mock checkout nhưng không tách abstraction, sau này khó thay bằng payment gateway thật

## 16. Release Strategy

### Phase MVP

- Hoàn thiện auth + roles
- Hoàn thiện track ingestion
- Hoàn thiện catalog buyer
- Hoàn thiện mock purchase + certificate PDF
- Hoàn thiện dashboard cơ bản

### Phase sau MVP

- Payment gateway thật
- Artist portal
- Revenue reporting
- Certificate expiry/revoke policy

## 17. Acceptance Criteria tổng thể

- Super Admin tạo được Admin
- Admin tạo được Artist, Buyer, Track
- Admin upload được original và preview cho track
- Admin publish được track
- Buyer đăng nhập và nhìn thấy catalog published
- Buyer mua thành công bằng mock checkout
- Hệ thống sinh certificate PDF đúng dữ liệu snapshot
- Buyer tải lại certificate từ lịch sử
- Admin tra cứu được certificates
- Swagger mô tả được tối thiểu các APIs của MVP
