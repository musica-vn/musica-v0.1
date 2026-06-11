import {
  buildOrderPaidSuccessEvent,
  mapOrderRowToDetail,
  mapOrderRowToListItem,
  type OrderDetailRow,
  type OrderListRow,
} from './orders.mapper';

describe('orders.mapper', () => {
  it('maps order list row to list item dto', () => {
    const row: OrderListRow = {
      id: '00000000-0000-0000-0000-000000000001',
      order_number: 'ORD-20260611-0001',
      status: 'PAID',
      currency: 'VND',
      total_amount: '1000000',
      paid_at: '2026-06-11T10:00:00.000Z',
      created_at: '2026-06-11T09:55:00.000Z',
      buyer: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'buyer@example.com',
        full_name: 'Nguyen Van A',
      },
    };

    expect(mapOrderRowToListItem(row)).toEqual({
      id: '00000000-0000-0000-0000-000000000001',
      orderNumber: 'ORD-20260611-0001',
      status: 'PAID',
      currency: 'VND',
      totalAmount: 1000000,
      paidAt: '2026-06-11T10:00:00.000Z',
      createdAt: '2026-06-11T09:55:00.000Z',
      buyer: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'buyer@example.com',
        fullName: 'Nguyen Van A',
      },
    });
  });

  it('maps detail row and builds paid success event payload', () => {
    const row: OrderDetailRow = {
      id: '00000000-0000-0000-0000-000000000001',
      order_number: 'ORD-20260611-0001',
      status: 'PAID',
      currency: 'VND',
      subtotal_amount: '1000000',
      discount_amount: '0',
      tax_amount: '0',
      total_amount: '1000000',
      paid_at: '2026-06-11T10:00:00.000Z',
      created_at: '2026-06-11T09:55:00.000Z',
      buyer: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'buyer@example.com',
        full_name: 'Nguyen Van A',
      },
      items: [
        {
          product_id: '00000000-0000-0000-0000-000000000003',
          product_title_snapshot: 'License A',
          unit_price: '1000000',
          quantity: 1,
          line_total_amount: '1000000',
        },
      ],
      payments: [
        {
          provider: 'MANUAL',
          transaction_id: 'TXN-001',
          status: 'SUCCEEDED',
          amount: '1000000',
          paid_at: '2026-06-11T10:00:00.000Z',
          created_at: '2026-06-11T10:00:00.000Z',
        },
      ],
    };

    const detail = mapOrderRowToDetail(row);

    expect(detail.items).toHaveLength(1);
    expect(detail.payment?.provider).toBe('MANUAL');

    expect(buildOrderPaidSuccessEvent(detail)).toEqual({
      eventName: 'order.paid.success',
      eventVersion: 1,
      occurredAt: '2026-06-11T10:00:00.000Z',
      order: {
        id: '00000000-0000-0000-0000-000000000001',
        orderNumber: 'ORD-20260611-0001',
        status: 'PAID',
        currency: 'VND',
        amounts: {
          subtotalAmount: 1000000,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 1000000,
        },
        paidAt: '2026-06-11T10:00:00.000Z',
        createdAt: '2026-06-11T09:55:00.000Z',
      },
      buyer: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'buyer@example.com',
        fullName: 'Nguyen Van A',
      },
      items: [
        {
          productId: '00000000-0000-0000-0000-000000000003',
          title: 'License A',
          unitPrice: 1000000,
          quantity: 1,
          lineTotalAmount: 1000000,
        },
      ],
      payment: {
        provider: 'MANUAL',
        transactionId: 'TXN-001',
        status: 'SUCCEEDED',
        amount: 1000000,
        paidAt: '2026-06-11T10:00:00.000Z',
      },
    });
  });
});
