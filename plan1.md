# Cải thiện Modal Quản lý Sản phẩm

## Mô tả

Modal chi tiết sản phẩm (`detailDialogVisible`) hiện đang quá dài và khó theo dõi vì đổ tất cả thông tin vào một trang duy nhất (thông tin chung, mô tả, quyền bán, eligibility, lịch sử đăng ký gói...). Yêu cầu:

1. **Tách modal thành Tabs** — theo mẫu ảnh: `Hồ sơ & Tài liệu` + `Đánh giá & Duyệt` (bổ sung thêm các tab phù hợp với nội dung hiện có)
2. **Ẩn scrollbar** trong nội dung modal
3. **Thêm confirm dialog** cho các thao tác quan trọng trong modal (đăng ký/gỡ gói, lưu quyền bán, phát hành/ẩn track)

---

## Proposed Changes

### [MODIFY] [ProductManagementPage.vue](file:///c:/Users/LHP02/Desktop/musica-v0.1/apps/web/src/features/admin-shell/pages/ProductManagementPage.vue)

#### Script section

Thêm state cho tab navigation:
```ts
const detailActiveTab = ref<'info' | 'licensing' | 'review'>('info')
```

Thêm confirm wrapper cho `submitPackageRegistration` — hiện tại gọi thẳng API, cần wrap bằng `confirm.require(...)`.

Thêm confirm wrapper cho `submitAllowedPermissions`.

#### Template section — Detail Dialog (dòng 1805–2078)

**Tabs layout:**

| Tab | Icon | Nội dung |
|-----|------|---------|
| `Thông tin` | `pi-file` | Waveform + thông tin chung + mô tả + thumbnail |
| `Quyền & Licensing` | `pi-book` | Quyền bán đã chọn + Digital/Physical eligibility + lịch sử đăng ký |
| `Đánh giá & Duyệt` | `pi-verified` | Compliance status (redirect đến compliance) |

**Tab bar style** theo ảnh mẫu: dùng border-bottom highlight cho tab active, icon + text label.

**Ẩn scrollbar:** thêm CSS `scrollbar-width: none` / `::-webkit-scrollbar { display: none }` vào container nội dung modal.

**Edit Dialog** (dòng 1722–1803):
- Sắp xếp lại layout: cột trái = thông tin văn bản, cột phải = media (thumbnail + audio)
- Tương tự Create Dialog để nhất quán

#### Confirm dialogs thêm vào

1. `submitPackageRegistration` — wrap bằng `confirm.require(...)` với message rõ tên gói
2. `submitAllowedPermissions` — confirm trước khi lưu quyền bán
3. Các nút `Đăng ký tham gia` / `Gỡ khỏi gói` trong detail dialog

---

## Open Questions

> [!IMPORTANT]
> **Tab thứ 3 "Đánh giá & Duyệt"** — theo ảnh mẫu là tab thứ 2. Tôi dự kiến thêm tab này hiển thị compliance status (legal/review status) và nút điều hướng đến `/admin/compliance`. Bạn có muốn thêm logic duyệt trực tiếp trong tab này không, hay chỉ xem + redirect?

> [!NOTE]
> **Edit Dialog** — Bạn có muốn tôi cải thiện layout của Edit Dialog (hiện đang flat list) sang dạng 2 cột như Create Dialog không?

---

## Verification Plan

- Typecheck: `pnpm --filter web typecheck`
- Kiểm tra thủ công: mở modal detail, chuyển tab, confirm các thao tác quan trọng
- Kiểm tra ẩn scrollbar trong modal
