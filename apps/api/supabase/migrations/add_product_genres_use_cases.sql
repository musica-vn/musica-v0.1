begin;

alter table public.products
  add column if not exists genres text[] not null default '{}'::text[],
  add column if not exists use_cases text[] not null default '{}'::text[];

update public.products
set
  genres = case
    when (genres is null or array_length(genres, 1) is null) and genre is not null and length(trim(genre)) > 0
      then array[genre]
    when genres is null
      then '{}'::text[]
    else genres
  end,
  use_cases = case
    when (use_cases is null or array_length(use_cases, 1) is null) and use_case is not null and length(trim(use_case)) > 0
      then array[use_case]
    when use_cases is null
      then '{}'::text[]
    else use_cases
  end;

commit;

