begin;

do $$ begin
  alter type public.track_status add value if not exists 'PENDING';
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.core_permission_status as enum ('ACTIVE', 'INACTIVE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compliance_legal_status as enum ('PENDING', 'SUFFICIENT', 'INSUFFICIENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compliance_review_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

create sequence if not exists public.product_code_seq;
create sequence if not exists public.compliance_code_seq;

create or replace function public.allocate_next_product_code()
returns text
language sql
as $$
  select 'PROD-' || lpad(nextval('public.product_code_seq')::text, 6, '0');
$$;

create or replace function public.allocate_next_compliance_code()
returns text
language sql
as $$
  select 'CMP-' || lpad(nextval('public.compliance_code_seq')::text, 6, '0');
$$;

alter table public.tracks
  add column if not exists product_code text,
  add column if not exists use_case text;

update public.tracks
set product_code = 'PROD-' || lpad(nextval('public.product_code_seq')::text, 6, '0')
where product_code is null;

alter table public.tracks
  alter column product_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracks_product_code_unique'
      and conrelid = 'public.tracks'::regclass
  ) then
    alter table public.tracks add constraint tracks_product_code_unique unique (product_code);
  end if;
end $$;

create table if not exists public.core_permissions (
  id text primary key,
  name text not null,
  law_reference text not null,
  status public.core_permission_status not null default 'ACTIVE',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_core_permissions_set_updated_at on public.core_permissions;
create trigger trg_core_permissions_set_updated_at
before update on public.core_permissions
for each row execute function public.set_updated_at();

create index if not exists idx_core_permissions_status on public.core_permissions(status);

create table if not exists public.track_allowed_permissions (
  track_id uuid not null references public.tracks(id) on delete cascade,
  permission_id text not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (track_id, permission_id)
);

create index if not exists idx_track_allowed_permissions_permission_id
on public.track_allowed_permissions(permission_id);

create table if not exists public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  track_id uuid not null unique references public.tracks(id) on delete cascade,
  uploaded_legal_files jsonb not null default '[]'::jsonb,
  legal_status public.compliance_legal_status not null default 'PENDING',
  review_status public.compliance_review_status not null default 'PENDING',
  reject_reason text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_compliance_reviews_set_updated_at on public.compliance_reviews;
create trigger trg_compliance_reviews_set_updated_at
before update on public.compliance_reviews
for each row execute function public.set_updated_at();

create index if not exists idx_compliance_reviews_track_id on public.compliance_reviews(track_id);
create index if not exists idx_compliance_reviews_legal_status on public.compliance_reviews(legal_status);
create index if not exists idx_compliance_reviews_review_status on public.compliance_reviews(review_status);

create table if not exists public.compliance_approved_permissions (
  compliance_id uuid not null references public.compliance_reviews(id) on delete cascade,
  permission_id text not null references public.core_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (compliance_id, permission_id)
);

create index if not exists idx_compliance_approved_permissions_permission_id
on public.compliance_approved_permissions(permission_id);

insert into public.compliance_reviews (code, track_id)
select
  'CMP-' || lpad(nextval('public.compliance_code_seq')::text, 6, '0'),
  t.id
from public.tracks t
left join public.compliance_reviews cr on cr.track_id = t.id
where cr.track_id is null;

commit;
