begin;

do $$
begin
  if to_regclass('public.tracks') is not null and to_regclass('public.products') is null then
    alter table public.tracks rename to products;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'tracks_product_code_unique'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      rename constraint tracks_product_code_unique to products_product_code_unique;
  end if;
exception when undefined_table then null;
end $$;

do $$
begin
  if to_regclass('public.idx_tracks_status') is not null and to_regclass('public.idx_products_status') is null then
    alter index public.idx_tracks_status rename to idx_products_status;
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if to_regclass('public.idx_tracks_artist_id') is not null and to_regclass('public.idx_products_artist_id') is null then
    alter index public.idx_tracks_artist_id rename to idx_products_artist_id;
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if to_regclass('public.idx_tracks_created_by') is not null and to_regclass('public.idx_products_created_by') is null then
    alter index public.idx_tracks_created_by rename to idx_products_created_by;
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if to_regclass('public.idx_tracks_product_code') is not null and to_regclass('public.idx_products_product_code') is null then
    alter index public.idx_tracks_product_code rename to idx_products_product_code;
  end if;
exception when undefined_object then null;
end $$;

commit;
