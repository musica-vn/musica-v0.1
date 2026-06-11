import { HttpException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../../database/supabase.service';
import { OrdersService } from './orders.service';

const createMockSupabaseClient = () => {
  const from = jest.fn();

  const buildListQuery = (result: {
    data: any;
    error: any;
    count: number | null;
  }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue(result),
  });

  const buildMaybeSingleQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  });

  const buildUpdateQuery = (result: { error: any }) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(result),
    }),
  });

  const buildInsertQuery = (result: { error: any }) => ({
    insert: jest.fn().mockResolvedValue(result),
  });

  return {
    from,
    buildListQuery,
    buildMaybeSingleQuery,
    buildUpdateQuery,
    buildInsertQuery,
  };
};

describe('OrdersService', () => {
  const createService = (
    mockClient: any,
    mockEmitter?: Partial<EventEmitter2>,
  ) => {
    const mockSupabaseService: Pick<SupabaseService, 'client'> = {
      client: mockClient,
    };

    return new OrdersService(
      mockSupabaseService as any,
      {
        emit: jest.fn(),
        ...mockEmitter,
      } as EventEmitter2,
    );
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists orders with pagination meta', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildListQuery({
          data: [
            {
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
            },
          ],
          error: null,
          count: 1,
        });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);
    const result = await service.listOrders({
      page: 1,
      pageSize: 20,
    });

    expect(result.data.items).toHaveLength(1);
    expect(result.meta?.pagination.totalItems).toBe(1);
    expect(result.data.items[0].orderNumber).toBe('ORD-20260611-0001');
  });

  it('gets order detail with items and latest payment', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
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
          },
          error: null,
        });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);
    const result = await service.getOrderById(
      '00000000-0000-0000-0000-000000000001',
    );

    expect(result.items).toHaveLength(1);
    expect(result.payment?.transactionId).toBe('TXN-001');
  });

  it('marks order paid and emits event once', async () => {
    const mock = createMockSupabaseClient();
    const emit = jest.fn();
    let ordersCallCount = 0;

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const updateQuery = mock.buildUpdateQuery({ error: null });
        ordersCallCount += 1;

        return {
          select: jest.fn().mockReturnValue(
            ordersCallCount === 1
              ? mock.buildMaybeSingleQuery({
                  data: {
                    id: '00000000-0000-0000-0000-000000000001',
                    status: 'PENDING_PAYMENT',
                    total_amount: '1000000',
                  },
                  error: null,
                })
              : mock.buildMaybeSingleQuery({
                  data: {
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
                  },
                  error: null,
                }),
          ),
          update: updateQuery.update,
        };
      }

      if (table === 'order_payments') {
        return mock.buildInsertQuery({ error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any, { emit });
    const result = await service.markOrderPaid(
      '00000000-0000-0000-0000-000000000001',
      {
        provider: 'MANUAL',
        transactionId: 'TXN-001',
        paidAt: '2026-06-11T10:00:00.000Z',
      },
    );

    expect(result.status).toBe('PAID');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'order.paid.success',
      expect.objectContaining({
        eventName: 'order.paid.success',
        order: expect.objectContaining({
          orderNumber: 'ORD-20260611-0001',
          status: 'PAID',
        }),
      }),
    );
  });

  it('does not emit duplicate event when order is already paid', async () => {
    const mock = createMockSupabaseClient();
    const emit = jest.fn();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
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
            items: [],
            payments: [],
          },
          error: null,
        });
      }

      if (table === 'order_payments') {
        return mock.buildInsertQuery({ error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any, { emit });
    const result = await service.markOrderPaid(
      '00000000-0000-0000-0000-000000000001',
      {
        provider: 'MANUAL',
      },
    );

    expect(result.status).toBe('PAID');
    expect(emit).not.toHaveBeenCalled();
  });

  it('throws conflict when marking a cancelled order as paid', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            status: 'CANCELLED',
            total_amount: '1000000',
          },
          error: null,
        });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);

    await expect(
      service.markOrderPaid('00000000-0000-0000-0000-000000000001', {
        provider: 'MANUAL',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
