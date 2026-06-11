import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  const mockOrdersService = {
    listOrders: jest.fn(),
    getOrderById: jest.fn(),
    markOrderPaid: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new OrdersController(
      mockOrdersService as unknown as OrdersService,
    );
  });

  it('returns paginated order list from service', async () => {
    mockOrdersService.listOrders.mockResolvedValue({
      data: { items: [{ id: '1', orderNumber: 'ORD-1' }] },
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const result = await controller.list({ page: 1, pageSize: 20 });

    expect(mockOrdersService.listOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
    expect(result.data.items).toHaveLength(1);
  });

  it('returns order detail from service', async () => {
    mockOrdersService.getOrderById.mockResolvedValue({
      id: '1',
      orderNumber: 'ORD-1',
    });

    const result = await controller.detail(
      '00000000-0000-0000-0000-000000000001',
    );

    expect(mockOrdersService.getOrderById).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
    );
    expect(result.orderNumber).toBe('ORD-1');
  });

  it('marks order paid via service', async () => {
    mockOrdersService.markOrderPaid.mockResolvedValue({
      id: '1',
      status: 'PAID',
    });

    const body = { provider: 'MANUAL', transactionId: 'TXN-001' };
    const result = await controller.markPaid(
      '00000000-0000-0000-0000-000000000001',
      body,
    );

    expect(mockOrdersService.markOrderPaid).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      body,
    );
    expect(result.status).toBe('PAID');
  });
});
