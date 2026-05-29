# Remove Code Identifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ toàn bộ `code` nhân tạo khỏi DB, backend contract và admin UI, đồng thời giữ dữ liệu hiện có và không hiển thị UUID trên giao diện.

**Architecture:** Refactor đi từ schema lên giao diện theo thứ tự `migration -> service/auth -> OpenAPI/types -> page/store/api`. Database sẽ bỏ toàn bộ cột mã và helper sinh mã; backend đổi sang dùng `id` trong mọi quan hệ nội bộ; frontend bỏ các trường mã khỏi type và UI, thay bằng các field mô tả có ý nghĩa vận hành.

**Tech Stack:** Supabase SQL migrations, NestJS, TypeScript, Jest, Vue 3, Pinia, PrimeVue, OpenAPI, openapi-typescript

---

## File Structure Map

- `apps/api/supabase/migrations/20260529000100_remove_code_identifiers.sql`
  - Migration chính để drop cột `code` và helper SQL liên quan.
- `apps/api/supabase/migrations/supabase-seed-mvp.sql`
  - Seed dữ liệu tương thích schema mới, không dựa vào mã.
- `apps/api/scripts/seed-dev.mjs`
  - Seed dev tạo dữ liệu và role mapping theo `id`.
- `apps/api/src/auth/*`
  - Bỏ `roleCode/roleCodes`, chuẩn hóa auth context theo `roleId`.
- `apps/api/src/admin-users/*`
  - User admin DTO/service trả `roleId` và label hiển thị thay cho mã.
- `apps/api/src/managed-users/*`
  - Managed users DTO/service bỏ phụ thuộc vào `roleCode`.
- `apps/api/src/core-permissions/*`
  - DTO/service/swagger không còn `code` và `legacy_code`.
- `apps/api/src/licensing-configs/*`
  - DTO/service/swagger không còn `code` của các config domain.
- `apps/api/src/products/*`
  - DTO/service/swagger bỏ `productCode`.
- `apps/api/src/compliance/*`
  - DTO/service/swagger bỏ `complianceCode`.
- `apps/api/src/certificates/*`
  - DTO/service đổi logic template mặc định không còn `.eq('code', 'DEFAULT')`.
- `apps/api/src/openapi.ts`
  - Regenerate `openapi.json` theo DTO mới.
- `apps/web/src/shared/api/generated/schema.d.ts`
  - Generated types mới sau khi backend đổi contract.
- `apps/web/src/features/auth/*`
  - Auth types/store/api không còn `roleCode/roleCodes`.
- `apps/web/src/features/admins/*`
  - API/types/store admin list bỏ `roleCode`.
- `apps/web/src/features/managed-users/*`
  - API/types/store managed users bỏ `roleCode`.
- `apps/web/src/features/core-permissions/*`
  - API/types/store bỏ `code`.
- `apps/web/src/features/licensing-configs/*`
  - API/types/store bỏ `code`.
- `apps/web/src/features/products/*`
  - API/types/components bỏ `productCode`.
- `apps/web/src/features/compliance/*`
  - API/types bỏ `complianceCode`.
- `apps/web/src/features/certificates/*`
  - API/types bỏ `code`.
- `apps/web/src/features/admin-shell/pages/*`
  - Các page admin bỏ cột và filter theo mã, chuyển sang field mô tả.

### Task 1: Tạo migration và cập nhật seed cho schema không còn code

**Files:**
- Create: `apps/api/supabase/migrations/20260529000100_remove_code_identifiers.sql`
- Modify: `apps/api/supabase/migrations/supabase-seed-mvp.sql`
- Modify: `apps/api/scripts/seed-dev.mjs`

- [ ] **Step 1: Viết migration test SQL trước khi đụng service**

```sql
-- apps/api/supabase/migrations/20260529000100_remove_code_identifiers.sql
alter table if exists public.roles drop constraint if exists roles_code_key;
alter table if exists public.roles drop column if exists code;

alter table if exists public.core_permissions drop constraint if exists core_permissions_code_key;
alter table if exists public.core_permissions drop column if exists legacy_code;
alter table if exists public.core_permissions drop column if exists code;

alter table if exists public.products drop constraint if exists products_product_code_key;
alter table if exists public.products drop column if exists product_code;

alter table if exists public.compliance_reviews drop constraint if exists compliance_reviews_code_key;
alter table if exists public.compliance_reviews drop column if exists code;

alter table if exists public.certificate_templates drop constraint if exists certificate_templates_code_key;
alter table if exists public.certificate_templates drop column if exists code;
```

- [ ] **Step 2: Bổ sung phần cleanup helper SQL sinh mã**

```sql
drop function if exists public.allocate_core_permission_code();
drop function if exists public.allocate_digital_right_config_code();
drop function if exists public.allocate_physical_right_config_code();
drop function if exists public.allocate_expression_config_code();
drop function if exists public.allocate_modification_config_code();

drop sequence if exists public.core_permission_code_seq;
drop sequence if exists public.digital_right_config_code_seq;
drop sequence if exists public.physical_right_config_code_seq;
drop sequence if exists public.expression_config_code_seq;
drop sequence if exists public.modification_config_code_seq;
```

- [ ] **Step 3: Cập nhật seed SQL để tạo template mặc định và role mà không dùng code**

```sql
insert into public.certificate_templates (name, body_html, is_active)
values ('Mau mac dinh', '<div>{{trackTitle}}</div>', true)
on conflict do nothing;

insert into public.roles (name, description)
values
  ('Super Admin', 'Quyen quan tri cao nhat'),
  ('Admin', 'Quyen quan tri he thong'),
  ('Artist', 'Nghe si'),
  ('Buyer', 'Nguoi mua')
on conflict (name) do nothing;
```

- [ ] **Step 4: Cập nhật `seed-dev.mjs` để resolve role theo tên rồi lấy `id`**

```js
const { data: roleRows } = await supabase
  .from('roles')
  .select('id, name')
  .in('name', ['Super Admin', 'Admin', 'Artist', 'Buyer'])

const roleIdByName = new Map(roleRows.map((row) => [row.name, row.id]))

await supabase.from('user_roles').upsert({
  user_id: adminUserId,
  role_id: roleIdByName.get('Super Admin'),
})
```

- [ ] **Step 5: Chạy database push trên local**

Run: `pnpm db:push`
Expected: migration chạy thành công, không còn lỗi về constraint hoặc function `code`

- [ ] **Step 6: Chạy seed dev trên schema mới**

Run: `pnpm --filter api seed:dev`
Expected: seed hoàn tất, tạo user dev và dữ liệu mẫu mà không cần cột `code`

- [ ] **Step 7: Commit checkpoint migration**

```bash
git add apps/api/supabase/migrations/20260529000100_remove_code_identifiers.sql apps/api/supabase/migrations/supabase-seed-mvp.sql apps/api/scripts/seed-dev.mjs
git commit -m "refactor: remove code identifiers from database schema"
```

### Task 2: Refactor auth, admin users và managed users sang roleId

**Files:**
- Modify: `apps/api/src/auth/auth.dto.ts`
- Modify: `apps/api/src/auth/auth.types.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/roles.guard.ts`
- Modify: `apps/api/src/common/auth/auth.types.ts`
- Modify: `apps/api/src/common/auth/roles.guard.ts`
- Modify: `apps/api/src/admin-users/admin-users.dto.ts`
- Modify: `apps/api/src/admin-users/admin-users.service.ts`
- Modify: `apps/api/src/managed-users/managed-users.dto.ts`
- Modify: `apps/api/src/managed-users/managed-users.service.ts`

- [ ] **Step 1: Viết test fail cho auth context không còn roleCode**

```ts
it('maps auth payload with role ids and role names only', async () => {
  const result = await service.login({ email: 'admin01@musica.local', password: 'Password123!' })

  expect(result.user.roleId).toBeDefined()
  expect(result.user.roleName).toBe('Super Admin')
  expect(result.user).not.toHaveProperty('roleCode')
  expect(result.user).not.toHaveProperty('roleCodes')
})
```

- [ ] **Step 2: Chạy test để xác nhận đang fail trước khi sửa**

Run: `pnpm --filter api test -- auth/auth.service.spec.ts --runInBand`
Expected: FAIL vì DTO/service hiện vẫn trả `roleCode` hoặc `roleCodes`

- [ ] **Step 3: Sửa DTO và auth types**

```ts
export class AuthUserDto {
  id!: string
  email!: string
  fullName!: string
  roleId!: string | null
  roleName!: string | null
}

export type AuthenticatedUser = {
  userId: string
  email: string
  roleId: string | null
  roleName: string | null
}
```

- [ ] **Step 4: Sửa `auth.service.ts` để select `roles(id, name)` thay cho `roles(code)`**

```ts
const { data: roleRow } = await this.supabase
  .from('user_roles')
  .select('role_id, roles(id, name)')
  .eq('user_id', user.id)
  .maybeSingle()

const role = Array.isArray(roleRow?.roles) ? roleRow.roles[0] : roleRow?.roles

return {
  accessToken,
  user: {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roleId: role?.id ?? null,
    roleName: role?.name ?? null,
  },
}
```

- [ ] **Step 5: Sửa `roles.guard.ts` để kiểm tra theo `roleName` trong một helper tập trung**

```ts
const hasRequiredRole = (user: AuthenticatedUser, requiredRoles: string[]) =>
  Boolean(user.roleName && requiredRoles.includes(user.roleName))
```

- [ ] **Step 6: Cập nhật admin/managed users DTO để trả danh sách role theo `id` và `name`**

```ts
export class UserRoleSummaryDto {
  roleId!: string
  roleName!: string
}
```

- [ ] **Step 7: Chạy typecheck backend và test auth**

Run: `pnpm --filter api typecheck && pnpm --filter api test -- --runInBand`
Expected: PASS ở các test auth, admin users, managed users đang có

- [ ] **Step 8: Commit checkpoint auth**

```bash
git add apps/api/src/auth apps/api/src/common/auth apps/api/src/admin-users apps/api/src/managed-users
git commit -m "refactor: replace role code auth flow with role ids"
```

### Task 3: Refactor core permissions và licensing configs ở backend

**Files:**
- Modify: `apps/api/src/core-permissions/core-permissions.dto.ts`
- Modify: `apps/api/src/core-permissions/core-permissions.service.ts`
- Modify: `apps/api/src/core-permissions/core-permissions.swagger.ts`
- Modify: `apps/api/src/core-permissions/core-permissions.service.spec.ts`
- Modify: `apps/api/src/licensing-configs/licensing-configs.dto.ts`
- Modify: `apps/api/src/licensing-configs/licensing-configs.service.ts`
- Modify: `apps/api/src/licensing-configs/licensing-configs.swagger.ts`

- [ ] **Step 1: Viết test fail cho `core permissions` không còn `code`**

```ts
it('returns core permission item without code', async () => {
  const result = await service.findAll({ page: 1, pageSize: 10 })
  expect(result.items[0]).not.toHaveProperty('code')
  expect(result.items[0]).toHaveProperty('name')
})
```

- [ ] **Step 2: Sửa DTO `core permissions`**

```ts
export class CorePermissionDto {
  id!: string
  name!: string
  description!: string | null
  lawReference!: string | null
  status!: 'ACTIVE' | 'INACTIVE'
  createdAt!: string
  updatedAt!: string
}
```

- [ ] **Step 3: Sửa service `core permissions` bỏ select/filter theo mã**

```ts
const keyword = query.keyword?.trim()

if (keyword) {
  request = request.or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,law_reference.ilike.%${keyword}%`)
}
```

- [ ] **Step 4: Sửa DTO và service `licensing configs` bỏ `code`**

```ts
export type LicensingConfigListItem = {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  updatedAt: string
}
```

- [ ] **Step 5: Chạy test backend cho 2 module**

Run: `pnpm --filter api test -- --runInBand src/core-permissions/core-permissions.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Chạy typecheck backend**

Run: `pnpm --filter api typecheck`
Expected: PASS

- [ ] **Step 7: Commit checkpoint permissions/configs**

```bash
git add apps/api/src/core-permissions apps/api/src/licensing-configs
git commit -m "refactor: drop code fields from permission and licensing APIs"
```

### Task 4: Refactor products, compliance và certificates ở backend

**Files:**
- Modify: `apps/api/src/products/product.dto.ts`
- Modify: `apps/api/src/products/admin-products.dto.ts`
- Modify: `apps/api/src/products/products.service.ts`
- Modify: `apps/api/src/products/products.swagger.ts`
- Modify: `apps/api/src/products/products.service.spec.ts`
- Modify: `apps/api/src/compliance/compliance.dto.ts`
- Modify: `apps/api/src/compliance/compliance.service.ts`
- Modify: `apps/api/src/compliance/compliance.swagger.ts`
- Modify: `apps/api/src/certificates/certificate.dto.ts`
- Modify: `apps/api/src/certificates/admin-certificates.dto.ts`
- Modify: `apps/api/src/certificates/certificates.service.ts`
- Modify: `apps/api/src/certificates/certificates.swagger.ts`

- [ ] **Step 1: Viết test fail cho `products` và `compliance` không còn mã**

```ts
it('returns product detail without productCode', async () => {
  const result = await service.findOne(productId)
  expect(result).not.toHaveProperty('productCode')
})

it('returns compliance detail without complianceCode', async () => {
  const result = await service.findOne(reviewId)
  expect(result).not.toHaveProperty('code')
})
```

- [ ] **Step 2: Sửa DTO `products`**

```ts
export class ProductDto {
  id!: string
  title!: string
  artistName!: string | null
  category!: string | null
  status!: string
  createdAt!: string
  updatedAt!: string
}
```

- [ ] **Step 3: Sửa DTO `compliance`**

```ts
export class ComplianceReviewDto {
  id!: string
  trackId!: string
  trackTitle!: string | null
  status!: string
  reviewType!: string | null
  createdAt!: string
  updatedAt!: string
}
```

- [ ] **Step 4: Sửa `certificates.service.ts` để lấy template đang active theo `is_active`**

```ts
const { data: template } = await this.supabase
  .from('certificate_templates')
  .select('*')
  .eq('is_active', true)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

- [ ] **Step 5: Chạy test backend cho products**

Run: `pnpm --filter api test -- --runInBand src/products/products.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Chạy typecheck backend**

Run: `pnpm --filter api typecheck`
Expected: PASS

- [ ] **Step 7: Commit checkpoint product/compliance/certificate**

```bash
git add apps/api/src/products apps/api/src/compliance apps/api/src/certificates
git commit -m "refactor: remove business code fields from product domains"
```

### Task 5: Regenerate OpenAPI và types frontend

**Files:**
- Modify: `apps/api/openapi.json`
- Modify: `apps/web/src/shared/api/generated/schema.d.ts`

- [ ] **Step 1: Build API và generate OpenAPI**

Run: `pnpm gen:openapi`
Expected: `apps/api/openapi.json` cập nhật theo DTO không còn `code`

- [ ] **Step 2: Generate lại schema cho web**

Run: `pnpm --filter web gen:types`
Expected: `apps/web/src/shared/api/generated/schema.d.ts` không còn `productCode`, `complianceCode`, `roleCode`, `roleCodes`

- [ ] **Step 3: Kiểm tra diff generated types**

```ts
export interface AuthUserDto {
  id: string
  email: string
  fullName: string
  roleId: string | null
  roleName: string | null
}
```

- [ ] **Step 4: Commit checkpoint generated contract**

```bash
git add apps/api/openapi.json apps/web/src/shared/api/generated/schema.d.ts
git commit -m "refactor: regenerate contracts without code identifiers"
```

### Task 6: Refactor types, API client và store phía frontend

**Files:**
- Modify: `apps/web/src/features/auth/auth.types.ts`
- Modify: `apps/web/src/features/auth/auth.store.ts`
- Modify: `apps/web/src/features/admins/admins.types.ts`
- Modify: `apps/web/src/features/admins/admins.api.ts`
- Modify: `apps/web/src/features/admins/admins.store.ts`
- Modify: `apps/web/src/features/managed-users/managed-users.types.ts`
- Modify: `apps/web/src/features/managed-users/managed-users.api.ts`
- Modify: `apps/web/src/features/managed-users/managed-users.store.ts`
- Modify: `apps/web/src/features/core-permissions/core-permissions.types.ts`
- Modify: `apps/web/src/features/core-permissions/core-permissions.api.ts`
- Modify: `apps/web/src/features/core-permissions/core-permissions.store.ts`
- Modify: `apps/web/src/features/licensing-configs/licensing-configs.types.ts`
- Modify: `apps/web/src/features/licensing-configs/licensing-configs.api.ts`
- Modify: `apps/web/src/features/licensing-configs/licensing-configs.store.ts`
- Modify: `apps/web/src/features/products/products.types.ts`
- Modify: `apps/web/src/features/products/products.api.ts`
- Modify: `apps/web/src/features/compliance/compliance.types.ts`
- Modify: `apps/web/src/features/compliance/compliance.api.ts`
- Modify: `apps/web/src/features/certificates/certificates.types.ts`
- Modify: `apps/web/src/features/certificates/certificates.api.ts`

- [ ] **Step 1: Sửa auth types/store để chỉ giữ `roleId` và `roleName`**

```ts
export type AuthUser = {
  id: string
  email: string
  fullName: string
  roleId: string | null
  roleName: string | null
}
```

- [ ] **Step 2: Sửa admin và managed users types**

```ts
export type UserRoleSummary = {
  roleId: string
  roleName: string
}
```

- [ ] **Step 3: Sửa `core-permissions`, `licensing-configs`, `products`, `compliance`, `certificates` types bỏ trường mã**

```ts
export type ProductListItem = {
  id: string
  title: string
  artistName: string | null
  category: string | null
  status: string
  updatedAt: string
}
```

- [ ] **Step 4: Chạy typecheck frontend để bắt chỗ UI còn tham chiếu `code`**

Run: `pnpm --filter web typecheck`
Expected: FAIL ở các page chưa refactor xong, ghi nhận danh sách lỗi còn lại

- [ ] **Step 5: Sửa hết compile errors trong tầng types/store/api**

```ts
const selectedRoleLabel = computed(() => currentUser.value?.roleName ?? 'Chua gan vai tro')
```

- [ ] **Step 6: Chạy lại typecheck frontend**

Run: `pnpm --filter web typecheck`
Expected: lỗi còn lại chỉ nằm ở các page admin đang hiển thị `code`

- [ ] **Step 7: Commit checkpoint types/store**

```bash
git add apps/web/src/features/auth apps/web/src/features/admins apps/web/src/features/managed-users apps/web/src/features/core-permissions apps/web/src/features/licensing-configs apps/web/src/features/products apps/web/src/features/compliance apps/web/src/features/certificates
git commit -m "refactor: update frontend models to remove code identifiers"
```

### Task 7: Refactor toàn bộ admin pages và components để bỏ code khỏi UI

**Files:**
- Modify: `apps/web/src/features/admin-shell/pages/AdminListPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/UserManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CorePermissionSettingsPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/LicensingConfigManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ProductManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/ComplianceManagementPage.vue`
- Modify: `apps/web/src/features/admin-shell/pages/CertificateManagementPage.vue`
- Modify: `apps/web/src/features/products/components/ProductFilterInput.vue`
- Modify: `apps/web/src/features/products/components/ProductListItem.vue`
- Modify: `apps/web/src/features/certificates/components/CertificateListItem.vue`

- [ ] **Step 1: `AdminListPage.vue` và `UserManagementPage.vue` bỏ cột role code**

```vue
<Column header="Vai trò">
  <template #body="{ data }">
    {{ data.roles.map((role) => role.roleName).join(', ') || 'Chua gan vai tro' }}
  </template>
</Column>
```

- [ ] **Step 2: `CorePermissionSettingsPage.vue` bỏ mọi cột và filter theo mã**

```vue
<InputText
  v-model="filters.keyword"
  placeholder="Tim theo ten, mo ta hoac dieu luat"
  class="w-full md:w-80"
/>
```

- [ ] **Step 3: `LicensingConfigManagementPage.vue` bỏ chip `code - name`**

```vue
<div class="font-medium text-slate-950 dark:text-white">
  {{ item.name }}
</div>
<div class="text-sm text-slate-500 dark:text-slate-400">
  {{ item.description || 'Chua co mo ta' }}
</div>
```

- [ ] **Step 4: `ProductManagementPage.vue` và component sản phẩm bỏ `productCode`**

```vue
<div class="text-sm text-slate-500 dark:text-slate-400">
  {{ product.artistName || 'Chua cap nhat nghe si' }} · {{ product.category || 'Chua phan loai' }}
</div>
```

- [ ] **Step 5: `ComplianceManagementPage.vue` bỏ `complianceCode`**

```vue
<InputText
  v-model="filters.keyword"
  placeholder="Tim theo ten tac pham, loai ho so hoac trang thai"
  class="w-full md:w-80"
/>
```

- [ ] **Step 6: `CertificateManagementPage.vue` và `CertificateListItem.vue` bỏ `code` và template code**

```vue
<div class="text-sm text-slate-500 dark:text-slate-400">
  Mau dang hoat dong: {{ template.name }}
</div>
```

- [ ] **Step 7: Chạy typecheck frontend**

Run: `pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 8: Commit checkpoint UI**

```bash
git add apps/web/src/features/admin-shell/pages apps/web/src/features/products/components apps/web/src/features/certificates/components
git commit -m "refactor: remove code identifiers from admin ui"
```

### Task 8: Regression verification toàn stack

**Files:**
- Verify: `apps/api/src/core-permissions/core-permissions.service.spec.ts`
- Verify: `apps/api/src/products/products.service.spec.ts`
- Verify: `apps/web/src/shared/api/generated/schema.d.ts`
- Verify: `docs/superpowers/specs/2026-05-29-remove-code-identifiers-design.md`

- [ ] **Step 1: Chạy test backend trọng điểm**

Run: `pnpm --filter api test -- --runInBand src/core-permissions/core-permissions.service.spec.ts src/products/products.service.spec.ts`
Expected: PASS

- [ ] **Step 2: Chạy typecheck toàn monorepo**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Chạy build toàn monorepo**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Kiểm tra diagnostics cho các file vừa sửa**

Run tool: `GetDiagnostics`
Expected: không có lỗi TypeScript hoặc Vue mới ở các file đã chạm

- [ ] **Step 5: Kiểm tra không còn tham chiếu field mã trong code app**

Run: `rg "roleCode|roleCodes|productCode|complianceCode|legacy_code|product_code|certificate_templates\\.code|core_permissions\\.code" apps/api apps/web`
Expected: không còn match trong source chính, chỉ còn nếu có trong tài liệu cũ đã biết

- [ ] **Step 6: Commit hoàn tất**

```bash
git add apps/api apps/web docs/superpowers/plans/2026-05-29-remove-code-identifiers.md
git commit -m "refactor: remove synthetic code identifiers across stack"
```
