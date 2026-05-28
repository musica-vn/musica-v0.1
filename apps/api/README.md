# Musica API

## Chạy backend local
```bash
pnpm.cmd install
pnpm.cmd dev
```

## Env tối thiểu
```env
PORT=3000
JWT_SECRET=your-secret
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ACCESS_TOKEN=<optional-cli-token>
STORAGE_BUCKET_ORIGINAL_AUDIO=original-audio
STORAGE_BUCKET_PREVIEW_AUDIO=preview-audio
STORAGE_BUCKET_CERTIFICATES=certificates
STORAGE_BUCKET_TRACK_THUMBNAILS=track-thumbnails
```

## Quy trình update DB
### Link Supabase project
```bash
pnpm.cmd exec supabase login
pnpm.cmd exec supabase link --project-ref <SUPABASE_PROJECT_REF>
```

### Tạo migration mới
```bash
pnpm.cmd exec node scripts/supabase.mjs migration new <migration_name>
```

### Push migrations lên remote
```bash
pnpm.cmd db:push
```

### Pull schema từ remote
```bash
pnpm.cmd db:pull
```

### Test local Supabase
```bash
pnpm.cmd db:start
pnpm.cmd db:status
pnpm.cmd db:stop
```

## Sau khi đổi API hoặc DB contract
```bash
pnpm.cmd build
pnpm.cmd gen:openapi
pnpm.cmd typecheck
```

## Ghi chú
- OpenAPI output: `apps/api/openapi.json`
- Migrations: `apps/api/supabase/migrations`
- CLI wrapper: `apps/api/scripts/supabase.mjs`
