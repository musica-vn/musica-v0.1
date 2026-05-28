begin;

alter table public.tracks
  add column if not exists description text;

alter table public.tracks
  drop column if exists preview_audio_key;

commit;
