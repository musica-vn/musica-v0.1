begin;

do $$ begin
  alter table public.track_allowed_permissions drop constraint if exists track_allowed_permissions_permission_id_fkey;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.compliance_approved_permissions drop constraint if exists compliance_approved_permissions_permission_id_fkey;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.core_permissions drop constraint if exists core_permissions_pkey;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.core_permissions alter column id drop default;
exception when undefined_column then null; end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'core_permissions'
      and column_name = 'id'
      and udt_name <> 'uuid'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'core_permissions'
      and column_name = 'legacy_code'
  ) then
    alter table public.core_permissions rename column id to legacy_code;
  end if;
end $$;

alter table public.core_permissions
  add column if not exists id uuid default gen_random_uuid();

update public.core_permissions
set id = gen_random_uuid()
where id is null;

alter table public.core_permissions
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'core_permissions_pkey'
      and conrelid = 'public.core_permissions'::regclass
  ) then
    alter table public.core_permissions
      add constraint core_permissions_pkey primary key (id);
  end if;
end $$;

alter table public.core_permissions
  alter column legacy_code drop not null;

alter table public.track_allowed_permissions
  add column if not exists permission_uuid uuid;

update public.track_allowed_permissions tap
set permission_uuid = cp.id
from public.core_permissions cp
where tap.permission_uuid is null
  and (
    tap.permission_id::text = cp.legacy_code
    or tap.permission_id::text = cp.id::text
  );

alter table public.compliance_approved_permissions
  add column if not exists permission_uuid uuid;

update public.compliance_approved_permissions cap
set permission_uuid = cp.id
from public.core_permissions cp
where cap.permission_uuid is null
  and (
    cap.permission_id::text = cp.legacy_code
    or cap.permission_id::text = cp.id::text
  );

alter table public.track_allowed_permissions
  drop column if exists permission_id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'track_allowed_permissions'
      and column_name = 'permission_uuid'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'track_allowed_permissions'
      and column_name = 'permission_id'
  ) then
    alter table public.track_allowed_permissions
      rename column permission_uuid to permission_id;
  end if;
end $$;

alter table public.compliance_approved_permissions
  drop column if exists permission_id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'compliance_approved_permissions'
      and column_name = 'permission_uuid'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'compliance_approved_permissions'
      and column_name = 'permission_id'
  ) then
    alter table public.compliance_approved_permissions
      rename column permission_uuid to permission_id;
  end if;
end $$;

alter table public.track_allowed_permissions
  alter column permission_id set not null;

alter table public.compliance_approved_permissions
  alter column permission_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'track_allowed_permissions_permission_id_fkey'
      and conrelid = 'public.track_allowed_permissions'::regclass
  ) then
    alter table public.track_allowed_permissions
      add constraint track_allowed_permissions_permission_id_fkey
      foreign key (permission_id) references public.core_permissions(id) on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'compliance_approved_permissions_permission_id_fkey'
      and conrelid = 'public.compliance_approved_permissions'::regclass
  ) then
    alter table public.compliance_approved_permissions
      add constraint compliance_approved_permissions_permission_id_fkey
      foreign key (permission_id) references public.core_permissions(id) on delete restrict;
  end if;
end $$;

create index if not exists idx_track_allowed_permissions_permission_id
on public.track_allowed_permissions(permission_id);

create index if not exists idx_compliance_approved_permissions_permission_id
on public.compliance_approved_permissions(permission_id);

commit;
