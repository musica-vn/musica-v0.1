# Technical Spec: product detail và quản lý nền tảng số

## Tài liệu liên quan

- [Implementation plan](./2026-06-11-product-detail-platform-management-plan.md)
- [Task breakdown](./2026-06-11-product-detail-platform-management-task-breakdown.md)

## Mục tiêu kỹ thuật

Tài liệu này đặc tả kỹ thuật chi tiết cho thay đổi `products` theo hướng:

- tách `list page` và `detail page`
- chuyển toàn bộ thao tác sâu sang `product detail page`
- bổ sung `platform settings` ở cấp sản phẩm
- chỉ hỗ trợ `YouTube` ở giai đoạn đầu
- tái sử dụng `digital_right_configs` để quản lý thời gian thuê thông qua `duration_type`

## Phạm vi kỹ thuật

Bao gồm:

- route mới cho `product detail`
- cấu trúc component frontend mới
- API mới cho `platform settings`
- schema mới cho `product-level pricing override`
- logic fallback từ `product override` về `global config`
- cơ chế migration/backfill

Không bao gồm:

- tạo nền tảng mới từ UI
- thay đổi logic compliance lõi
- thay đổi logic `allowed permissions`
- thay đổi domain `physical rights`
- thay đổi certificate orchestration

## Kiến trúc tổng thể

### Frontend

Current-state:

- `ProductManagementView.vue` đang gánh đồng thời list, detail dialog, upload, licensing actions.

Target-state:

- `ProductListView.vue` chỉ lo:
  - table/card list
  - search/filter/sort/pagination
  - create product
  - navigate sang detail
- `ProductDetailView.vue` lo toàn bộ tác vụ chi tiết
- Mỗi section detail là 1 component độc lập

### Backend

Current-state:

- `ProductsModule` đã có read/update product, allowed permissions, upload URLs, publish/hide
- chưa có API cho `product-specific platform settings`

Target-state:

- mở rộng `ProductsModule`
- thêm read/write API cho `platform settings`
- thêm service logic resolve effective multiplier

### Database

Current-state:

- có `products`
- có `digital_right_configs`
- chưa có bảng override theo sản phẩm

Target-state:

- thêm bảng `product_digital_platform_settings`

## Routing Spec

### Route map mới

- `/admin/products`
- `/admin/products/:productId`
- `/admin/products/:productId/general`
- `/admin/products/:productId/rights-license`
- `/admin/products/:productId/platforms`

### Navigation rules

- `/admin/products/:productId` redirect về `/general`
- active menu lấy theo route segment
- khi đi từ list sang detail phải carry query state:
  - `page`
  - `pageSize`
  - `keyword`
  - `sort`
  - `status`
  - `genre`

### UI behavior

- `ProductListView` không còn open detail dialog
- click row/card hoặc action `Xem chi tiết` sẽ route sang detail page
- detail page có breadcrumb và CTA quay lại danh sách

## Frontend Component Spec

### 1. `ProductListView.vue`

Trách nhiệm:

- load danh sách sản phẩm
- filter/sort/pagination
- create product
- điều hướng sang detail

Không còn trách nhiệm:

- render detail dialog
- render licensing detail tabs trong dialog
- chỉnh sửa platform settings

### 2. `ProductDetailView.vue`

Trách nhiệm:

- load product theo `productId`
- load sidebar items
- điều hướng giữa các section
- quản lý shared feedback state:
  - `isLoading`
  - `isSaving`
  - `errorMessage`
  - `successMessage`

Đề xuất state:

- `product`
- `productPlatformSettings`
- `activeSection`
- `backLinkQuery`

### 3. `ProductDetailSidebar.vue`

Mục:

- `Thông tin chung`
- `Quyền và License`
- `Quản lý nền tảng số`

Yêu cầu:

- responsive
- hỗ trợ active state rõ ràng
- mobile có thể fallback thành tabs/dropdown

### 4. `ProductGeneralSection.vue`

Bao gồm:

- metadata form
- artist/genre/use case
- thumbnail/audio/sheet music
- publish/hide controls

Rule:

- không đổi business logic backend
- chỉ đổi vị trí trình bày và UX

### 5. `ProductRightsLicenseSection.vue`

Bao gồm:

- compliance summary
- compliance status
- approved permissions
- allowed permissions
- licensing eligibility
- join/remove package

Rule:

- giữ nguyên flow hiện có
- nếu cần xem chi tiết hồ sơ pháp lý thì deep-link sang compliance

### 6. `ProductPlatformsSection.vue`

Bao gồm:

- dropdown chọn nền tảng
- hiển thị `YouTube`
- bảng duration rows
- input `price multiplier`
- save/cancel/reset state

Rule:

- không có nút add/delete platform
- chỉ cho sửa các rows hệ thống đã chuẩn bị sẵn

### 7. `ProductPlatformDurationTable.vue`

Mỗi row đại diện cho 1 `digital_right_config`

Field tối thiểu:

- `durationType`
- `configCode` hoặc label business
- `globalBaseMultiplier`
- `productOverrideMultiplier`
- `effectiveMultiplier`
- `save status`

## API Spec

## 1. Read product detail

Giữ endpoint hiện có:

- `GET /admin/products/:productId`

Có thể mở rộng trả thêm summary tối thiểu cho platform, nhưng không bắt buộc.

## 2. Read platform settings

Đề xuất endpoint:

- `GET /admin/products/:productId/platform-settings`

Response envelope `success`:

```ts
type ProductPlatformSettingsResponse = {
  productId: string
  supportedPlatforms: Array<{
    platformKey: 'YOUTUBE'
    platformLabel: string
    durationRows: Array<{
      digitalRightConfigId: string
      configCode: string
      durationType: 'ONE_YEAR' | 'PERPETUAL'
      globalBaseMultiplier: number
      overrideMultiplier: number
      effectiveMultiplier: number
      isEditable: boolean
    }>
  }>
}
```

## 3. Update platform settings

Đề xuất endpoint:

- `PUT /admin/products/:productId/platform-settings`

Request:

```ts
type UpdateProductPlatformSettingsRequest = {
  platformKey: 'YOUTUBE'
  rows: Array<{
    digitalRightConfigId: string
    overrideMultiplier: number
  }>
}
```

Response:

- trả về object cùng shape với `GET platform-settings`

## 4. Validation rules

- `productId` phải tồn tại
- `digitalRightConfigId` phải tồn tại
- config phải `ACTIVE`
- config phải thuộc platform được hỗ trợ
- `overrideMultiplier` phải là số hữu hạn và `> 0`
- user phải có role `ADMIN` hoặc `SUPER_ADMIN`

## Database Spec

### Bảng mới

`product_digital_platform_settings`

```sql
id uuid primary key,
product_id uuid not null references products(id) on delete cascade,
digital_right_config_id uuid not null references digital_right_configs(id) on delete cascade,
price_multiplier_override numeric(12,4) not null check (price_multiplier_override > 0),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
updated_by uuid references users(id) on delete set null,
unique (product_id, digital_right_config_id)
```

### Chỉ mục và integrity

- index theo `product_id`
- index theo `digital_right_config_id`
- unique composite để ngăn duplicate row

### Backfill rules

- với mọi `products`
- lấy mọi `digital_right_configs` active thuộc platform được hỗ trợ
- tạo row override mặc định với `price_multiplier_override = base_price_multiplier`

Lý do:

- detail page luôn có dữ liệu đầy đủ để hiển thị
- không cần fallback null/empty phức tạp ở UI

## Pricing Engine Spec

### Rule mới

Khi tính giá `DIGITAL`:

1. Xác định `digitalRightConfigId`
2. Tìm row trong `product_digital_platform_settings`
3. Nếu có row override thì dùng `price_multiplier_override`
4. Nếu không có thì dùng `digital_right_configs.base_price_multiplier`
5. Tiếp tục áp modifier còn lại như hiện tại

### Tác động tới API pricing

- Nếu API pricing hiện chưa nhận `productId`, cần đánh giá:
  - bổ sung `productId` vào request calculate
  - hoặc chỉ dùng override trong flow định giá gắn với product cụ thể

Khuyến nghị:

- Nếu pricing được dùng để tính giá ở context của 1 product cụ thể, cần bổ sung `productId` vào pricing request/contract ở phase sau hoặc trong cùng đợt 2.

### Open question kỹ thuật

- Nếu `pricing.calculate` hiện đang là public endpoint không gắn `productId`, thì product-level override sẽ chưa thể phản ánh đầy đủ ở public pricing flow nếu không mở rộng contract.

=> Đây là dependency quan trọng cần chốt trước khi implement đợt 2.

## Migration Strategy

### Phase A

- tạo bảng mới
- tạo indexes
- thêm trigger/update timestamp nếu pattern hệ thống đang dùng

### Phase B

- backfill dữ liệu cho sản phẩm hiện có
- verify record count

### Phase C

- cập nhật service tạo product mới để auto-seed rows

### Phase D

- rollout FE section `Quản lý nền tảng số`

## Logging và Error Handling

Khi debug các case lỗi mới, dùng targeted log theo convention hiện tại:

```ts
console.log('[DEBUG] ProductPlatformsSection - payload:', payload)
console.log('[DEBUG] ProductsService - platform settings rows:', rows)
```

Error codes đề xuất:

- `PRODUCT_NOT_FOUND`
- `DIGITAL_RIGHT_CONFIG_NOT_FOUND`
- `DIGITAL_RIGHT_CONFIG_NOT_ACTIVE`
- `UNSUPPORTED_PLATFORM`
- `INVALID_PLATFORM_MULTIPLIER`
- `PRODUCT_PLATFORM_SETTINGS_LOAD_FAILED`
- `PRODUCT_PLATFORM_SETTINGS_UPDATE_FAILED`

## Security và Data Integrity

- Không cho client tự quyết định platform ngoài danh sách hỗ trợ
- Không trust multiplier từ client nếu không validate numeric
- Mọi save phải đi qua API, không patch local-only state như source of truth
- Cần chống ghi đè sai bằng cách save theo batch transaction hoặc upsert có kiểm soát

## Performance Considerations

- Detail page nên load product và platform settings song song nếu section `platforms` được mở
- Có thể lazy-load `platform settings` chỉ khi vào section `platforms`
- Tránh refetch toàn bộ product detail sau mỗi save; chỉ refresh phần section tương ứng

## QA Focus

- route transition không mất query state
- platform settings hiển thị đầy đủ cho mọi product
- mobile layout không vỡ khi duration rows nhiều
- save override không làm hỏng pricing global
- pricing dùng đúng precedence rule

## Kết luận

Đặc tả này chọn hướng triển khai ít rủi ro nhất cho current-state:

- không thay domain licensing gốc
- không tạo CRUD platform mới ở product level
- tận dụng `digital_right_configs` như source hệ thống
- thêm lớp `product override` để đáp ứng nhu cầu giá riêng theo sản phẩm
