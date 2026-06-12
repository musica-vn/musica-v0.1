begin;

do $$
begin
  alter type public.order_payment_status add value 'PENDING';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.order_payment_status add value 'VOIDED';
exception
  when duplicate_object then null;
end $$;

alter table public.order_payments
  add column if not exists invoice_number text,
  add column if not exists provider_order_id text,
  add column if not exists provider_transaction_id text;

create unique index if not exists idx_order_payments_invoice_number
on public.order_payments(invoice_number)
where invoice_number is not null;

commit;
