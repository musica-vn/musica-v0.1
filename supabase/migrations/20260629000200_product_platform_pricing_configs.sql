begin;

create table if not exists public.product_platform_pricing_configs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform_key text not null,
  digital_right_config_id uuid references public.digital_right_configs(id) on delete set null,
  pricing_mode text not null default 'GLOBAL',
  custom_price_multiplier numeric(12,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint chk_product_platform_pricing_configs_platform
    check (platform_key in ('YOUTUBE')),
  constraint chk_product_platform_pricing_configs_mode
    check (pricing_mode in ('GLOBAL', 'CUSTOM')),
  constraint chk_product_platform_pricing_configs_custom_price
    check (
      custom_price_multiplier is null
      or custom_price_multiplier > 0
    )
);

drop trigger if exists trg_product_platform_pricing_configs_set_updated_at on public.product_platform_pricing_configs;
create trigger trg_product_platform_pricing_configs_set_updated_at
before update on public.product_platform_pricing_configs
for each row execute function public.set_updated_at();

create unique index if not exists idx_product_platform_pricing_configs_unique
on public.product_platform_pricing_configs(product_id, platform_key);

create index if not exists idx_product_platform_pricing_configs_product_id
on public.product_platform_pricing_configs(product_id);

create index if not exists idx_product_platform_pricing_configs_config_id
on public.product_platform_pricing_configs(digital_right_config_id);

commit;
