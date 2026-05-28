begin;

drop index if exists public.idx_tracks_usage_rights_gin;

alter table public.tracks
  drop column if exists usage_rights;

commit;
