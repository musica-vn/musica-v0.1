# Ke hoach Database V2

## 1. Muc tieu

Database V2 can dat duoc 3 muc tieu:

- Mo rong day du domain theo dac ta admin management system.
- Giu nguyen tech stack hien tai: `Supabase/Postgres + SQL migrations + NestJS + Vue`.
- Giam blast radius voi codebase dang chay bang cach giu `tracks` la bang product core, nhung chuan hoa lai cac bang cau hinh va compliance.

## 2. Hien trang

Codebase hien da co nen tang cho mot phan V2:

- `tracks` dong vai tro product core.
- `core_permissions` da ton tai.
- `compliance_reviews` va `compliance_approved_permissions` da ton tai.
- `track_allowed_permissions` da ton tai.
- `core_permissions` da duoc chuyen tu business key sang `uuid` PK trong migration `20260627000200_core_permissions_uuid.sql`.

Phan chua day du:

- Chua co schema rieng cho `digital rights`, `physical rights`, `expression`, `modification`.
- `uploaded_legal_files` dang la `jsonb`, phu hop MVP nhung khong tot cho truy van, audit va file lifecycle.
- Naming dang pha tron giua `id`, `legacy_code`, `product_code`, `code`.

## 3. Nguyen tac thiet ke

- Moi bang nghiep vu dung `uuid` lam primary key ky thuat.
- Moi thuc the can mot `code` business rieng de hien thi tren UI va de doi chieu theo spec.
- Moi quan he many-to-many duoc tach bang mapping co FK that su, khong luu array ID trong cot nghiep vu chinh.
- `status` dung `enum` cho cac tap gia tri dong, nhung business rule phai dat o service layer va constraint khi can.
- Migration V2 phai additive truoc, backfill sau, xoa bo schema cu o phase cuoi.

## 4. Bang va quan he

### 4.1 Core permissions

`core_permissions`

- `id uuid primary key`
- `code text not null unique`
- `name text not null`
- `law_reference text not null`
- `description text`
- `status core_permission_status not null default 'ACTIVE'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 4.2 Digital platform rights

`digital_right_configs`

- `id uuid primary key`
- `code text not null unique`
- `target_platform digital_platform not null`
- `duration_type digital_duration_type not null`
- `base_price_multiplier numeric(12,2) not null check (base_price_multiplier >= 1)`
- `status config_status not null default 'ACTIVE'`
- timestamps

`digital_right_config_permissions`

- `digital_right_config_id uuid not null references digital_right_configs(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (digital_right_config_id, core_permission_id)`

### 4.3 Physical usage rights

`physical_right_configs`

- `id uuid primary key`
- `code text not null unique`
- `venue_usage_type text not null`
- `base_price_multiplier numeric(12,2) not null check (base_price_multiplier >= 1)`
- `status config_status not null default 'ACTIVE'`
- timestamps

`physical_right_config_permissions`

- `physical_right_config_id uuid not null references physical_right_configs(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (physical_right_config_id, core_permission_id)`

### 4.4 Expression configs

`expression_configs`

- `id uuid primary key`
- `code text not null unique`
- `name text not null`
- `price_multiplier numeric(12,2) not null check (price_multiplier >= 1)`
- `status config_status not null default 'ACTIVE'`
- timestamps

`expression_config_permissions`

- `expression_config_id uuid not null references expression_configs(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (expression_config_id, core_permission_id)`

### 4.5 Modification configs

`modification_configs`

- `id uuid primary key`
- `code text not null unique`
- `name text not null`
- `price_multiplier numeric(12,2) not null check (price_multiplier >= 1)`
- `status config_status not null default 'ACTIVE'`
- timestamps

`modification_config_permissions`

- `modification_config_id uuid not null references modification_configs(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (modification_config_id, core_permission_id)`

### 4.6 Product core

Tiep tuc dung `tracks` lam product core trong V2.

`tracks`

- `id uuid primary key`
- `product_code text not null unique`
- `artist_id uuid not null references users(id) on delete restrict`
- `title text not null`
- `thumbnail_key text`
- `genre text`
- `use_case text`
- `duration integer check (duration is null or duration > 0)`
- `original_audio_key text`
- `status track_status not null default 'PENDING'`
- `created_by uuid not null references users(id) on delete restrict`
- timestamps

`track_allowed_permissions`

- `track_id uuid not null references tracks(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (track_id, core_permission_id)`

### 4.7 Compliance and legal

`compliance_reviews`

- `id uuid primary key`
- `code text not null unique`
- `track_id uuid not null unique references tracks(id) on delete cascade`
- `legal_status compliance_legal_status not null default 'PENDING'`
- `review_status compliance_review_status not null default 'PENDING'`
- `reject_reason text`
- `reviewed_by uuid references users(id) on delete set null`
- `reviewed_at timestamptz`
- timestamps

`compliance_legal_files`

- `id uuid primary key`
- `compliance_review_id uuid not null references compliance_reviews(id) on delete cascade`
- `file_name text not null`
- `file_key text not null unique`
- `mime_type text not null`
- `file_size_bytes bigint not null check (file_size_bytes > 0)`
- `uploaded_by uuid references users(id) on delete set null`
- `uploaded_at timestamptz not null default now()`

`compliance_approved_permissions`

- `compliance_review_id uuid not null references compliance_reviews(id) on delete cascade`
- `core_permission_id uuid not null references core_permissions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `primary key (compliance_review_id, core_permission_id)`

## 5. Enum de xuat

- `core_permission_status`: `ACTIVE`, `INACTIVE`
- `config_status`: `ACTIVE`, `INACTIVE`
- `digital_platform`: `YOUTUBE`, `TIKTOK`, `FACEBOOK`
- `digital_duration_type`: `ONE_YEAR`, `PERPETUAL`
- `track_status`: `PENDING`, `PUBLISHED`, `HIDDEN`
- `compliance_legal_status`: `PENDING`, `SUFFICIENT`, `INSUFFICIENT`
- `compliance_review_status`: `PENDING`, `APPROVED`, `REJECTED`

## 6. Business rules bat buoc

### 6.1 Core permission integrity

- Khong cho `INACTIVE` hoac xoa `core_permissions` neu dang duoc tham chieu boi:
  - `digital_right_config_permissions`
  - `physical_right_config_permissions`
  - `expression_config_permissions`
  - `modification_config_permissions`
  - `track_allowed_permissions`
  - `compliance_approved_permissions`
- Tat ca man hinh chon permission chi duoc lay cac ban ghi `ACTIVE`.

### 6.2 Product publishing

- Track moi tao luon o trang thai `PENDING`.
- Khong cho publish neu chua co thumbnail.
- Khong cho publish neu `track_allowed_permissions` rong.
- Khong cho publish neu compliance chua dat `SUFFICIENT + APPROVED`.

### 6.3 Compliance sync

- Khi reviewer submit `SUFFICIENT + APPROVED`, he thong dong bo danh sach permission da duyet sang `track_allowed_permissions`.
- Khong auto publish track sau khi approve compliance.
- Neu reviewer chon `INSUFFICIENT` hoac `REJECTED`, `reject_reason` la bat buoc.

## 7. Luong hoat dong

### 7.1 Core permission flow

1. Admin tao hoac sua core permission.
2. He thong validate `code` unique, status hop le.
3. Khi admin doi sang `INACTIVE` hoac xoa, backend scan dependency.
4. Neu co tham chieu, tra loi `CORE_PERMISSION_IN_USE`.

### 7.2 Digital/Physical/Expression/Modification flow

1. Admin tao config.
2. Admin gan nhieu core permissions dang `ACTIVE`.
3. Pricing engine va checkout se doc tung config table theo luong nghiep vu.
4. Config `INACTIVE` bi an khoi giao dien buyer va cac luong chon tiep theo.

### 7.3 Product flow

1. Admin/Creator tao track metadata.
2. He thong sinh `product_code`.
3. He thong tao san ban ghi `compliance_reviews` 1-1.
4. Track duoc luu o `PENDING`.

### 7.4 Compliance flow

1. Admin upload legal files vao storage.
2. Metadata file duoc luu vao `compliance_legal_files`.
3. Reviewer danh gia legal status, review status va approved permissions.
4. Neu approve thanh cong, backend sync permission sang product.

### 7.5 Publish flow

1. Admin bam publish.
2. Backend validate thumbnail, allowed permissions va compliance state.
3. Neu hop le, chuyen `tracks.status = PUBLISHED`.
4. Neu khong hop le, tra error code ro rang de FE render.

## 8. Migration strategy

### Phase A - Foundation

- Tao enums moi.
- Tao bang moi cho digital, physical, expression, modification.
- Tao `compliance_legal_files`.
- Dam bao `core_permissions` co `code` business field ro rang, khong phu thuoc ten tam `legacy_code`.

### Phase B - Backfill

- Backfill `core_permissions.code` tu `legacy_code`.
- Tach `uploaded_legal_files jsonb` sang `compliance_legal_files`.
- Chuan hoa ten cot `permission_id` thanh `core_permission_id` trong mapping tables moi neu can.

### Phase C - Application refactor

- Refactor NestJS modules:
  - `core-permissions`
  - `digital-rights`
  - `physical-rights`
  - `expression-configs`
  - `modification-configs`
  - `tracks`
  - `compliance`
- Regenerate OpenAPI va FE types.

### Phase D - Decommission

- Xoa bo cot `uploaded_legal_files` sau khi da migrate thanh cong.
- Xoa alias tam, ten cu va compatibility code khong con can thiet.

## 9. API impact

- Endpoint list van phai tra `meta.pagination`.
- Tiep tuc dung UUID trong path params de tranh break contract.
- `code` business duoc tra ve cho UI de hien thi va search.
- FE chi unwrap theo envelope cua `@musica/contracts`.

## 10. Verification

### DB

- Tao moi tung loai config va gan core permissions.
- Thu `INACTIVE` mot core permission dang duoc map, ky vong bi chan.
- Approve compliance va verify `track_allowed_permissions` duoc dong bo.

### Backend

- E2E cho dependency blocking.
- E2E cho upload/download legal files.
- E2E cho publish guard.

### Frontend

- Smoke test dashboard core permissions, compliance, products.
- Verify filter/search theo `code` va `title`.
- Verify thong diep loi nghiep vu map dung theo `error.code`.
