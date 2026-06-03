# Báo cáo dọn dẹp dự án

**Version:** 1.1  
**Last updated:** 2026-06-03  
**Repo:** `musica-v0.1`

## Mục tiêu

- Giảm “noise” trong codebase: bỏ demo/template, bỏ phần trùng lặp, bỏ dependencies không dùng.
- Chuẩn hoá BE auth utilities để tránh lệch hành vi giữa các endpoint.
- Giữ repo gọn cho vận hành (dev/staging/prod), hạn chế file “details/handbook” không phục vụ runtime.

## Xác nhận an toàn trước khi dọn

### Có thể xoá ngay
- `apps/web/src/components/HelloWorld.vue`: chỉ còn tự tham chiếu tới asset demo, không còn được import trong `apps/web/src`.
- `apps/web/public/icons.svg`: hiện chỉ được `HelloWorld.vue` dùng.
- `apps/web/src/assets/vite.svg`: hiện chỉ được `HelloWorld.vue` dùng.
- `apps/web/src/assets/vue.svg`: hiện chỉ được `HelloWorld.vue` dùng.
- `apps/api/src/examples`: chỉ là demo module và hiện chỉ được `AppModule` import.

### Cần refactor trước khi xoá
- `apps/api/src/auth/*`: vẫn còn 3 controller admin import trực tiếp `../auth/jwt-auth.guard`, `../auth/roles.guard`, `../auth/roles.decorator`.
- `apps/web/src/assets/hero.png`: hiện chỉ thấy được `HelloWorld.vue` dùng, nhưng đang được giữ theo cleanup plan hiện tại để xác nhận thêm với team trước khi xoá thật.

### Giữ lại
- `apps/web/skills/*`: không phục vụ runtime build, nhưng là knowledge base nội bộ nên cần tối ưu cách dùng thay vì xoá.
- `apps/web/AGENTS.md`: giữ lại như handbook cho skill library, không dùng làm runtime prompt chính.
- `.superpowers/`: theo yêu cầu hiện tại, đây là shared setup dùng chung và phải được commit, không được xem như local artifact để xoá/ignore.
- `@vueuse/core`: tuy app runtime hiện chưa import, package vẫn được dùng trong ví dụ/reference của `apps/web/skills`, nên chưa gỡ ở bước đầu.

## Lệch giữa docs và codebase hiện tại

- `README.md` còn mô tả `tracks` ở một số đoạn, trong khi cấu trúc hiện tại đã chuyển sang `products`.
- `AGENT.md` root và `apps/web/AGENT.md` vẫn dùng link tuyệt đối kiểu Windows (`file:///c:/...`), không phù hợp với repo hiện tại.
- `apps/web/AGENT.md` đang trộn runtime instructions với hướng dẫn đọc skill library, làm prompt dài hơn mức cần thiết.
- `CLEANUP_REPORT.md` phiên bản cũ giả định có thể xoá `apps/web/skills/*`, `apps/web/AGENTS.md`, `.superpowers/` và `@vueuse/core`; các giả định này không còn đúng với setup dùng chung hiện tại.

## Phạm vi dọn dẹp

- Backend (NestJS) trong `apps/api`
- Frontend (Vue/Vite) trong `apps/web`
- Root artifacts không phục vụ runtime

## Thay đổi chính

### 1) Backend (apps/api)

**1.1 Chuẩn hoá auth guards/decorators**

- Chuẩn hoá toàn bộ controller đang dùng auth sang `src/common/auth/*`:
  - `JwtAuthGuard`: `apps/api/src/common/auth/jwt-auth.guard.ts`
  - `RolesGuard`: `apps/api/src/common/auth/roles.guard.ts`
  - `RequireRoles`: `apps/api/src/common/auth/require-roles.decorator.ts`
- Loại bỏ các bản trùng trong `apps/api/src/auth/*` (đã gây phân mảnh/khó maintain).

Các file cập nhật tiêu biểu:
- `apps/api/src/certificates/admin-certificates.controller.ts`
- `apps/api/src/products/admin-products.controller.ts`
- `apps/api/src/product-package-registrations/admin-product-package-registrations.controller.ts`
- `apps/api/src/auth/auth.module.ts` (export guard/roles guard thống nhất)

**1.2 Bỏ module demo “examples”**

- Gỡ import `ExamplesModule` khỏi `apps/api/src/app.module.ts`.
- Xoá hẳn folder `apps/api/src/examples` (controller/module/swagger) vì chỉ là demo.

**1.3 Giảm import/module không cần thiết**

- `ProductsModule`, `CertificatesModule`, `ProductPackageRegistrationsModule` bỏ import `AuthModule` vì controllers dùng guards trực tiếp, không cần module wiring thêm.

### 2) Frontend (apps/web)

**2.1 Bỏ template/demo leftover**

- Xoá `apps/web/src/components/HelloWorld.vue`
- Xoá `apps/web/src/assets/*` (hero/vite/vue svg/png)
- Xoá `apps/web/public/icons.svg` (chỉ được HelloWorld dùng)

**2.2 Tối ưu AI guidance và skill library**

- Giữ `apps/web/skills/*` và `apps/web/AGENTS.md`, nhưng rút gọn để agent chỉ đọc đúng tài liệu cần cho task.
- Gọn lại `apps/web/AGENT.md` để chỉ giữ runtime rules, chuyển phần handbook dài sang `apps/web/AGENTS.md`.
- Chuẩn hoá phần mở đầu của toàn bộ `apps/web/skills/*/SKILL.md` theo cấu trúc `Use When` + `Do First`.

**2.3 Dependencies**

- Giữ `@vueuse/core` trong `apps/web/package.json` vì hiện vẫn được dùng trong ví dụ/reference của local skill library, chưa tách ra một package tài liệu riêng.

### 3) Root artifacts

- Giữ `.superpowers/` trong repo theo setup dùng chung hiện tại.
- Gọn lại `AGENT.md` root để chỉ còn vai trò runtime entrypoint và bỏ toàn bộ Windows absolute paths.
- Gọn lại `apps/api/AGENTS.md` thành compatibility shim ngắn.

### 4) Kế hoạch cũ không còn dùng

- Xoá các file plan cũ trong `.trae/documents/` không còn được repo tham chiếu.
- Xoá các file cũ trong `docs/superpowers/plans/` không còn được tham chiếu và thay bằng plan hiện tại `2026-06-03-project-cleanup-agent-skills-setup.md`.

## Thay đổi lockfile

- Không cần đổi `pnpm-lock.yaml` trong đợt này vì chưa gỡ hoặc thêm dependency mới.

## Verification

Đã chạy và pass:

```bash
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter api exec jest --runInBand
pnpm --filter web build
```

Đã chạy nhưng chưa pass do nợ kỹ thuật cũ ngoài phạm vi cleanup:

```bash
pnpm --filter api lint
```

## Tác động / lưu ý

- API auth: từ đây trở đi nên chỉ dùng `apps/api/src/common/auth/*` để tránh tạo lại bản trùng trong `apps/api/src/auth/*`.
- FE: `apps/web/skills/*` vẫn được giữ lại, nhưng agent runtime giờ không cần nạp cả thư viện mà chỉ đọc đúng skill/reference liên quan.
- `apps/web/AGENTS.md` vẫn được giữ, nhưng đã được hạ vai trò xuống handbook bảo trì thay vì runtime prompt chính.
- `pnpm --filter api test -- --runInBand` không phù hợp với script hiện tại; để chạy test tuần tự cần dùng `pnpm --filter api exec jest --runInBand`.

## Gợi ý bước tiếp theo (không làm trong đợt này)

- Bật lint thật cho FE (hiện `lint` đang là no-op) để ngăn unused imports/deps quay lại.
- Chuẩn hoá style/format giữa các file BE (hiện codebase có cả semicolon/no-semicolon).
