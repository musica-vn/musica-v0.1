begin;

create table if not exists public.product_priorities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  priority_score integer not null default 0 check (priority_score >= 0),
  is_trigger boolean not null default false,
  effective_start timestamptz,
  effective_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_priorities_effective_range_check check (
    effective_start is null
    or effective_end is null
    or effective_end > effective_start
  )
);

create unique index if not exists idx_product_priorities_product_id
on public.product_priorities(product_id);

create index if not exists idx_product_priorities_trigger_score
on public.product_priorities(is_trigger, priority_score desc);

drop trigger if exists trg_product_priorities_set_updated_at on public.product_priorities;
create trigger trg_product_priorities_set_updated_at
before update on public.product_priorities
for each row execute function public.set_updated_at();

insert into public.product_priorities (product_id, priority_score, is_trigger, effective_start, effective_end)
select
  p.id,
  (100 - (row_number() over (order by p.updated_at desc)) * 5)::int as priority_score,
  true,
  null,
  null
from public.products p
where p.status = 'PUBLISHED'
order by p.updated_at desc
limit 5
on conflict (product_id) do update
set
  priority_score = excluded.priority_score,
  is_trigger = excluded.is_trigger,
  effective_start = excluded.effective_start,
  effective_end = excluded.effective_end;

commit;
