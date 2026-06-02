begin;

create table if not exists public.digital_right_config_price_modifiers (
  id uuid primary key default gen_random_uuid(),
  digital_right_config_id uuid not null references public.digital_right_configs(id) on delete cascade,
  modifier_key text not null,
  multiplier numeric(12,2) not null check (multiplier >= 1),
  created_at timestamptz not null default now(),
  unique (digital_right_config_id, modifier_key)
);

create index if not exists idx_digital_right_config_price_modifiers_config_id
on public.digital_right_config_price_modifiers(digital_right_config_id);

create table if not exists public.physical_right_config_price_modifiers (
  id uuid primary key default gen_random_uuid(),
  physical_right_config_id uuid not null references public.physical_right_configs(id) on delete cascade,
  modifier_key text not null,
  multiplier numeric(12,2) not null check (multiplier >= 1),
  created_at timestamptz not null default now(),
  unique (physical_right_config_id, modifier_key)
);

create index if not exists idx_physical_right_config_price_modifiers_config_id
on public.physical_right_config_price_modifiers(physical_right_config_id);

commit;

