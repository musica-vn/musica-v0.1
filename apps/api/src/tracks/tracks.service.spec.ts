import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { TracksService } from './tracks.service';

describe('TracksService - upload URLs', () => {
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
    new TracksService(mockSupabaseService as any, mockConfigService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createOriginalUploadUrl allocates N.mp3 and updates only original_audio_key', async () => {
    const service = createService();
    const trackId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getTrackById').mockResolvedValue({
      id: trackId,
      title: 't',
      artistId: '00000000-0000-0000-0000-000000000002',
      authorName: null,
      genre: null,
      duration: null,
      status: 'HIDDEN',
      usageRights: [],
      originalAudioKey: null,
      previewAudioKey: null,
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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

    const result = await service.createOriginalUploadUrl(trackId);

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'allocate_storage_index',
      { p_bucket: 'original-audio' },
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith('7.mp3');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
    expect(update).toHaveBeenCalledWith({ original_audio_key: '7.mp3' });
    expect(eq).toHaveBeenCalledWith('id', trackId);
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '7.mp3' });
  });

  it('createPreviewUploadUrl allocates N.mp3 and updates only preview_audio_key', async () => {
    const service = createService();
    const trackId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getTrackById').mockResolvedValue({
      id: trackId,
      title: 't',
      artistId: '00000000-0000-0000-0000-000000000002',
      authorName: null,
      genre: null,
      duration: null,
      status: 'HIDDEN',
      usageRights: [],
      originalAudioKey: null,
      previewAudioKey: null,
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_PREVIEW_AUDIO') return 'preview-audio';
      return undefined;
    });

    mockSupabaseClient.rpc.mockResolvedValue({ data: 12, error: null });

    const createSignedUploadUrl = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUploadUrl });

    const update = jest.fn();
    const eq = jest.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });
    mockSupabaseClient.from.mockReturnValue({ update });

    const result = await service.createPreviewUploadUrl(trackId);

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'allocate_storage_index',
      { p_bucket: 'preview-audio' },
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith('12.mp3');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
    expect(update).toHaveBeenCalledWith({ preview_audio_key: '12.mp3' });
    expect(eq).toHaveBeenCalledWith('id', trackId);
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '12.mp3' });
  });

  it('throws 500 when allocate_storage_index returns error', async () => {
    const service = createService();
    const trackId = '00000000-0000-0000-0000-000000000001';

    jest.spyOn(service, 'getTrackById').mockResolvedValue({} as any);

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'rpc fail' },
    });

    await expect(service.createOriginalUploadUrl(trackId)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});

