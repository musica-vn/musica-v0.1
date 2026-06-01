begin;

alter table public.products
  add column if not exists sheet_music_pdf_key text;

commit;

