create table if not exists public.storage_counters (
  bucket text primary key,
  last_index int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_storage_counters_set_updated_at on public.storage_counters;
create trigger trg_storage_counters_set_updated_at
before update on public.storage_counters
for each row execute function public.set_updated_at();

create or replace function public.allocate_storage_index(p_bucket text)
returns int
language plpgsql
as $$
declare
  v_next int;
begin
  insert into public.storage_counters (bucket, last_index)
  values (p_bucket, 1)
  on conflict (bucket) do update
    set last_index = public.storage_counters.last_index + 1
  returning last_index into v_next;

  return v_next;
end;
$$;

insert into public.storage_counters (bucket, last_index)
values
  ('original-audio', 0),
  ('preview-audio', 0)
on conflict (bucket) do nothing;

