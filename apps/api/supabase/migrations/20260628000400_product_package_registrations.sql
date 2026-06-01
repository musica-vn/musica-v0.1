begin;

do $$ begin
  create type public.product_package_registration_status as enum ('JOINED', 'REMOVED');
exception when duplicate_object then null; end $$;

create table if not exists public.product_digital_right_registrations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  right_config_id uuid not null references public.digital_right_configs(id) on delete cascade,
  status public.product_package_registration_status not null default 'JOINED',
  joined_at timestamptz not null default now(),
  joined_by uuid references public.users(id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_product_digital_registration_removed_fields
    check (
      (status = 'JOINED' and removed_at is null and removed_by is null)
      or (status = 'REMOVED' and removed_at is not null)
    )
);

drop trigger if exists trg_product_digital_right_registrations_set_updated_at on public.product_digital_right_registrations;
create trigger trg_product_digital_right_registrations_set_updated_at
before update on public.product_digital_right_registrations
for each row execute function public.set_updated_at();

create unique index if not exists idx_product_digital_right_registrations_active
on public.product_digital_right_registrations(product_id, right_config_id)
where status = 'JOINED';

create index if not exists idx_product_digital_right_registrations_product_id
on public.product_digital_right_registrations(product_id);

create index if not exists idx_product_digital_right_registrations_right_config_id
on public.product_digital_right_registrations(right_config_id);

create index if not exists idx_product_digital_right_registrations_status
on public.product_digital_right_registrations(status);

create table if not exists public.product_physical_right_registrations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  right_config_id uuid not null references public.physical_right_configs(id) on delete cascade,
  status public.product_package_registration_status not null default 'JOINED',
  joined_at timestamptz not null default now(),
  joined_by uuid references public.users(id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_product_physical_registration_removed_fields
    check (
      (status = 'JOINED' and removed_at is null and removed_by is null)
      or (status = 'REMOVED' and removed_at is not null)
    )
);

drop trigger if exists trg_product_physical_right_registrations_set_updated_at on public.product_physical_right_registrations;
create trigger trg_product_physical_right_registrations_set_updated_at
before update on public.product_physical_right_registrations
for each row execute function public.set_updated_at();

create unique index if not exists idx_product_physical_right_registrations_active
on public.product_physical_right_registrations(product_id, right_config_id)
where status = 'JOINED';

create index if not exists idx_product_physical_right_registrations_product_id
on public.product_physical_right_registrations(product_id);

create index if not exists idx_product_physical_right_registrations_right_config_id
on public.product_physical_right_registrations(right_config_id);

create index if not exists idx_product_physical_right_registrations_status
on public.product_physical_right_registrations(status);

commit;
