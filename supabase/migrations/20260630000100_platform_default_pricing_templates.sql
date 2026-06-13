begin;

create table if not exists public.platform_default_pricing_templates (
  id uuid primary key default gen_random_uuid(),
  platform_key text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint chk_platform_default_pricing_templates_platform
    check (platform_key in ('YOUTUBE'))
);

create table if not exists public.platform_default_pricing_template_modifiers (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.platform_default_pricing_templates(id) on delete cascade,
  modifier_key text not null,
  multiplier numeric(12,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_platform_default_pricing_template_modifiers_key
    check (
      modifier_key in (
        'SUBJECT_INDIVIDUAL',
        'SUBJECT_ORGANIZATION',
        'DURATION_ONE_YEAR',
        'DURATION_PERPETUAL',
        'SCOPE_SINGLE_CHANNEL',
        'SCOPE_MULTI_CHANNEL',
        'EXPRESSION',
        'MODIFICATION'
      )
    ),
  constraint chk_platform_default_pricing_template_modifiers_multiplier
    check (multiplier >= 1)
);

create unique index if not exists idx_platform_default_pricing_template_modifiers_unique
on public.platform_default_pricing_template_modifiers(template_id, modifier_key);

create table if not exists public.product_platform_pricing_overrides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform_key text not null,
  mode text not null default 'SYSTEM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint chk_product_platform_pricing_overrides_platform
    check (platform_key in ('YOUTUBE')),
  constraint chk_product_platform_pricing_overrides_mode
    check (mode in ('SYSTEM', 'CUSTOM'))
);

create unique index if not exists idx_product_platform_pricing_overrides_unique
on public.product_platform_pricing_overrides(product_id, platform_key);

create table if not exists public.product_platform_pricing_override_modifiers (
  id uuid primary key default gen_random_uuid(),
  override_id uuid not null references public.product_platform_pricing_overrides(id) on delete cascade,
  modifier_key text not null,
  multiplier numeric(12,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_product_platform_pricing_override_modifiers_key
    check (
      modifier_key in (
        'SUBJECT_INDIVIDUAL',
        'SUBJECT_ORGANIZATION',
        'DURATION_ONE_YEAR',
        'DURATION_PERPETUAL',
        'SCOPE_SINGLE_CHANNEL',
        'SCOPE_MULTI_CHANNEL',
        'EXPRESSION',
        'MODIFICATION'
      )
    ),
  constraint chk_product_platform_pricing_override_modifiers_multiplier
    check (multiplier >= 1)
);

create unique index if not exists idx_product_platform_pricing_override_modifiers_unique
on public.product_platform_pricing_override_modifiers(override_id, modifier_key);

drop trigger if exists trg_platform_default_pricing_templates_set_updated_at on public.platform_default_pricing_templates;
create trigger trg_platform_default_pricing_templates_set_updated_at
before update on public.platform_default_pricing_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_platform_default_pricing_template_modifiers_set_updated_at on public.platform_default_pricing_template_modifiers;
create trigger trg_platform_default_pricing_template_modifiers_set_updated_at
before update on public.platform_default_pricing_template_modifiers
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_platform_pricing_overrides_set_updated_at on public.product_platform_pricing_overrides;
create trigger trg_product_platform_pricing_overrides_set_updated_at
before update on public.product_platform_pricing_overrides
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_platform_pricing_override_modifiers_set_updated_at on public.product_platform_pricing_override_modifiers;
create trigger trg_product_platform_pricing_override_modifiers_set_updated_at
before update on public.product_platform_pricing_override_modifiers
for each row execute function public.set_updated_at();

insert into public.platform_default_pricing_templates (platform_key, name)
values ('YOUTUBE', 'YouTube default pricing template')
on conflict (platform_key) do nothing;

with youtube_template as (
  select id
  from public.platform_default_pricing_templates
  where platform_key = 'YOUTUBE'
  limit 1
)
insert into public.platform_default_pricing_template_modifiers (template_id, modifier_key, multiplier)
select youtube_template.id, seeded.modifier_key, seeded.multiplier
from youtube_template
cross join (
  values
    ('SUBJECT_INDIVIDUAL', 1.0000::numeric),
    ('SUBJECT_ORGANIZATION', 2.0000::numeric),
    ('DURATION_ONE_YEAR', 1.0000::numeric),
    ('DURATION_PERPETUAL', 2.0000::numeric),
    ('SCOPE_SINGLE_CHANNEL', 1.0000::numeric),
    ('SCOPE_MULTI_CHANNEL', 2.0000::numeric),
    ('EXPRESSION', 1.0000::numeric),
    ('MODIFICATION', 1.0000::numeric)
) as seeded(modifier_key, multiplier)
on conflict (template_id, modifier_key) do nothing;

commit;
