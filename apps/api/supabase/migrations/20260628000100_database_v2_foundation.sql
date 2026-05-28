begin;

do $$ begin
  create type public.config_status as enum ('ACTIVE', 'INACTIVE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.digital_platform as enum ('YOUTUBE', 'TIKTOK', 'FACEBOOK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.digital_duration_type as enum ('ONE_YEAR', 'PERPETUAL');
exception when duplicate_object then null; end $$;

create sequence if not exists public.core_permission_code_seq;
create sequence if not exists public.digital_right_config_code_seq;
create sequence if not exists public.physical_right_config_code_seq;
create sequence if not exists public.expression_config_code_seq;
create sequence if not exists public.modification_config_code_seq;

create or replace function public.allocate_next_core_permission_code()
returns text
language sql
as $$
  select 'PERM-' || lpad(nextval('public.core_permission_code_seq')::text, 6, '0');
$$;

create or replace function public.allocate_next_digital_right_config_code()
returns text
language sql
as $$
  select 'DIGI-' || lpad(nextval('public.digital_right_config_code_seq')::text, 6, '0');
$$;

create or replace function public.allocate_next_physical_right_config_code()
returns text
language sql
as $$
  select 'PHYS-' || lpad(nextval('public.physical_right_config_code_seq')::text, 6, '0');
$$;

create or replace function public.allocate_next_expression_config_code()
returns text
language sql
as $$
  select 'EXPR-' || lpad(nextval('public.expression_config_code_seq')::text, 6, '0');
$$;

create or replace function public.allocate_next_modification_config_code()
returns text
language sql
as $$
  select 'MOD-' || lpad(nextval('public.modification_config_code_seq')::text, 6, '0');
$$;

alter table public.core_permissions
  add column if not exists code text;

update public.core_permissions
set code = upper(legacy_code)
where (code is null or btrim(code) = '')
  and legacy_code is not null
  and btrim(legacy_code) <> '';

update public.core_permissions
set code = public.allocate_next_core_permission_code()
where code is null or btrim(code) = '';

update public.core_permissions
set code = upper(code)
where code <> upper(code);

alter table public.core_permissions
  alter column code set not null;

create unique index if not exists idx_core_permissions_code
on public.core_permissions(code);

create table if not exists public.digital_right_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  target_platform public.digital_platform not null,
  duration_type public.digital_duration_type not null,
  base_price_multiplier numeric(12,2) not null check (base_price_multiplier >= 1),
  status public.config_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_digital_right_configs_set_updated_at on public.digital_right_configs;
create trigger trg_digital_right_configs_set_updated_at
before update on public.digital_right_configs
for each row execute function public.set_updated_at();

create index if not exists idx_digital_right_configs_status
on public.digital_right_configs(status);

create table if not exists public.digital_right_config_permissions (
  digital_right_config_id uuid not null references public.digital_right_configs(id) on delete cascade,
  core_permission_id uuid not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (digital_right_config_id, core_permission_id)
);

create index if not exists idx_digital_right_config_permissions_core_permission_id
on public.digital_right_config_permissions(core_permission_id);

create table if not exists public.physical_right_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  venue_usage_type text not null,
  base_price_multiplier numeric(12,2) not null check (base_price_multiplier >= 1),
  status public.config_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_physical_right_configs_set_updated_at on public.physical_right_configs;
create trigger trg_physical_right_configs_set_updated_at
before update on public.physical_right_configs
for each row execute function public.set_updated_at();

create index if not exists idx_physical_right_configs_status
on public.physical_right_configs(status);

create table if not exists public.physical_right_config_permissions (
  physical_right_config_id uuid not null references public.physical_right_configs(id) on delete cascade,
  core_permission_id uuid not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (physical_right_config_id, core_permission_id)
);

create index if not exists idx_physical_right_config_permissions_core_permission_id
on public.physical_right_config_permissions(core_permission_id);

create table if not exists public.expression_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_multiplier numeric(12,2) not null check (price_multiplier >= 1),
  status public.config_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_expression_configs_set_updated_at on public.expression_configs;
create trigger trg_expression_configs_set_updated_at
before update on public.expression_configs
for each row execute function public.set_updated_at();

create index if not exists idx_expression_configs_status
on public.expression_configs(status);

create table if not exists public.expression_config_permissions (
  expression_config_id uuid not null references public.expression_configs(id) on delete cascade,
  core_permission_id uuid not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (expression_config_id, core_permission_id)
);

create index if not exists idx_expression_config_permissions_core_permission_id
on public.expression_config_permissions(core_permission_id);

create table if not exists public.modification_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_multiplier numeric(12,2) not null check (price_multiplier >= 1),
  status public.config_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_modification_configs_set_updated_at on public.modification_configs;
create trigger trg_modification_configs_set_updated_at
before update on public.modification_configs
for each row execute function public.set_updated_at();

create index if not exists idx_modification_configs_status
on public.modification_configs(status);

create table if not exists public.modification_config_permissions (
  modification_config_id uuid not null references public.modification_configs(id) on delete cascade,
  core_permission_id uuid not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (modification_config_id, core_permission_id)
);

create index if not exists idx_modification_config_permissions_core_permission_id
on public.modification_config_permissions(core_permission_id);

create table if not exists public.compliance_legal_files (
  id uuid primary key default gen_random_uuid(),
  compliance_review_id uuid not null references public.compliance_reviews(id) on delete cascade,
  file_name text not null,
  file_key text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_compliance_legal_files_compliance_review_id
on public.compliance_legal_files(compliance_review_id);

insert into public.compliance_legal_files (
  compliance_review_id,
  file_name,
  file_key,
  mime_type,
  file_size_bytes,
  uploaded_at
)
select
  cr.id,
  coalesce(nullif(file_item->>'fileName', ''), nullif(file_item->>'file_name', ''), 'file'),
  coalesce(nullif(file_item->>'fileKey', ''), nullif(file_item->>'file_key', '')),
  coalesce(nullif(file_item->>'mimeType', ''), nullif(file_item->>'mime_type', ''), 'application/octet-stream'),
  case
    when coalesce(nullif(file_item->>'size', ''), nullif(file_item->>'file_size_bytes', '')) ~ '^[0-9]+$'
      then greatest(coalesce(nullif(file_item->>'size', ''), nullif(file_item->>'file_size_bytes', ''))::bigint, 1)
    else 1
  end,
  coalesce(
    nullif(file_item->>'uploadedAt', '')::timestamptz,
    nullif(file_item->>'uploaded_at', '')::timestamptz,
    cr.updated_at,
    cr.created_at,
    now()
  )
from public.compliance_reviews cr
cross join lateral jsonb_array_elements(coalesce(cr.uploaded_legal_files, '[]'::jsonb)) as file_item
where coalesce(nullif(file_item->>'fileKey', ''), nullif(file_item->>'file_key', '')) is not null
  and not exists (
    select 1
    from public.compliance_legal_files clf
    where clf.file_key = coalesce(nullif(file_item->>'fileKey', ''), nullif(file_item->>'file_key', ''))
  );

commit;
