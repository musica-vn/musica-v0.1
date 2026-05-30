import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { ProductDto } from './product.dto';
import { ProductsService } from './products.service';

const createMockProductDto = (
  overrides: Partial<ProductDto> = {},
): ProductDto => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 't',
  artistId: '00000000-0000-0000-0000-000000000002',
  authorName: null,
  genre: null,
  duration: null,
  status: 'HIDDEN',
  useCase: null,
  description: null,
  allowedPermissionIds: [],
  allowedPermissions: [],
  licensingEligibility: {
    digitalConfigs: [],
    physicalConfigs: [],
    summary: {
      eligibleDigitalCount: 0,
      ineligibleDigitalCount: 0,
      eligiblePhysicalCount: 0,
      ineligiblePhysicalCount: 0,
    },
  },
  complianceLegalStatus: null,
  complianceReviewStatus: null,
  originalAudioKey: null,
  thumbnailKey: null,
  createdBy: '00000000-0000-0000-0000-000000000003',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ProductsService - upload URLs', () => {
  const mockConfigService: Pick<ConfigService, 'get'> = {
    get: jest.fn(),
  };

  const mockSupabaseClient = {
    rpc: jest.fn(),
    storage: { from: jest.fn() },
    from: jest.fn(),
  };

  const mockSupabaseService: Pick<SupabaseService, 'client'> = {
    client: mockSupabaseClient as any,
  };

  const createService = () =>
    new ProductsService(mockSupabaseService as any, mockConfigService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createOriginalUploadUrl allocates N.mp3 and updates only original_audio_key', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest
      .spyOn(service, 'getProductById')
      .mockResolvedValue(createMockProductDto({ id: productId }));

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    mockSupabaseClient.rpc.mockResolvedValue({ data: 7, error: null });

    const createSignedUploadUrl = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUploadUrl });

    const update = jest.fn();
    const eq = jest.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });
    mockSupabaseClient.from.mockReturnValue({ update });

    const result = await service.createOriginalUploadUrl(productId);

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'allocate_storage_index',
      { p_bucket: 'original-audio' },
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith('7.mp3');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    expect(update).toHaveBeenCalledWith({ original_audio_key: '7.mp3' });
    expect(eq).toHaveBeenCalledWith('id', productId);
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '7.mp3' });
  });

  it('throws 500 when allocate_storage_index returns error', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getProductById').mockResolvedValue({} as any);

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'rpc fail' },
    });

    await expect(service.createOriginalUploadUrl(productId)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('createThumbnailUploadUrl allocates N.png and updates only thumbnail_key', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest
      .spyOn(service, 'getProductById')
      .mockResolvedValue(createMockProductDto({ id: productId }));

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_TRACK_THUMBNAILS') return 'track-thumbnails';
      return undefined;
    });

    mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });

    const createSignedUploadUrl = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUploadUrl });

    const update = jest.fn();
    const eq = jest.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });
    mockSupabaseClient.from.mockReturnValue({ update });

    const result = await service.createThumbnailUploadUrl(productId, 'png');

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'allocate_storage_index',
      { p_bucket: 'track-thumbnails' },
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith('5.png');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    expect(update).toHaveBeenCalledWith({ thumbnail_key: '5.png' });
    expect(eq).toHaveBeenCalledWith('id', productId);
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '5.png' });
  });

  it('publishProduct throws 400 when thumbnailKey is missing', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest
      .spyOn(service, 'getProductById')
      .mockResolvedValue(createMockProductDto({ id: productId }));

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: productId,
        title: 't',
        artist_id: '00000000-0000-0000-0000-000000000002',
        author_name: null,
        genre: null,
        duration: null,
        status: 'PUBLISHED',
        use_case: null,
        description: null,
        original_audio_key: null,
        thumbnail_key: null,
        created_by: '00000000-0000-0000-0000-000000000003',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    mockSupabaseClient.from.mockReturnValue({ update });

    try {
      await service.publishProduct(productId);
      throw new Error('Expected publishProduct to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
      expect((error as HttpException).message).toBe('PRODUCT_THUMBNAIL_REQUIRED');
    }
  });
});

describe('ProductsService - playback URLs', () => {
  const mockConfigService: Pick<ConfigService, 'get'> = {
    get: jest.fn(),
  };

  const mockSupabaseClient = {
    storage: { from: jest.fn() },
    from: jest.fn(),
  };

  const mockSupabaseService: Pick<SupabaseService, 'client'> = {
    client: mockSupabaseClient as any,
  };

  const createService = () =>
    new ProductsService(mockSupabaseService as any, mockConfigService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createOriginalPlaybackUrl uses 6h expiry', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getProductById').mockResolvedValue(
      createMockProductDto({
        id: productId,
        originalAudioKey: '1.mp3',
        thumbnailKey: '3.png',
      }),
    );

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed' },
      error: null,
    });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUrl });

    const result = await service.createOriginalPlaybackUrl(productId);

    expect(createSignedUrl).toHaveBeenCalledWith('1.mp3', 60 * 60 * 6);
    expect(result).toEqual({ playbackUrl: 'https://signed' });
  });
});

describe('ProductsService - allowed permissions', () => {
  const mockConfigService: Pick<ConfigService, 'get'> = {
    get: jest.fn(),
  };

  const mockSupabaseClient = {
    from: jest.fn(),
  };

  const mockSupabaseService: Pick<SupabaseService, 'client'> = {
    client: mockSupabaseClient as any,
  };

  const createService = () =>
    new ProductsService(mockSupabaseService as any, mockConfigService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects when compliance is not approved yet', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getProductById').mockResolvedValue(
      createMockProductDto({
        id: productId,
        status: 'PENDING',
        complianceLegalStatus: 'PENDING',
        complianceReviewStatus: 'PENDING',
      }),
    );

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        legal_status: 'PENDING',
        review_status: 'PENDING',
        compliance_approved_permissions: [],
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'compliance_reviews') return { select };
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(
      service.replaceAllowedPermissions(productId, [
        '00000000-0000-4000-8000-000000000004',
      ]),
    ).rejects.toMatchObject({
      message: 'PRODUCT_ALLOWED_PERMISSIONS_LOCKED_UNTIL_COMPLIANCE_APPROVED',
    });
  });

  it('rejects permissions outside approved set', async () => {
    const service = createService();
    const productId = '00000000-0000-0000-0000-000000000001';
    const approvedPermissionId = '00000000-0000-4000-8000-000000000010';
    const invalidPermissionId = '00000000-0000-4000-8000-000000000011';

    jest.spyOn(service, 'getProductById').mockResolvedValue(
      createMockProductDto({
        id: productId,
        status: 'PENDING',
        complianceLegalStatus: 'SUFFICIENT',
        complianceReviewStatus: 'APPROVED',
      }),
    );

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        legal_status: 'SUFFICIENT',
        review_status: 'APPROVED',
        compliance_approved_permissions: [{ permission_id: approvedPermissionId }],
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'compliance_reviews') return { select };
      throw new Error(`Unexpected table ${table}`);
    });

    try {
      await service.replaceAllowedPermissions(productId, [invalidPermissionId]);
      throw new Error('Expected replaceAllowedPermissions to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
      expect((error as HttpException).message).toBe(
        'PERMISSION_NOT_APPROVED_FOR_PRODUCT',
      );
      expect((error as HttpException).getResponse()).toEqual({
        message: 'PERMISSION_NOT_APPROVED_FOR_PRODUCT',
        details: { permissionIds: [invalidPermissionId] },
      });
    }
  });
});
