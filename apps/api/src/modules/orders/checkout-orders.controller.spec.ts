import { CheckoutOrdersController } from './checkout-orders.controller';
import { OrdersService } from './orders.service';

describe('CheckoutOrdersController', () => {
  let controller: CheckoutOrdersController;
  const mockOrdersService = {
    createCheckoutOrder: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new CheckoutOrdersController(
      mockOrdersService as unknown as OrdersService,
    );
  });

  it('creates checkout order via service', async () => {
    mockOrdersService.createCheckoutOrder.mockResolvedValue({
      orderId: '00000000-0000-0000-0000-000000000100',
      status: 'PENDING_PAYMENT',
      currency: 'VND',
      totalAmount: 1000000,
    });

    const body = {
      productId: '00000000-0000-0000-0000-000000000010',
      platformType: 'DIGITAL',
      subject: 'INDIVIDUAL',
      duration: 'ONE_YEAR',
      scope: 'MULTI_CHANNEL',
      expr: '00000000-0000-0000-0000-000000000030',
      mod: '00000000-0000-0000-0000-000000000040',
    };

    const result = await controller.create(body as any);

    expect(mockOrdersService.createCheckoutOrder).toHaveBeenCalledWith(body);
    expect(result.data.orderId).toBe('00000000-0000-0000-0000-000000000100');
  });
});
