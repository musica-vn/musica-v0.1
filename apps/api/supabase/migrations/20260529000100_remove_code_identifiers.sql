begin;

drop function if exists public.allocate_next_product_code();
drop function if exists public.allocate_next_compliance_code();
drop function if exists public.allocate_next_core_permission_code();
drop function if exists public.allocate_next_digital_right_config_code();
drop function if exists public.allocate_next_physical_right_config_code();
drop function if exists public.allocate_next_expression_config_code();
drop function if exists public.allocate_next_modification_config_code();

drop sequence if exists public.product_code_seq;
drop sequence if exists public.compliance_code_seq;
drop sequence if exists public.core_permission_code_seq;
drop sequence if exists public.digital_right_config_code_seq;
drop sequence if exists public.physical_right_config_code_seq;
drop sequence if exists public.expression_config_code_seq;
drop sequence if exists public.modification_config_code_seq;

drop index if exists public.idx_core_permissions_code;
drop index if exists public.idx_products_product_code;
drop index if exists public.idx_tracks_product_code;

alter table if exists public.roles
  drop constraint if exists roles_code_key;

alter table if exists public.roles
  drop column if exists code;

alter table if exists public.core_permissions
  drop constraint if exists core_permissions_code_key,
  drop column if exists legacy_code,
  drop column if exists code;

alter table if exists public.digital_right_configs
  drop constraint if exists digital_right_configs_code_key,
  drop column if exists code;

alter table if exists public.physical_right_configs
  drop constraint if exists physical_right_configs_code_key,
  drop column if exists code;

alter table if exists public.expression_configs
  drop constraint if exists expression_configs_code_key,
  drop column if exists code;

alter table if exists public.modification_configs
  drop constraint if exists modification_configs_code_key,
  drop column if exists code;

alter table if exists public.products
  drop constraint if exists products_product_code_unique,
  drop column if exists product_code;

alter table if exists public.tracks
  drop constraint if exists tracks_product_code_unique,
  drop column if exists product_code;

alter table if exists public.compliance_reviews
  drop constraint if exists compliance_reviews_code_key,
  drop column if exists code;

alter table if exists public.certificate_templates
  drop constraint if exists certificate_templates_code_key,
  drop column if exists code;

commit;
