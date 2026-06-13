begin;

create table if not exists public.platform_default_pricing_template_permissions (
  template_id uuid not null references public.platform_default_pricing_templates(id) on delete cascade,
  core_permission_id uuid not null references public.core_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, core_permission_id)
);

commit;
