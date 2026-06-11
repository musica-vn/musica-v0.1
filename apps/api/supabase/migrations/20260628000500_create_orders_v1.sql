begin;

do $$ begin
  create type public.order_status as enum ('PENDING_PAYMENT', 'PAID', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_payment_status as enum ('SUCCEEDED', 'FAILED');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references public.users(id) on delete restrict,
  status public.order_status not null default 'PENDING_PAYMENT',
  currency text not null default 'VND',
  subtotal_amount numeric(12,2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_orders_paid_at_consistency
    check (
      (status = 'PAID' and paid_at is not null)
      or (status <> 'PAID')
    )
);

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index if not exists idx_orders_buyer_id_created_at
on public.orders(buyer_id, created_at desc);

create index if not exists idx_orders_status_created_at
on public.orders(status, created_at desc);

create index if not exists idx_orders_paid_at
on public.orders(paid_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_title_snapshot text not null,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total_amount numeric(12,2) not null default 0 check (line_total_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id
on public.order_items(order_id);

create index if not exists idx_order_items_product_id
on public.order_items(product_id);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  transaction_id text,
  status public.order_payment_status not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_payments_order_id
on public.order_payments(order_id);

create index if not exists idx_order_payments_paid_at
on public.order_payments(paid_at desc);

create unique index if not exists idx_order_payments_provider_transaction_id
on public.order_payments(provider, transaction_id)
where transaction_id is not null;

commit;
