# Kế hoạch sửa dialog chọn quyền bán theo hồ sơ Pháp lý

## Tóm tắt

* Mục tiêu là sửa lại dialog `Chọn quyền bán theo hồ sơ Pháp lý` trong `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`.

* Phạm vi chỉ gồm UI/UX và logic chọn quyền ở phía frontend cho Product.

* Không thay đổi API, schema, backend validation hay dữ liệu database.

* Kết quả mong muốn:

  * Dialog dễ đọc và có cấu trúc rõ hơn.

  * Bỏ hẳn phần ghi chú auto-sync hiện tại.

  * Có khu vực hiển thị riêng các quyền đang chọn ở phía dưới.

  * Logic chọn quyền rõ ràng hơn nhưng vẫn dùng đúng tập `Approved permissions` từ Compliance.

  * Vẫn cho phép lưu rỗng `0` quyền bán.

## Phân tích hiện trạng

* Dialog hiện nằm tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L1690-L1763).

* Dữ liệu dialog được lấy khi mở qua `openApprovedPermissionsDialog()`:

  * đặt `approvedPermissionsTrack`

  * gọi `getAdminComplianceDetail(track.id)`

  * nạp `approvedPermissionsDetail`

  * khởi tạo `selectedAllowedPermissionIds` từ `track.allowedPermissionIds`
    tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L470-L486).

* Điều kiện được phép chọn quyền hiện tại là:

  * `legalStatus === 'SUFFICIENT'`

  * `reviewStatus === 'APPROVED'`
    tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L489-L493).

* Logic chọn bỏ quyền hiện tại chỉ là toggle mảng `selectedAllowedPermissionIds` tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L495-L499).

* Khi lưu, dialog gọi `replaceAdminProductAllowedPermissions(productId, { permissionIds })` và cập nhật lại `rows`, `selectedTrack`, `approvedPermissionsTrack` tại [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue#L501-L521).

* API hiện có cho phạm vi này chỉ là frontend API call, không có endpoint riêng cho “quyền đang được sử dụng”, theo [products.api.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/products/products.api.ts#L36-L44).

* `Product` hiện chỉ lưu `allowedPermissionIds` và `allowedPermissions`, không có metadata usage cho từng quyền, theo [products.types.ts](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/products/products.types.ts#L20-L40).

## Giả định và quyết định đã khóa

* Chỉ sửa UI Product dialog, không thêm rule backend mới về “quyền đang được sử dụng”.

* Bỏ hẳn đoạn ghi chú hiện tại: “Khi Compliance được duyệt, hệ thống auto-sync...”.

* Có thêm khu vực riêng ở phía dưới để tóm tắt các quyền đang chọn.

* Cho phép lưu rỗng `0` quyền bán; việc chặn publish vẫn để flow Product hiện tại xử lý.

* Không đổi hợp đồng API `replaceAdminProductAllowedPermissions`.

## Thay đổi đề xuất

### 1. Làm lại bố cục dialog

**File:** [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

* Đổi phần header dialog để ưu tiên:

  * tên sản phẩm

  * mã sản phẩm

  * trạng thái pháp lý/review

* Tách nội dung dialog thành 3 vùng rõ ràng:

  * thông tin trạng thái hồ sơ

  * danh sách `Approved permissions` có thể chọn

  * tóm tắt `quyền đang chọn`

* Giữ dialog 1 cột để tránh quá dày trên màn hình trung bình, nhưng dùng card rõ ràng hơn giữa các block.

**Lý do**

* Block hiện tại dồn nhiều thông tin vào một card, ghi chú nằm lẫn với danh sách nên khó quét mắt.

* Tách vùng sẽ giúp admin hiểu nhanh: điều kiện chọn, tập quyền được cấp, và subset cuối cùng sẽ lưu.

### 2. Sửa trạng thái và thông điệp điều kiện chọn

**File:** [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

* Giữ logic `canChooseAllowedPermissions`, nhưng đổi UI hiển thị:

  * badge/trạng thái rõ hơn

  * cảnh báo điều kiện chưa đạt được viết ngắn và trực diện hơn

  * trường hợp `approvedPermissions.length === 0` có empty-state riêng

* Bỏ hoàn toàn đoạn text giải thích auto-sync hiện đang nằm dưới danh sách quyền.

**Lý do**

* Nội dung hiện tại dài, hơi trùng với hiểu biết nghiệp vụ ở nơi khác.

* Admin cần biết “có chọn được hay không” hơn là đọc mô tả quy trình sync.

### 3. Sửa logic chọn quyền ở frontend

**File:** [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

* Chuẩn hóa state lựa chọn khi dialog mở:

  * lấy `allowedPermissionIds` hiện tại của Product

  * chỉ map chọn trong tập `approvedPermissionIds` hợp lệ đang có từ Compliance

* Tạo computed/helper để dựng danh sách quyền đã chọn từ:

  * `approvedPermissionsDetail.approvedPermissionIds`

  * `approvedPermissionsDetail.approvedPermissions`

  * `selectedAllowedPermissionIds`

* Cập nhật logic toggle để:

  * không toggle khi `permissionId` rỗng

  * không phụ thuộc vào index mơ hồ nếu có thể map theo `approvedPermissionIds`

* Giữ nguyên khả năng lưu rỗng.

**Lý do**

* Hiện tại UI render theo index của `approvedPermissions`, trong khi selected state và payload lưu theo `approvedPermissionIds`.

* Việc tách helper/computed cho selected items giúp giao diện tóm tắt phía dưới không phải lặp logic trong template.

### 4. Thêm khu vực “Quyền đang chọn”

**File:** [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

* Thêm một block phía dưới danh sách `Approved permissions` để hiển thị:

  * tổng số quyền đang chọn

  * danh sách card/tag của các quyền đã chọn

  * empty-state khi chưa chọn quyền nào

* Mỗi item nên hiển thị:

  * tên quyền

  * `lawReference`

  * trạng thái selected rõ ràng

* Có thể kèm action phụ:

  * “Bỏ chọn tất cả” nếu đang có ít nhất 1 quyền

  * không cần “Chọn tất cả” nếu muốn tránh chọn nhầm hàng loạt

**Lý do**

* Người dùng đã chọn hướng hiển thị riêng ở phía dưới.

* Đây là phần quan trọng nhất của dialog vì nó phản ánh chính xác subset sẽ được lưu.

### 5. Nâng cấp visual cho danh sách `Approved permissions`

**File:** [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

* Đổi các button quyền thành card dễ scan hơn:

  * selected state nổi bật hơn

  * icon check hoặc indicator góc phải

  * hover state rõ

* Cải thiện khoảng cách, typography, và padding để danh sách quyền nhìn giống selector hơn là text list.

**Lý do**

* Dialog này là nơi đưa ra quyết định chọn subset cuối cùng, nên affordance của selected/unselected cần rõ ràng.

## Cách triển khai chi tiết

* Trong `script setup` của `ProductManagementPage.vue`:

  * bổ sung helper/computed cho:

    * danh sách quyền hợp lệ có thể chọn

    * danh sách quyền đang chọn để render ở block dưới

    * số lượng selected

  * cập nhật `openApprovedPermissionsDialog()` để đồng bộ state chọn ban đầu theo tập approved hiện có.

* Trong `template` của dialog:

  * refactor phần từ `approvedPermissionsDialogVisible` thành:

    * header card

    * state card

    * approved permissions selection grid

    * selected summary block

    * footer action

* Không cần sửa `products.api.ts` hay `products.types.ts` nếu chỉ dùng lại cấu trúc hiện có.

## Ngoài phạm vi

* Không sửa logic backend về kiểm tra “quyền đang được sử dụng”.

* Không thêm migration hay thay đổi schema.

* Không sửa flow publish/hide sản phẩm.

* Không thay đổi dialog `ComplianceManagementPage`.

## Bước xác minh

* Mở dialog chọn quyền bán của một Product có Compliance `SUFFICIENT + APPROVED`:

  * danh sách approved hiển thị đúng

  * chọn/bỏ chọn cập nhật ngay block “Quyền đang chọn”

  * lưu thành công với nhiều quyền

* Kiểm tra trường hợp `0` quyền:

  * bỏ hết chọn

  * lưu vẫn thành công

* Kiểm tra trường hợp Compliance chưa đủ điều kiện:

  * dialog hiển thị cảnh báo rõ

  * không cho thao tác lưu

* Kiểm tra trường hợp không có approved permissions:

  * hiển thị empty-state đúng

* Chạy:

  * diagnostics cho `ProductManagementPage.vue`

  * `pnpm.cmd typecheck` trong `apps/web`

