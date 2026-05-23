begin;

update public.tracks
set usage_rights = array(
  select distinct
    case usage_right
      when 'SOCIAL_USE' then 'REPRODUCTION_RIGHT'
      when 'ADS_USE' then 'COMMUNICATION_TO_PUBLIC_RIGHT'
      when 'YOUTUBE_USE' then 'DISTRIBUTION_RIGHT'
      when 'EVENT_USE' then 'DERIVATIVE_WORK_RIGHT'
      when 'COMMERCIAL_USE' then 'DISTRIBUTION_RIGHT'
      else usage_right
    end
  from unnest(coalesce(usage_rights, array[]::text[])) as usage_right
)
where usage_rights && array[
  'SOCIAL_USE',
  'ADS_USE',
  'YOUTUBE_USE',
  'EVENT_USE',
  'COMMERCIAL_USE'
]::text[];

update public.certificates
set selected_usage_rights = array(
  select distinct
    case usage_right
      when 'SOCIAL_USE' then 'REPRODUCTION_RIGHT'
      when 'ADS_USE' then 'COMMUNICATION_TO_PUBLIC_RIGHT'
      when 'YOUTUBE_USE' then 'DISTRIBUTION_RIGHT'
      when 'EVENT_USE' then 'DERIVATIVE_WORK_RIGHT'
      when 'COMMERCIAL_USE' then 'DISTRIBUTION_RIGHT'
      else usage_right
    end
  from unnest(coalesce(selected_usage_rights, array[]::text[])) as usage_right
)
where selected_usage_rights && array[
  'SOCIAL_USE',
  'ADS_USE',
  'YOUTUBE_USE',
  'EVENT_USE',
  'COMMERCIAL_USE'
]::text[];

commit;
