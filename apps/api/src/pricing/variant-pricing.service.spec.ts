import { HttpException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VariantPricingService } from './variant-pricing.service';

const createMockSupabaseClient = () => {
  const from = jest.fn();

  const buildConfigQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  });

  const buildModifiersQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    returns: jest.fn().mockResolvedValue(result),
  });

  const buildGenericMaybeSingleQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  });

  return {
    from,
    buildConfigQuery,
    buildModifiersQuery,
    buildGenericMaybeSingleQuery,
  };
};

describe('VariantPricingService', () => {
  const createService = (mockClient: any) => {
    const mockSupabaseService: Pick<SupabaseService, 'client'> = {
      client: mockClient,
    };
    return new VariantPricingService(mockSupabaseService as any);
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calculates DIGITAL total with 10% rate and matching modifiers', async () => {
    const mock = createMockSupabaseClient();

    const configId = '00000000-0000-0000-0000-000000000001';

    mock.from.mockImplementation((table: string) => {
      if (table === 'digital_right_configs') {
        return mock.buildConfigQuery({
          data: { id: configId, base_price_multiplier: 2 },
          error: null,
        });
      }
      if (table === 'digital_right_config_price_modifiers') {
        return mock.buildModifiersQuery({
          data: [{ modifier_key: 'SUBJECT_INDIVIDUAL', multiplier: 3 }],
          error: null,
        });
      }
      if (table === 'expression_configs') {
        return mock.buildGenericMaybeSingleQuery({ data: null, error: null });
      }
      if (table === 'modification_configs') {
        return mock.buildGenericMaybeSingleQuery({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);

    const result = await service.calculate({
      platformType: 'DIGITAL',
      digitalRightConfigId: configId,
      subject: 'INDIVIDUAL',
      duration: 'ONE_YEAR',
      scope: 'SINGLE_CHANNEL',
    });

    expect(result.currency).toBe('VND');
    expect(result.totalPrice).toBe(3_036_000);
    expect(result.breakdown).toHaveLength(7);
  });

  it('calculates PHYSICAL total without 10% rate and with expression multiplier', async () => {
    const mock = createMockSupabaseClient();

    const configId = '00000000-0000-0000-0000-000000000002';
    const expressionId = '00000000-0000-0000-0000-000000000003';

    mock.from.mockImplementation((table: string) => {
      if (table === 'physical_right_configs') {
        return mock.buildConfigQuery({
          data: { id: configId, base_price_multiplier: 1.5 },
          error: null,
        });
      }
      if (table === 'physical_right_config_price_modifiers') {
        return mock.buildModifiersQuery({
          data: [{ modifier_key: 'EXPRESSION', multiplier: 1 }],
          error: null,
        });
      }
      if (table === 'expression_configs') {
        return mock.buildGenericMaybeSingleQuery({
          data: { id: expressionId, price_multiplier: 2 },
          error: null,
        });
      }
      if (table === 'modification_configs') {
        return mock.buildGenericMaybeSingleQuery({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);

    const result = await service.calculate({
      platformType: 'PHYSICAL',
      physicalRightConfigId: configId,
      subject: 'INDIVIDUAL',
      duration: 'ONE_YEAR',
      scope: 'SINGLE_CHANNEL',
      expressionConfigId: expressionId,
    });

    expect(result.currency).toBe('VND');
    expect(result.totalPrice).toBe(7_590_000);
  });

  it('throws 400 when missing platform config id', async () => {
    const mock = createMockSupabaseClient();
    const service = createService(mock as any);

    await expect(
      service.calculate({
        platformType: 'DIGITAL',
        subject: 'INDIVIDUAL',
        duration: 'ONE_YEAR',
        scope: 'SINGLE_CHANNEL',
      } as any),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('throws 404 when platform config not found', async () => {
    const mock = createMockSupabaseClient();
    const configId = '00000000-0000-0000-0000-000000000004';

    mock.from.mockImplementation((table: string) => {
      if (table === 'digital_right_configs') {
        return mock.buildConfigQuery({ data: null, error: null });
      }
      if (table === 'digital_right_config_price_modifiers') {
        return mock.buildModifiersQuery({ data: [], error: null });
      }
      if (table === 'expression_configs') {
        return mock.buildGenericMaybeSingleQuery({ data: null, error: null });
      }
      if (table === 'modification_configs') {
        return mock.buildGenericMaybeSingleQuery({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = createService(mock as any);

    await expect(
      service.calculate({
        platformType: 'DIGITAL',
        digitalRightConfigId: configId,
        subject: 'INDIVIDUAL',
        duration: 'ONE_YEAR',
        scope: 'SINGLE_CHANNEL',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
