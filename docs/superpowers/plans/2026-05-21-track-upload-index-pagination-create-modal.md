# Track Upload Index + Pagination + Create Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload mp3 vào root bucket với key dạng index tăng dần (tách counter theo bucket), cố định pagination 10 items/page, bỏ cột Details, và Create modal auto-read duration.

**Architecture:** DB cung cấp RPC atomic để cấp phát index theo bucket. API gọi RPC để sinh `{n}.mp3` rồi cấp signed upload URL. FE chỉ hiển thị và upload theo URL nhận được.

**Tech Stack:** NestJS + Supabase JS (RPC, Storage signed URLs) + Vue 3 + PrimeVue + wavesurfer.js

---

## File Structure

**Backend**
- Create: `apps/api/supabase/migrations/2026xxxxxx_storage_counters.sql`
- Modify: `apps/api/src/tracks/tracks.service.ts`
- Modify: `apps/api/src/tracks/admin-tracks.dto.ts`
- Modify (optional, recommended): `apps/api/scripts/seed-dev.mjs`
- Modify (optional, recommended): `apps/api/supabase/migrations/supabase-seed-mvp.sql`
- Test: `apps/api/src/tracks/tracks.service.spec.ts`

**Frontend**
- Modify: `apps/web/src/views/admin/TrackManagementPage.vue`
- Modify: `apps/web/src/features/tracks/components/TrackWavePreview.vue`

---

### Task 1: Add DB counter + RPC allocator

**Files:**
- Create: `apps/api/supabase/migrations/2026xxxxxx_storage_counters.sql`

- [ ] **Step 1: Create migration SQL**

Create file `apps/api/supabase/migrations/2026xxxxxx_storage_counters.sql`:

```sql
begin;

create table if not exists public.storage_counters (
  bucket text primary key,
  last_index int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.allocate_storage_index(p_bucket text)
returns int
language plpgsql
as $$
declare
  new_index int;
begin
  insert into public.storage_counters (bucket, last_index)
  values (p_bucket, 0)
  on conflict (bucket) do nothing;

  update public.storage_counters
  set
    last_index = last_index + 1,
    updated_at = now()
  where bucket = p_bucket
  returning last_index into new_index;

  return new_index;
end;
$$;

insert into public.storage_counters (bucket, last_index)
values
  ('original-audio', 0),
  ('preview-audio', 0)
on conflict (bucket) do nothing;

commit;
```

- [ ] **Step 2: Apply migration on Supabase remote**

Run SQL trong Supabase Dashboard → SQL Editor (copy toàn bộ nội dung file migration) và execute.

- [ ] **Step 3: Verify allocator increments independently**

Trong SQL Editor chạy:

```sql
select public.allocate_storage_index('original-audio') as original_1;
select public.allocate_storage_index('original-audio') as original_2;
select public.allocate_storage_index('preview-audio') as preview_1;
select public.allocate_storage_index('preview-audio') as preview_2;
```

Expected:
- `original_2 = original_1 + 1`
- `preview_2 = preview_1 + 1`
- `original_*` không ảnh hưởng `preview_*`

---

### Task 2: Update API upload endpoints to use allocator

**Files:**
- Modify: `apps/api/src/tracks/tracks.service.ts`
- Test: `apps/api/src/tracks/tracks.service.spec.ts`

- [ ] **Step 1: Write failing unit test skeleton**

Create `apps/api/src/tracks/tracks.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { TracksService } from './tracks.service';

describe('TracksService - upload keys', () => {
  const makeService = () => {
    const supabaseClient = {
      rpc: jest.fn(),
      from: jest.fn(),
      storage: { from: jest.fn() },
    };

    const supabaseService = { client: supabaseClient } as any;
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
        if (key === 'STORAGE_BUCKET_PREVIEW_AUDIO') return 'preview-audio';
        return undefined;
      }),
    } as unknown as ConfigService;

    return { service: new TracksService(supabaseService, configService), supabaseClient };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates original upload url with key N.mp3 and updates only original_audio_key', async () => {
    const { service, supabaseClient } = makeService();

    supabaseClient.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 't1' }, error: null }),
        }),
      }),
    });

    supabaseClient.rpc.mockResolvedValue({ data: 12, error: null });

    const storageFrom = { createSignedUploadUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'u' }, error: null }) };
    supabaseClient.storage.from.mockReturnValue(storageFrom);

    const updateBuilder = { eq: jest.fn().mockResolvedValue({ error: null }) };
    supabaseClient.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 't1' }, error: null }),
        }),
      }),
    })).mockImplementationOnce(() => ({ update: () => updateBuilder }));

    const result = await service.createOriginalUploadUrl('t1');

    expect(result.fileKey).toBe('12.mp3');
    expect(supabaseClient.rpc).toHaveBeenCalledWith('allocate_storage_index', { p_bucket: 'original-audio' });
    expect(storageFrom.createSignedUploadUrl).toHaveBeenCalledWith('12.mp3');
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 't1');
  });
});
```

- [ ] **Step 2: Run unit tests to see failure**

Run: `pnpm --filter api test`
Expected: FAIL vì `TracksService` chưa gọi `rpc` / chưa trả key đúng.

- [ ] **Step 3: Implement allocator helper + update endpoints**

In `apps/api/src/tracks/tracks.service.ts`:
- Remove hard-coded `TEST_AUDIO_KEY` usage
- Add helper:

```ts
  private async allocateNextStorageKey(bucket: string): Promise<string> {
    const { data, error } = await this.supabaseService.client.rpc(
      'allocate_storage_index',
      { p_bucket: bucket },
    );

    if (error || typeof data !== 'number' || !Number.isFinite(data) || data <= 0) {
      throw new HttpException(
        error?.message ?? 'Failed to allocate storage index',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return `${Math.trunc(data)}.mp3`;
  }
```

- Update `createOriginalUploadUrl(trackId)`:
  - `fileKey = await this.allocateNextStorageKey(bucket)`
  - DB update payload: `{ original_audio_key: fileKey }`
- Update `createPreviewUploadUrl(trackId)`:
  - `fileKey = await this.allocateNextStorageKey(bucket)`
  - DB update payload: `{ preview_audio_key: fileKey }`

- [ ] **Step 4: Run unit tests**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 5: Add 2nd test for preview bucket**

Add test case verifying:
- `rpc` called với `preview-audio`
- DB update payload only touches `preview_audio_key`

---

### Task 3: Force pagination to 10 on tracks list

**Files:**
- Modify: `apps/api/src/tracks/admin-tracks.dto.ts`
- Modify: `apps/web/src/views/admin/TrackManagementPage.vue`

- [ ] **Step 1: Backend enforce max 10 (tracks only)**

In `AdminTracksListQueryDto` (file above), override `pageSize`:

```ts
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

@Transform(({ value }) => (value === undefined ? 10 : Number(value)))
@IsInt()
@Min(1)
@Max(10)
declare pageSize: number;
```

- [ ] **Step 2: Frontend set `pagination.pageSize = 10`**

In `TrackManagementPage.vue`, set default:

```ts
const pagination = reactive({ page: 1, pageSize: 10 })
```

Ensure DataTable uses `:rows="pagination.pageSize"` and keeps `@page` handler.

- [ ] **Step 3: Verify**

Manual: load `/admin/tracks` and confirm only 10 rows displayed per page.

---

### Task 4: Remove Details column on list

**Files:**
- Modify: `apps/web/src/views/admin/TrackManagementPage.vue`

- [ ] **Step 1: Remove `Column header="Details"`**

Delete the entire Details column template.

- [ ] **Step 2: Ensure duration still visible**

Keep duration as right label of waveform using `TrackWavePreview :right-label="formatDuration(data.duration)"`.

- [ ] **Step 3: Verify**

Manual: table has 3 columns: Track, Status, Actions.

---

### Task 5: Update Create modal UX (duration derived from MP3)

**Files:**
- Modify: `apps/web/src/views/admin/TrackManagementPage.vue`

- [ ] **Step 1: Remove duration input**

Remove `Duration (seconds)` InputText from Create modal.

- [ ] **Step 2: Show readonly duration badge/field**

After selecting original mp3:
- reuse existing `readAudioDurationFromFile(file)` to compute seconds
- store into `createForm.duration` (string seconds) to send to BE
- show a readonly UI element (e.g. small pill) displaying `formatDuration(Number(createForm.duration))`.

- [ ] **Step 3: Restructure layout + icons**

Split Create modal content into:
- Section `Metadata` (icon: `pi pi-align-left`)
- Section `Audio` (icon: `pi pi-volume-up`)

Keep:
- title, artistId, authorName, genre, usage rights
- original mp3 (required), preview mp3 (optional)
- duration displayed readonly after original file chosen

- [ ] **Step 4: Validate create without duration is blocked**

Ensure `validateTrackForm` still enforces:
- requireOriginalFile
- duration must be present (readable from file)

---

### Task 6: Optional seed alignment (recommended)

**Files:**
- Modify: `apps/api/scripts/seed-dev.mjs`
- Modify: `apps/api/supabase/migrations/supabase-seed-mvp.sql`

- [ ] **Step 1: Set seeded tracks audio keys to NULL**

So admin can upload and generate `N.mp3` naturally.

- [ ] **Step 2: Rerun seed script**

Run: `pnpm --filter api seed:dev`

---

### Task 7: End-to-end verification

**Files:**
- None

- [ ] **Step 1: Run API build**

Run: `pnpm --filter api build`
Expected: exit 0

- [ ] **Step 2: Run API tests**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 3: Manual upload verification**

From UI:
- Upload original twice on 2 different tracks
  - verify `fileKey` increments in `original-audio` (`1.mp3`, `2.mp3`, ...)
- Upload preview twice
  - verify `fileKey` increments in `preview-audio` independently

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-track-upload-index-pagination-create-modal.md`. Two execution options:

1. Subagent-Driven (recommended) — REQUIRED SUB-SKILL: superpowers:subagent-driven-development
2. Inline Execution — REQUIRED SUB-SKILL: superpowers:executing-plans

Which approach?

