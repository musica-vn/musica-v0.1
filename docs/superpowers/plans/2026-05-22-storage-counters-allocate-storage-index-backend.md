# Storage Counters + allocate_storage_index RPC + Track Upload Key Generation (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm Supabase migration cho `public.storage_counters` + RPC `allocate_storage_index`, cập nhật TracksService để sinh key `N.mp3` ở root bucket bằng RPC và chỉ update đúng cột DB, kèm unit tests và seed không còn hardcode `test.mp3`.

**Architecture:** Dùng một counter theo từng bucket trong Postgres để cấp phát index tăng dần atomically qua một RPC. Backend gọi RPC để lấy `n`, tạo key `${n}.mp3`, tạo signed upload URL cho đúng bucket, và update đúng cột `tracks.original_audio_key` hoặc `tracks.preview_audio_key`.

**Tech Stack:** Supabase Postgres migrations (SQL), NestJS (TypeScript), Supabase JS v2, Jest (unit tests).

---

## File/Module Map

**Files (DB)**
- Create: `apps/api/supabase/migrations/20260522xxxxxx_storage_counters_allocate_index.sql`
- Modify: `apps/api/supabase/migrations/supabase-seed-mvp.sql`

**Files (Backend)**
- Modify: `apps/api/src/tracks/tracks.service.ts`

**Files (Tests)**
- Create: `apps/api/src/tracks/tracks.service.spec.ts`

---

### Task 1: Supabase migration cho `storage_counters` + RPC `allocate_storage_index`

**Files:**
- Create: `apps/api/supabase/migrations/20260522xxxxxx_storage_counters_allocate_index.sql`

- [ ] **Step 1: Tạo migration file**

Tạo file `apps/api/supabase/migrations/20260522xxxxxx_storage_counters_allocate_index.sql` với nội dung:

```sql
create table if not exists public.storage_counters (
  bucket text primary key,
  last_index int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_storage_counters_set_updated_at on public.storage_counters;
create trigger trg_storage_counters_set_updated_at
before update on public.storage_counters
for each row execute function public.set_updated_at();

create or replace function public.allocate_storage_index(p_bucket text)
returns int
language plpgsql
as $$
declare
  v_next int;
begin
  insert into public.storage_counters (bucket, last_index)
  values (p_bucket, 1)
  on conflict (bucket) do update
    set last_index = public.storage_counters.last_index + 1,
        updated_at = now()
  returning last_index into v_next;

  return v_next;
end;
$$;

insert into public.storage_counters (bucket, last_index)
values
  ('original-audio', 0),
  ('preview-audio', 0)
on conflict (bucket) do nothing;
```

- [ ] **Step 2: Verify migration chạy được trên local Supabase**

Run (tại `apps/api`):

```bash
npm run db:start
npm run db:push
```

Expected: apply migration thành công, không lỗi SQL.

- [ ] **Step 3: Verify RPC behavior (manual SQL)**

Run (qua Supabase SQL editor / `psql`):

```sql
select public.allocate_storage_index('original-audio') as original_1;
select public.allocate_storage_index('original-audio') as original_2;
select public.allocate_storage_index('preview-audio') as preview_1;
select public.allocate_storage_index('preview-audio') as preview_2;
```

Expected:
- `original_2 = original_1 + 1`
- `preview_2 = preview_1 + 1`
- `original_*` độc lập với `preview_*`

---

### Task 2: Seed không còn hardcode `test.mp3`

**Files:**
- Modify: `apps/api/supabase/migrations/supabase-seed-mvp.sql`

- [ ] **Step 1: Update phần insert tracks**

Trong CTE `inserted_tracks`, bỏ gán cứng:

```sql
original_audio_key,
preview_audio_key,
...
'test.mp3',
'test.mp3',
```

Thay bằng:
- bỏ luôn 2 columns này khỏi danh sách insert (để chúng là `NULL`)

- [ ] **Step 2: Verify seed vẫn chạy**

Run (tại `apps/api`):

```bash
npm run seed:dev
```

Expected: seed chạy ok; trong `public.products`, `original_audio_key` và `preview_audio_key` của seed tracks là `NULL`.

---

### Task 3: TracksService - gọi RPC để sinh key `N.mp3`, update đúng column

**Files:**
- Modify: `apps/api/src/tracks/tracks.service.ts`

- [ ] **Step 1: Thêm helper `allocateNextStorageKey(bucket: string)`**

Thêm method private trong `TracksService`:

```ts
private async allocateNextStorageKey(bucket: string): Promise<string> {
  const { data, error } = await this.supabaseService.client.rpc(
    'allocate_storage_index',
    { p_bucket: bucket },
  );

  if (error) {
    throw new HttpException(
      error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  if (typeof data !== 'number') {
    throw new HttpException(
      'Invalid allocate_storage_index response',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return `${data}.mp3`;
}
```

- [ ] **Step 2: Update `createOriginalUploadUrl(trackId)`**

Đổi:
- `fileKey = TEST_AUDIO_KEY` → `fileKey = await this.allocateNextStorageKey(bucket)`
- DB update: chỉ update `original_audio_key`

Snippet:

```ts
const fileKey = await this.allocateNextStorageKey(bucket);
...
update({ original_audio_key: fileKey })
```

- [ ] **Step 3: Update `createPreviewUploadUrl(trackId)`**

Đổi:
- `fileKey = TEST_AUDIO_KEY` → `fileKey = await this.allocateNextStorageKey(bucket)`
- DB update: chỉ update `preview_audio_key`

Snippet:

```ts
const fileKey = await this.allocateNextStorageKey(bucket);
...
update({ preview_audio_key: fileKey })
```

- [ ] **Step 4: Remove `TEST_AUDIO_KEY` constant**

Xóa `const TEST_AUDIO_KEY = 'test.mp3';` vì không còn dùng.

- [ ] **Step 5: Verify typecheck**

Run (tại `apps/api`):

```bash
npm run typecheck
```

Expected: PASS.

---

### Task 4: Unit tests cho TracksService upload URL behavior

**Files:**
- Create: `apps/api/src/tracks/tracks.service.spec.ts`

- [ ] **Step 1: Write failing unit tests**

Tạo tests (mock Supabase client & ConfigService) để cover:
- original upload:
  - gọi `rpc('allocate_storage_index', { p_bucket: 'original-audio' })`
  - key trả về `${n}.mp3`
  - gọi `storage.from(bucket).createSignedUploadUrl(fileKey)`
  - update DB chỉ `{ original_audio_key: fileKey }`
- preview upload:
  - gọi `rpc('allocate_storage_index', { p_bucket: 'preview-audio' })`
  - update DB chỉ `{ preview_audio_key: fileKey }`

Code skeleton:

```ts
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TracksService } from './tracks.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('TracksService - upload URLs', () => {
  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const mockSupabaseClient = {
    rpc: jest.fn(),
    storage: { from: jest.fn() },
    from: jest.fn(),
  };

  const mockSupabaseService = {
    client: mockSupabaseClient,
  } as unknown as SupabaseService;

  const createService = () =>
    new TracksService(mockSupabaseService, mockConfigService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createOriginalUploadUrl allocates N.mp3 and updates only original_audio_key', async () => {
    const service = createService();
    const trackId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getTrackById').mockResolvedValue({
      id: trackId,
      title: 't',
      artistId: '00000000-0000-0000-0000-000000000002',
      authorName: null,
      genre: null,
      duration: null,
      status: 'HIDDEN',
      usageRights: [],
      originalAudioKey: null,
      previewAudioKey: null,
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockConfigService.get = jest.fn().mockReturnValue('original-audio');

    mockSupabaseClient.rpc.mockResolvedValue({ data: 7, error: null });

    const createSignedUploadUrl = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUploadUrl });

    const eq = jest.fn().mockResolvedValue({ error: null });
    mockSupabaseClient.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq }) });

    const result = await service.createOriginalUploadUrl(trackId);

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('allocate_storage_index', { p_bucket: 'original-audio' });
    expect(createSignedUploadUrl).toHaveBeenCalledWith('7.mp3');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '7.mp3' });
  });

  it('createPreviewUploadUrl allocates N.mp3 and updates only preview_audio_key', async () => {
    // tương tự test trên nhưng bucket = preview-audio, rpc trả data khác
  });

  it('throws 500 when allocate_storage_index returns error', async () => {
    const service = createService();
    const trackId = '00000000-0000-0000-0000-000000000001';
    jest.spyOn(service, 'getTrackById').mockResolvedValue({} as any);
    mockConfigService.get = jest.fn().mockReturnValue('original-audio');
    mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: { message: 'rpc fail' } });

    await expect(service.createOriginalUploadUrl(trackId)).rejects.toBeInstanceOf(HttpException);
  });
});
```

- [ ] **Step 2: Run unit tests**

Run (tại `apps/api`):

```bash
npm test
```

Expected: PASS.

---

## Self-Review Checklist

- [ ] Migration tạo `storage_counters` + trigger + RPC hoạt động atomically (single upsert statement).
- [ ] RPC tăng độc lập theo bucket.
- [ ] Upload URL endpoints sinh key `N.mp3` ở root bucket.
- [ ] DB update: original chỉ update `original_audio_key`, preview chỉ update `preview_audio_key`.
- [ ] Seed không còn `test.mp3`.
- [ ] Jest tests cover success + error path.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-storage-counters-allocate-storage-index-backend.md`. Two execution options:

1. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
2. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks

Bạn muốn chọn cách nào?

