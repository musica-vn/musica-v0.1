# Plan sửa phần 2 và phần 3 theo tài liệu

## Summary
- Mục tiêu: chỉnh lại module quản trị cho **Digital Platform Rights Management** và **Physical Usage Rights Management** để khớp với tài liệu `Tài liệu đặc tả tính năng admin library V2.0.txt`, nhưng chỉ trong phạm vi **admin config** hiện có.
- Phạm vi được chốt:
  - Có: schema/API/UI cho `settings/digital-rights` và `settings/physical-rights`.
  - Không có: `Creator Join Package`, `Eligible/Ineligible/Joined`, matching engine, public marketplace flow.
  - Giữ convention hiện tại: `id` tiếp tục là `UUID`, **không** thêm hay expose `code`.

## Current State Analysis

### Tài liệu đặc tả yêu cầu
- Phần 2 yêu cầu cấu hình gói quyền số gồm:
  - `Target Platform`: `YOUTUBE | TIKTOK | FACEBOOK`
  - `Referenced Permissions`: chọn từ các `Core Permission` đang `ACTIVE`
  - `Base Price / Multiplier`: số >= 1
  - `Status`: `ACTIVE | INACTIVE`, mặc định khi tạo là `INACTIVE`
  - Ý nghĩa thao tác: tạo bản nháp, sau đó mới publish.
- Phần 3 yêu cầu cấu hình quyền vật lý gồm:
  - `Venue/Usage Type`
  - `Referenced Permissions`
  - `Base Price / Multiplier`: số >= 1
  - `Status`: `ACTIVE | INACTIVE`, mặc định khi tạo là `INACTIVE`
  - Ý nghĩa thao tác: tạo bản nháp, sau đó mới publish.

### Hiện trạng backend
- API admin đã tồn tại đầy đủ CRUD cho digital và physical:
  - `apps/api/src/licensing-configs/admin-digital-right-configs.controller.ts`
  - `apps/api/src/licensing-configs/admin-physical-right-configs.controller.ts`
- DTO/backend model hiện đã đúng phần lớn field nghiệp vụ:
  - `Digital`: `targetPlatform`, `durationType`, `basePriceMultiplier`, `referencedPermissionIds`, `status`
  - `Physical`: `venueUsageType`, `basePriceMultiplier`, `referencedPermissionIds`, `status`
  - File chính: `apps/api/src/licensing-configs/licensing-configs.dto.ts`
- Service hiện validate `referencedPermissionIds` chỉ nhận `core_permissions` đang `ACTIVE`, phù hợp yêu cầu tài liệu:
  - `apps/api/src/licensing-configs/licensing-configs.service.ts`
- Lệch lớn nhất so với tài liệu:
  - `createDigitalRightConfig()` đang default `status` thành `ACTIVE`
  - `createPhysicalRightConfig()` đang default `status` thành `ACTIVE`
  - DTO create cũng đang mô tả default `ACTIVE`
- Schema DB cũng đang default `status` là `ACTIVE` cho:
  - `digital_right_configs`
  - `physical_right_configs`
  - Nguồn: `apps/api/supabase/migrations/20260628000100_database_v2_foundation.sql`

### Hiện trạng frontend
- Admin routes đã có sẵn:
  - `apps/web/src/router/index.ts`
  - `/admin/settings/digital-rights`
  - `/admin/settings/physical-rights`
- UI đang dùng chung page:
  - `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- API/store/types cho licensing configs đã có:
  - `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
  - `apps/web/src/features/licensing-configs/licensing-configs.store.ts`
  - `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- Lệch lớn nhất ở FE:
  - wording hiện thiên về “quyền phụ thuộc”, chưa phản ánh rõ “bộ quyền cốt lõi bắt buộc”
  - luồng create đang báo như tạo cấu hình bình thường, chưa nhấn mạnh tạo bản nháp `INACTIVE`
  - copy/UI chưa thể hiện rõ thao tác publish/unpublish theo tinh thần tài liệu
  - filter/search placeholder cho digital/physical còn generic, chưa bám sát domain

### Những gì chưa tồn tại và chưa nên làm trong vòng này
- Không có bảng join sản phẩm với digital/physical package.
- Không có API creator-side để đăng ký tham gia package.
- Không có engine so sánh `Referenced Permissions ⊆ Allowed Core Permissions`.
- Vì scope đã chốt là **Admin config only**, các phần này sẽ **không** được đưa vào implementation round này.

## Proposed Changes

### 1. Đồng bộ rule tạo mới mặc định là INACTIVE ở backend
- File: `apps/api/src/licensing-configs/licensing-configs.service.ts`
- Việc sửa:
  - đổi default create của `digital` từ `ACTIVE` sang `INACTIVE`
  - đổi default create của `physical` từ `ACTIVE` sang `INACTIVE`
- Lý do:
  - đây là khác biệt nghiệp vụ quan trọng nhất giữa code hiện tại và tài liệu
  - giúp tạo bản ghi ở trạng thái bản nháp trước khi publish
- Cách làm:
  - cập nhật `payload.status ?? 'INACTIVE'` ở 2 hàm create tương ứng
  - giữ nguyên API update status hiện có để publish/unpublish qua endpoint `/status`

### 2. Đồng bộ contract request/Swagger cho digital và physical
- File: `apps/api/src/licensing-configs/licensing-configs.dto.ts`
- File: `apps/api/src/licensing-configs/licensing-configs.swagger.ts`
- Việc sửa:
  - đổi mô tả/default của `status` trong DTO create cho `digital` và `physical` sang `INACTIVE`
  - cân nhắc bỏ hoàn toàn `status` khỏi payload create nếu muốn khóa chặt nghiệp vụ “tạo luôn là draft”
- Quyết định implementation đề xuất:
  - ưu tiên thay đổi tối thiểu: vẫn giữ field `status` ở DTO để tránh mở rộng phạm vi sync không cần thiết, nhưng backend và Swagger phải thể hiện default đúng là `INACTIVE`

### 3. Cập nhật DB default để tránh drift giữa app logic và dữ liệu
- File mới dự kiến: `apps/api/supabase/migrations/<new_migration_for_digital_physical_default_inactive>.sql`
- Việc sửa:
  - alter default `status` của `public.digital_right_configs` sang `INACTIVE`
  - alter default `status` của `public.physical_right_configs` sang `INACTIVE`
- Lý do:
  - tránh trường hợp insert ngoài service vẫn tạo bản ghi `ACTIVE`
  - giữ schema đúng với business rule tài liệu
- Ghi chú:
  - không đổi `id` sang string, không thêm `code`
  - không backfill dữ liệu cũ trừ khi phát hiện cần normalize record hiện có

### 4. Chỉnh wording và UX của admin page cho đúng domain tài liệu
- File: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Việc sửa cho phần digital:
  - title/description nhấn mạnh “gói quyền số”, “bộ quyền cốt lõi bắt buộc”, “publish package”
  - label `Quyền phụ thuộc` đổi sang wording gần tài liệu hơn, ví dụ `Quyền cốt lõi bắt buộc`
  - success message khi tạo mới đổi thành kiểu `Đã tạo bản nháp cấu hình quyền số`
  - confirm toggle status hiển thị intent `Publish` / `Tắt gói`
- Việc sửa cho phần physical:
  - description bám “bối cảnh/địa điểm sử dụng thực tế”
  - đổi label sang `Quyền cốt lõi bắt buộc`
  - success message tạo mới thành `Đã tạo bản nháp cấu hình quyền vật lý`
  - publish/unpublish copy nhất quán với tài liệu
- Việc sửa chung:
  - rà soát placeholder/filter text để khớp field thực tế từng resource
  - giữ component generic, nhưng tách nhánh wording rõ hơn cho `digital` và `physical`

### 5. Sync FE API/types nếu backend contract create thay đổi
- File: `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- File: `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
- File: `apps/web/src/features/licensing-configs/licensing-configs.store.ts`
- Việc sửa:
  - chỉ sửa nếu backend contract create thay đổi shape
  - với phương án giữ field `status`, FE types hiện tại gần như không cần đổi
  - sau khi regenerate OpenAPI/types, rà soát generated schema để tránh drift

### 6. Đồng bộ OpenAPI và generated FE types
- File output bị ảnh hưởng:
  - `apps/api/openapi.json`
  - `apps/web/src/shared/api/generated/schema.d.ts`
- Việc sửa:
  - regenerate OpenAPI sau khi đổi DTO/service
  - regenerate FE types để tránh drift contract

### 7. Kiểm thử và xác nhận sau sửa
- Backend:
  - tạo mới digital config => record trả về có `status = INACTIVE`
  - tạo mới physical config => record trả về có `status = INACTIVE`
  - update status từ `INACTIVE -> ACTIVE` vẫn hoạt động qua endpoint `/status`
  - `referencedPermissionIds` vẫn chỉ nhận permission `ACTIVE`
- Frontend:
  - màn hình `/admin/settings/digital-rights` và `/admin/settings/physical-rights` hiển thị copy đúng domain
  - thao tác tạo mới hiển thị success message theo ngữ nghĩa bản nháp
  - list render status đúng sau khi tạo mới
  - toggle status hoạt động đúng và wording không gây hiểu nhầm
- Regression:
  - expression/modification configs không bị ảnh hưởng
  - route hiện có và store generic không bị vỡ type

## Assumptions & Decisions
- Quyết định đã chốt với user:
  - chỉ sửa **admin config**
  - không làm creator flow
  - không làm matching engine
  - giữ `UUID` hiện tại, không thêm `code`
- Giả định implementation:
  - `durationType` của digital vẫn giữ theo code hiện tại (`ONE_YEAR | PERPETUAL`) vì tài liệu không yêu cầu thay đổi phần này, chỉ mô tả thêm business context
  - phần sửa tập trung vào **alignment** giữa tài liệu và module hiện có, không mở rộng feature set mới
- Nếu trong quá trình implement phát hiện DTO create đang được tái sử dụng ở chỗ khác, ưu tiên giữ compatibility tối đa cho FE đang có rồi mới siết chặt contract

## Verification Steps
- Đọc lại và sửa các file:
  - `apps/api/src/licensing-configs/licensing-configs.service.ts`
  - `apps/api/src/licensing-configs/licensing-configs.dto.ts`
  - `apps/api/src/licensing-configs/licensing-configs.swagger.ts`
  - `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
  - file migration mới trong `apps/api/supabase/migrations`
- Chạy chuỗi verify:
  - `pnpm.cmd -C apps/api build`
  - `pnpm.cmd -C apps/api gen:openapi`
  - `pnpm.cmd -C apps/web gen:types`
  - `pnpm.cmd -C apps/api typecheck`
  - `pnpm.cmd -C apps/web typecheck`
- Nếu có thời gian và test sẵn pattern phù hợp:
  - bổ sung test focused cho service create digital/physical default status
  - nếu chưa có test phù hợp, ít nhất xác nhận bằng typecheck + kiểm tra flow tạo mới ở UI

## Expected Outcome
- Phần 2 và phần 3 trên admin sẽ khớp tài liệu ở các điểm cốt lõi:
  - terminology đúng domain
  - default status đúng là `INACTIVE`
  - thao tác publish/unpublish rõ nghĩa
  - contract FE/BE/DB không drift
- Không làm phát sinh scope ngoài yêu cầu như creator journey hay matching engine.
