import type {
  OrderDetailDto,
  OrderListItemDto,
  OrderPaidSuccessEventDto,
} from './orders.dto';

type BuyerObjectSource = {
  id: string;
  email: string;
  full_name: string;
};

type BuyerSource = BuyerObjectSource | BuyerObjectSource[] | null;

type ItemSource = {
  product_id: string;
  product_title_snapshot: string;
  unit_price: number | string;
  quantity: number;
  line_total_amount: number | string;
};

type PaymentSource = {
  provider: string;
  transaction_id: string | null;
  status: 'SUCCEEDED' | 'FAILED';
  amount: number | string;
  paid_at: string | null;
  created_at?: string;
};

export type OrderListRow = {
  id: string;
  order_number: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  currency: string;
  total_amount: number | string;
  paid_at: string | null;
  created_at: string;
  buyer: BuyerSource;
};

export type OrderDetailRow = {
  id: string;
  order_number: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  currency: string;
  subtotal_amount: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  paid_at: string | null;
  created_at: string;
  buyer: BuyerSource;
  items: ItemSource[] | null;
  payments: PaymentSource[] | null;
};

const toNumber = (value: number | string): number => Number(value);

const normalizeBuyer = (buyer: BuyerSource): BuyerObjectSource | null => {
  if (Array.isArray(buyer)) {
    return buyer[0] ?? null;
  }

  return buyer;
};

const requireBuyer = (buyer: BuyerSource) => {
  const normalizedBuyer = normalizeBuyer(buyer);

  if (!normalizedBuyer) {
    throw new Error('ORDER_BUYER_REQUIRED');
  }

  return {
    id: normalizedBuyer.id,
    email: normalizedBuyer.email,
    fullName: normalizedBuyer.full_name,
  };
};

const resolveLatestPayment = (payments: PaymentSource[] | null) => {
  const items = payments ?? [];
  if (items.length === 0) return null;

  return [...items].sort((left, right) => {
    const leftValue = left.paid_at ?? left.created_at ?? '';
    const rightValue = right.paid_at ?? right.created_at ?? '';
    return rightValue.localeCompare(leftValue);
  })[0];
};

export const mapOrderRowToListItem = (row: OrderListRow): OrderListItemDto => ({
  id: row.id,
  orderNumber: row.order_number,
  status: row.status,
  currency: row.currency,
  totalAmount: toNumber(row.total_amount),
  paidAt: row.paid_at,
  createdAt: row.created_at,
  buyer: requireBuyer(row.buyer),
});

export const mapOrderRowToDetail = (row: OrderDetailRow): OrderDetailDto => {
  const payment = resolveLatestPayment(row.payments);

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    currency: row.currency,
    amounts: {
      subtotalAmount: toNumber(row.subtotal_amount),
      discountAmount: toNumber(row.discount_amount),
      taxAmount: toNumber(row.tax_amount),
      totalAmount: toNumber(row.total_amount),
    },
    buyer: requireBuyer(row.buyer),
    items: (row.items ?? []).map((item) => ({
      productId: item.product_id,
      title: item.product_title_snapshot,
      unitPrice: toNumber(item.unit_price),
      quantity: item.quantity,
      lineTotalAmount: toNumber(item.line_total_amount),
    })),
    payment: payment
      ? {
          provider: payment.provider,
          transactionId: payment.transaction_id,
          status: payment.status,
          amount: toNumber(payment.amount),
          paidAt: payment.paid_at,
        }
      : null,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
};

export const buildOrderPaidSuccessEvent = (
  detail: OrderDetailDto,
  occurredAt = detail.paidAt ?? new Date().toISOString(),
): OrderPaidSuccessEventDto => ({
  eventName: 'order.paid.success',
  eventVersion: 1,
  occurredAt,
  order: {
    id: detail.id,
    orderNumber: detail.orderNumber,
    status: detail.status,
    currency: detail.currency,
    amounts: detail.amounts,
    paidAt: detail.paidAt,
    createdAt: detail.createdAt,
  },
  buyer: detail.buyer,
  items: detail.items,
  payment: detail.payment,
});
