# Variant Pricing Breakdown Minimize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thu gọn response `breakdown` của `POST /public/variant-pricing/calculate` để chỉ trả `key` và `label`, bỏ `selected`, `multiplier`, `lineTotal` khỏi public API.

**Architecture:** Giữ nguyên business logic tính `totalPrice` trong `VariantPricingService`, chỉ thay đổi shape của `breakdown` tại lớp DTO và dữ liệu trả về. Cập nhật unit test để khóa contract mới và sửa tài liệu API để phản ánh response hiện tại.

**Tech Stack:** NestJS, TypeScript, Jest, Swagger, Markdown

---

## File Structure
- Modify: `apps/api/src/pricing/variant-pricing.dto.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.spec.ts`
- Modify: `docs/api-public-variant-pricing-calculate.md`

### Task 1: Khóa contract mới bằng test

**Files:**
- Modify: `apps/api/src/pricing/variant-pricing.service.spec.ts`

- [ ] **Step 1: Viết assertion thất bại cho breakdown tối giản**

```ts
expect(result.breakdown).toEqual([
  { key: 'BASE_PRICE', label: 'Gia co ban ban quyen' },
  { key: 'PLATFORM_BASE_MULTIPLIER', label: 'Nen tang so' },
  { key: 'SUBJECT_INDIVIDUAL', label: 'Doi tuong' },
  {
    key: 'PLATFORM_MODIFIER_SUBJECT_INDIVIDUAL',
    label: 'Yeu to phu thuoc (goi nen tang)',
  },
  { key: 'DIGITAL_TOTAL_RATE', label: 'Dieu chinh nen tang so (10%)' },
])
```

- [ ] **Step 2: Chạy test để xác nhận đang fail**

Run:

```bash
pnpm --dir apps/api test -- variant-pricing.service.spec.ts --runInBand
```

Expected: FAIL vì `breakdown` hiện tại còn `selected`, `multiplier`, `lineTotal`

### Task 2: Sửa DTO và service theo contract mới

**Files:**
- Modify: `apps/api/src/pricing/variant-pricing.dto.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.ts`

- [ ] **Step 1: Thu gọn DTO breakdown**

```ts
export class VariantPricingBreakdownLineDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;
}
```

- [ ] **Step 2: Thu gọn object push trong service**

```ts
breakdown.push({
  key: 'BASE_PRICE',
  label: 'Gia co ban ban quyen',
});
```

```ts
breakdown.push({
  key: 'PLATFORM_BASE_MULTIPLIER',
  label: platformType === 'DIGITAL' ? 'Nen tang so' : 'Nen tang vat ly',
});
```

```ts
breakdown.push({
  key: `PLATFORM_MODIFIER_${key}`,
  label: 'Yeu to phu thuoc (goi nen tang)',
});
```

- [ ] **Step 3: Giữ nguyên phép tính `currentTotal`**

```ts
currentTotal *= multiplier;
```

Expected: chỉ đổi shape của `breakdown`, không đổi `totalPrice`

### Task 3: Chạy test và rà diagnostics

**Files:**
- Modify: `apps/api/src/pricing/variant-pricing.service.spec.ts`
- Modify: `apps/api/src/pricing/variant-pricing.dto.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.ts`

- [ ] **Step 1: Chạy lại test pricing**

Run:

```bash
pnpm --dir apps/api test -- variant-pricing.service.spec.ts --runInBand
```

Expected: PASS

- [ ] **Step 2: Chạy typecheck**

Run:

```bash
pnpm --dir apps/api typecheck
```

Expected: PASS

- [ ] **Step 3: Rà diagnostics cho file vừa sửa**

Check:
- `apps/api/src/pricing/variant-pricing.dto.ts`
- `apps/api/src/pricing/variant-pricing.service.ts`
- `apps/api/src/pricing/variant-pricing.service.spec.ts`

### Task 4: Cập nhật tài liệu API

**Files:**
- Modify: `docs/api-public-variant-pricing-calculate.md`

- [ ] **Step 1: Sửa schema breakdown trong docs**

```md
### `VariantPricingBreakdownLine`
| Field | Type | Mo ta |
|---|---|---|
| `key` | `string` | Ma dinh danh dong breakdown |
| `label` | `string` | Nhan hien thi |
```

- [ ] **Step 2: Xóa mô tả `selected`, `multiplier`, `lineTotal` khỏi docs**

```md
- Public API khong tra chi tiet tinh toan noi bo nhu `selected`, `multiplier`, `lineTotal`.
```

- [ ] **Step 3: Cập nhật ví dụ response**

```json
{
  "key": "PLATFORM_MODIFIER_SUBJECT_INDIVIDUAL",
  "label": "Yeu to phu thuoc (goi nen tang)"
}
```

### Task 5: Hoàn tất thay đổi

**Files:**
- Modify: `apps/api/src/pricing/variant-pricing.dto.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.ts`
- Modify: `apps/api/src/pricing/variant-pricing.service.spec.ts`
- Modify: `docs/api-public-variant-pricing-calculate.md`

- [ ] **Step 1: Kiểm tra diff**

Run:

```bash
git diff -- apps/api/src/pricing/variant-pricing.dto.ts apps/api/src/pricing/variant-pricing.service.ts apps/api/src/pricing/variant-pricing.service.spec.ts docs/api-public-variant-pricing-calculate.md
```

Expected: chỉ có thay đổi contract `breakdown` và docs liên quan

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/pricing/variant-pricing.dto.ts apps/api/src/pricing/variant-pricing.service.ts apps/api/src/pricing/variant-pricing.service.spec.ts docs/api-public-variant-pricing-calculate.md
git commit -m "refactor: minimize variant pricing breakdown response"
```
