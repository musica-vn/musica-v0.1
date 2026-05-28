begin;

delete from public.certificate_templates
where code = 'DEFAULT';

delete from public.certificates
where buyer_id in (select id from public.users where email like '%@musica.local')
   or artist_id in (select id from public.users where email like '%@musica.local')
   or track_id in (select id from public.tracks where title like '% (Seed)%');

delete from public.tracks
where title like '% (Seed)%'
   or created_by in (select id from public.users where email like '%@musica.local');

delete from public.user_roles
where user_id in (select id from public.users where email like '%@musica.local');

delete from public.users
where email like '%@musica.local';

with seed_users as (
  select *
  from (
    values
      ('superadmin@musica.local', 'Super Admin', 'SUPER_ADMIN'),
      ('admin01@musica.local', 'Admin 01', 'ADMIN'),
      ('admin02@musica.local', 'Admin 02', 'ADMIN'),
      ('artist01@musica.local', 'Artist 01', 'ARTIST'),
      ('artist02@musica.local', 'Artist 02', 'ARTIST'),
      ('artist03@musica.local', 'Artist 03', 'ARTIST'),
      ('buyer01@musica.local', 'Buyer 01', 'BUYER'),
      ('buyer02@musica.local', 'Buyer 02', 'BUYER'),
      ('buyer03@musica.local', 'Buyer 03', 'BUYER'),
      ('buyer04@musica.local', 'Buyer 04', 'BUYER'),
      ('buyer05@musica.local', 'Buyer 05', 'BUYER'),
      ('buyer06@musica.local', 'Buyer 06', 'BUYER'),
      ('buyer07@musica.local', 'Buyer 07', 'BUYER'),
      ('buyer08@musica.local', 'Buyer 08', 'BUYER')
  ) as t(email, full_name, role_code)
),
inserted_users as (
  insert into public.users (email, password_hash, full_name, status)
  select
    u.email,
    crypt('Password123!', gen_salt('bf')),
    u.full_name,
    'ACTIVE'::public.user_status
  from seed_users u
  returning id, email
),
inserted_user_roles as (
  insert into public.user_roles (user_id, role_id)
  select
    iu.id,
    r.id
  from inserted_users iu
  join seed_users su on su.email = iu.email
  join public.roles r on r.code = su.role_code
  returning user_id, role_id
),
admin_picker as (
  select id as admin_id
  from inserted_users
  where email = 'admin01@musica.local'
),
seed_tracks as (
  select *
  from (
    values
      ('Midnight Pulse (Seed)', 'artist01@musica.local', 'Electronic', 182, 'PUBLISHED'),
      ('Neon Skyline (Seed)', 'artist01@musica.local', 'Electronic', 156, 'PUBLISHED'),
      ('Cinematic Rise (Seed)', 'artist02@musica.local', 'Cinematic', 201, 'PUBLISHED'),
      ('Corporate Breeze (Seed)', 'artist02@musica.local', 'Corporate', 128, 'PUBLISHED'),
      ('Pop Spark (Seed)', 'artist03@musica.local', 'Pop', 174, 'PUBLISHED'),
      ('Ambient Drift (Seed)', 'artist03@musica.local', 'Cinematic', 223, 'PUBLISHED'),
      ('Late Night Drive (Seed)', 'artist01@musica.local', 'Electronic', 190, 'PUBLISHED'),
      ('Bright Morning (Seed)', 'artist02@musica.local', 'Pop', 165, 'PUBLISHED'),
      ('Soft Focus (Seed)', 'artist03@musica.local', 'Corporate', 142, 'PUBLISHED'),
      ('Festival Lights (Seed)', 'artist01@musica.local', 'Pop', 198, 'PUBLISHED'),
      ('Hidden Draft 01 (Seed)', 'artist01@musica.local', 'Electronic', 160, 'HIDDEN'),
      ('Hidden Draft 02 (Seed)', 'artist02@musica.local', 'Cinematic', 210, 'HIDDEN'),
      ('Hidden Draft 03 (Seed)', 'artist03@musica.local', 'Corporate', 120, 'HIDDEN'),
      ('Hidden Draft 04 (Seed)', 'artist01@musica.local', 'Pop', 175, 'HIDDEN'),
      ('Hidden Draft 05 (Seed)', 'artist02@musica.local', 'Corporate', 135, 'HIDDEN')
  ) as t(title, artist_email, genre, duration, status)
),
inserted_tracks as (
  insert into public.tracks (
    title,
    artist_id,
    author_name,
    genre,
    duration,
    status,
    created_by
  )
  select
    st.title,
    au.id,
    au.full_name,
    st.genre,
    st.duration,
    st.status::public.track_status,
    ap.admin_id
  from seed_tracks st
  join public.users au on au.email = st.artist_email
  cross join admin_picker ap
  returning id, title, artist_id
),
seed_certificates as (
  select *
  from (
    values
      ('Midnight Pulse (Seed)', 'buyer01@musica.local', array['DERIVATIVE_WORK_RIGHT']::text[], 3),
      ('Neon Skyline (Seed)', 'buyer01@musica.local', array['COMMUNICATION_TO_PUBLIC_RIGHT']::text[], 8),
      ('Cinematic Rise (Seed)', 'buyer02@musica.local', array['DERIVATIVE_WORK_RIGHT']::text[], 6),
      ('Corporate Breeze (Seed)', 'buyer03@musica.local', array['REPRODUCTION_RIGHT']::text[], 10),
      ('Pop Spark (Seed)', 'buyer04@musica.local', array['DISTRIBUTION_RIGHT']::text[], 2),
      ('Ambient Drift (Seed)', 'buyer05@musica.local', array['DERIVATIVE_WORK_RIGHT']::text[], 4),
      ('Late Night Drive (Seed)', 'buyer06@musica.local', array['COMMUNICATION_TO_PUBLIC_RIGHT']::text[], 1),
      ('Bright Morning (Seed)', 'buyer07@musica.local', array['REPRODUCTION_RIGHT','COMMUNICATION_TO_PUBLIC_RIGHT']::text[], 7),
      ('Soft Focus (Seed)', 'buyer08@musica.local', array['DISTRIBUTION_RIGHT']::text[], 12),
      ('Festival Lights (Seed)', 'buyer02@musica.local', array['DERIVATIVE_WORK_RIGHT']::text[], 5)
  ) as t(track_title, buyer_email, selected_usage_rights, days_ago)
)
insert into public.certificates (
  track_id,
  buyer_id,
  artist_id,
  selected_usage_rights,
  track_snapshot_name,
  buyer_snapshot_name,
  artist_snapshot_name,
  pdf_file_key,
  status,
  valid_from,
  created_at
)
select
  it.id,
  bu.id,
  it.artist_id,
  sc.selected_usage_rights,
  it.title,
  bu.full_name,
  au.full_name,
  'certificate-pdfs/' || to_char(now() - (sc.days_ago || ' days')::interval, 'YYYY/MM') || '/' || gen_random_uuid()::text || '.pdf',
  'ACTIVE'::public.certificate_status,
  now() - (sc.days_ago || ' days')::interval,
  now() - (sc.days_ago || ' days')::interval
from seed_certificates sc
join inserted_tracks it on it.title = sc.track_title
join public.users bu on bu.email = sc.buyer_email
join public.users au on au.id = it.artist_id;

insert into public.certificate_templates (code, html_template)
values (
  'DEFAULT',
  '<!doctype html><html><head><meta charset="utf-8" /><title>Certificate</title></head><body><h1>License Certificate</h1><p>Certificate ID: {{certificateId}}</p><p>Track: {{trackSnapshotName}}</p><p>Buyer: {{buyerSnapshotName}}</p><p>Artist: {{artistSnapshotName}}</p><p>Usage Rights: {{selectedUsageRights}}</p><p>Valid From: {{validFrom}}</p><p>Valid Until: {{validUntil}}</p><p>Issued At: {{createdAt}}</p></body></html>'
)
on conflict (code) do update set html_template = excluded.html_template;

commit;
