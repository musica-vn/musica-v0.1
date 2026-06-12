import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { SupabaseService } from '../../database/supabase.service';
import type { OrdersService } from '../orders/orders.service';
import { SepayService } from './sepay.service';

const createMockSupabaseClient = () => {
  const from = jest.fn();

  const buildMaybeSingleQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  });

  const buildInsertQuery = (result: { error: any }) => ({
    insert: jest.fn().mockResolvedValue(result),
  });

  const buildUpdateQuery = (result: { error: any }) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(result),
    }),
  });

  return {
    from,
    buildMaybeSingleQuery,
    buildInsertQuery,
    buildUpdateQuery,
  };
};

describe('SepayService', () => {
  const createService = (
    mockClient: any,
    configOverrides?: Record<string, string | undefined>,
    ordersOverrides?: Partial<OrdersService>,
  ) => {
    const mockConfigService: Pick<ConfigService, 'get'> = {
      get: jest.fn((key: string) =>
        (
          {
            SEPAY_ENVIRONMENT: 'production',
            SEPAY_MERCHANT_ID: 'SP-LIVE-HD886625',
            SEPAY_SECRET_KEY: 'secret-key',
            SEPAY_SUCCESS_URL: 'http://localhost:3000/payments/sepay/success',
            SEPAY_ERROR_URL: 'http://localhost:3000/payments/sepay/error',
            SEPAY_CANCEL_URL: 'http://localhost:3000/payments/sepay/cancel',
            SEPAY_IPN_SECRET_KEY: 'secret-key',
            SEPAY_WEBHOOK_API_KEY: 'webhook-key',
            ...configOverrides,
          } as Record<string, string | undefined>
        )[key]),
    };

    const mockSupabaseService: Pick<SupabaseService, 'client'> = {
      client: mockClient,
    };

    const mockOrdersService = {
      completeExternalPayment: jest.fn(),
      ...ordersOverrides,
    } as unknown as OrdersService;

    return new SepayService(
      mockSupabaseService as SupabaseService,
      mockConfigService as ConfigService,
      mockOrdersService,
    );
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates checkout payload and stores pending SePay payment attempt', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            order_number: 'ORD-20260611-0001',
            status: 'PENDING_PAYMENT',
            currency: 'VND',
            total_amount: '100000',
          },
          error: null,
        });
      }

      if (table === 'order_payments') {
        return mock.buildInsertQuery({ error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);
    const result = await service.createCheckoutSession({
      orderId: '00000000-0000-0000-0000-000000000001',
      paymentMethod: 'BANK_TRANSFER',
    });

    expect(result.actionUrl).toBe('https://pay.sepay.vn/v1/checkout/init');
    expect(result.method).toBe('POST');
    expect(result.fields.payment_method).toBe('BANK_TRANSFER');
    expect(result.fields.order_amount).toBe('100000');
    expect(result.fields.signature).toBeTruthy();
  });

  it('builds auto-submit redirect html that posts directly to SePay', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            order_number: 'ORD-20260611-0001',
            status: 'PENDING_PAYMENT',
            currency: 'VND',
            total_amount: '100000',
          },
          error: null,
        });
      }

      if (table === 'order_payments') {
        return mock.buildInsertQuery({ error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);
    const html = await service.buildCheckoutRedirectHtml({
      orderId: '00000000-0000-0000-0000-000000000001',
      paymentMethod: 'BANK_TRANSFER',
    });

    expect(html).toContain('<form');
    expect(html).toContain('https://pay.sepay.vn/v1/checkout/init');
    expect(html).toContain('document.forms[0].submit()');
  });

  it('rejects IPN when secret key is invalid', async () => {
    const service = createService(createMockSupabaseClient() as any);

    await expect(
      service.handleIpn('wrong-secret', {
        timestamp: 1757058220,
        notification_type: 'ORDER_PAID',
        order: {
          id: 'provider-order-id',
          order_id: 'NQD-...',
          order_status: 'CAPTURED',
          order_currency: 'VND',
          order_amount: '100000.00',
          order_invoice_number: 'INV-1',
          custom_data: [],
          user_agent: 'Mozilla/5.0',
          ip_address: '127.0.0.1',
          order_description: 'Thanh toan',
        },
        transaction: {
          id: 'provider-transaction-id',
          payment_method: 'BANK_TRANSFER',
          transaction_id: 'TXN-001',
          transaction_type: 'PAYMENT',
          transaction_date: '2025-09-29 15:31:22',
          transaction_status: 'APPROVED',
          transaction_amount: '100000',
          transaction_currency: 'VND',
        },
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('updates SePay payment attempt and completes order when ORDER_PAID IPN is valid', async () => {
    const mock = createMockSupabaseClient();
    const completeExternalPayment = jest.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'PAID',
    });

    mock.from.mockImplementation((table: string) => {
      if (table === 'order_payments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'payment-row-id',
                order_id: '00000000-0000-0000-0000-000000000001',
                invoice_number: 'INV-1',
                status: 'PENDING',
              },
            ],
            error: null,
          }),
          update: mock.buildUpdateQuery({ error: null }).update,
        };
      }

      if (table === 'orders') {
        return mock.buildMaybeSingleQuery({
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            status: 'PENDING_PAYMENT',
            currency: 'VND',
            total_amount: '100000',
          },
          error: null,
        });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any, undefined, {
      completeExternalPayment,
    });

    const result = await service.handleIpn('secret-key', {
      timestamp: 1757058220,
      notification_type: 'ORDER_PAID',
      order: {
        id: 'provider-order-id',
        order_id: 'NQD-...',
        order_status: 'CAPTURED',
        order_currency: 'VND',
        order_amount: '100000.00',
        order_invoice_number: 'INV-1',
        custom_data: [],
        user_agent: 'Mozilla/5.0',
        ip_address: '127.0.0.1',
        order_description: 'Thanh toan',
      },
      transaction: {
        id: 'provider-transaction-id',
        payment_method: 'BANK_TRANSFER',
        transaction_id: 'TXN-001',
        transaction_type: 'PAYMENT',
        transaction_date: '2025-09-29 15:31:22',
        transaction_status: 'APPROVED',
        transaction_amount: '100000',
        transaction_currency: 'VND',
      },
    });

    expect(completeExternalPayment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        provider: 'SEPAY',
        transactionId: 'TXN-001',
      }),
    );
    expect(result).toEqual({ acknowledged: true });
  });

  it('reconciles missing payment attempt by invoice number and completes order', async () => {
    const mock = createMockSupabaseClient();
    const completeExternalPayment = jest.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'PAID',
    });
    let invoiceLookupCount = 0;

    mock.from.mockImplementation((table: string) => {
      if (table === 'order_payments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockImplementation(() => {
            invoiceLookupCount += 1;
            if (invoiceLookupCount === 1) {
              return Promise.resolve({ data: [], error: null });
            }
            return Promise.resolve({
              data: [
                {
                  id: 'payment-row-id',
                  order_id: '00000000-0000-0000-0000-000000000001',
                  invoice_number: 'INV-ORD-20260611-0001-1757058220123',
                  status: 'PENDING',
                },
              ],
              error: null,
            });
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: mock.buildUpdateQuery({ error: null }).update,
        };
      }

      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation((key: string) => {
            if (key === 'order_number') {
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: '00000000-0000-0000-0000-000000000001',
                    status: 'PENDING_PAYMENT',
                    currency: 'VND',
                    total_amount: '100000',
                  },
                  error: null,
                }),
              };
            }

            return {
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  status: 'PENDING_PAYMENT',
                  currency: 'VND',
                  total_amount: '100000',
                },
                error: null,
              }),
            };
          }),
          maybeSingle: jest.fn(),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any, undefined, {
      completeExternalPayment,
    });

    const result = await service.handleIpn('secret-key', {
      timestamp: 1757058220,
      notification_type: 'ORDER_PAID',
      order: {
        id: 'provider-order-id',
        order_id: 'NQD-...',
        order_status: 'CAPTURED',
        order_currency: 'VND',
        order_amount: '100000.00',
        order_invoice_number: 'INV-ORD-20260611-0001-1757058220123',
        custom_data: [],
        user_agent: 'Mozilla/5.0',
        ip_address: '127.0.0.1',
        order_description: 'Thanh toan',
      },
      transaction: {
        id: 'provider-transaction-id',
        payment_method: 'BANK_TRANSFER',
        transaction_id: 'TXN-001',
        transaction_type: 'PAYMENT',
        transaction_date: '2025-09-29 15:31:22',
        transaction_status: 'APPROVED',
        transaction_amount: '100000',
        transaction_currency: 'VND',
      },
    });

    expect(completeExternalPayment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        provider: 'SEPAY',
        transactionId: 'TXN-001',
      }),
    );
    expect(result).toEqual({ acknowledged: true });
  });

  it('acknowledges BankHub webhook when api key is valid but does not match any payment', async () => {
    const mock = createMockSupabaseClient();

    mock.from.mockImplementation((table: string) => {
      if (table === 'order_payments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);
    const result = await service.handleWebhook('Apikey webhook-key', {
      gateway: 'MBBank',
      transactionDate: '2026-06-12 15:12:00',
      accountNumber: '040495',
      subAccount: null,
      code: 'PAYXXX',
      content: 'PAYXXX ...',
      transferType: 'in',
      description: 'desc',
      transferAmount: 83016,
      referenceCode: 'FT...',
      accumulated: 0,
      id: 62983252,
    });

    expect(result).toEqual({ acknowledged: true, matched: false });
  });
});
