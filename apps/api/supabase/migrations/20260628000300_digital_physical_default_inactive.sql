alter table public.digital_right_configs
alter column status set default 'INACTIVE';

alter table public.physical_right_configs
alter column status set default 'INACTIVE';
