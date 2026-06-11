begin;

create table if not exists public.product_digital_platform_settings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  digital_right_config_id uuid not null references public.digital_right_configs(id) on delete cascade,
  price_multiplier_override numeric(12,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint chk_product_digital_platform_settings_positive_multiplier
    check (price_multiplier_override > 0)
);

drop trigger if exists trg_product_digital_platform_settings_set_updated_at on public.product_digital_platform_settings;
create trigger trg_product_digital_platform_settings_set_updated_at
before update on public.product_digital_platform_settings
for each row execute function public.set_updated_at();

create unique index if not exists idx_product_digital_platform_settings_unique
on public.product_digital_platform_settings(product_id, digital_right_config_id);

create index if not exists idx_product_digital_platform_settings_product_id
on public.product_digital_platform_settings(product_id);

create index if not exists idx_product_digital_platform_settings_config_id
on public.product_digital_platform_settings(digital_right_config_id);

insert into public.product_digital_platform_settings (
  product_id,
  digital_right_config_id,
  price_multiplier_override
)
select
  p.id as product_id,
  drc.id as digital_right_config_id,
  drc.base_price_multiplier as price_multiplier_override
from public.products p
cross join public.digital_right_configs drc
where drc.status = 'ACTIVE'
  and drc.target_platform = 'YOUTUBE'
on conflict (product_id, digital_right_config_id) do nothing;

commit;
