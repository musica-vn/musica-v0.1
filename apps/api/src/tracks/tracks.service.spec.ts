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
      thumbnailKey: null,
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
      thumbnailKey: null,
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

  it('createThumbnailUploadUrl allocates N.png and updates only thumbnail_key', async () => {
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
      thumbnailKey: null,
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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

    const result = await service.createThumbnailUploadUrl(trackId, 'png');

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'allocate_storage_index',
      { p_bucket: 'track-thumbnails' },
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith('5.png');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
    expect(update).toHaveBeenCalledWith({ thumbnail_key: '5.png' });
    expect(eq).toHaveBeenCalledWith('id', trackId);
    expect(result).toEqual({ uploadUrl: 'https://signed', fileKey: '5.png' });
  });

  it('publishTrack throws 400 when thumbnailKey is missing', async () => {
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
      thumbnailKey: null,
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: trackId,
        title: 't',
        artist_id: '00000000-0000-0000-0000-000000000002',
        author_name: null,
        genre: null,
        duration: null,
        status: 'PUBLISHED',
        usage_rights: [],
        original_audio_key: null,
        preview_audio_key: null,
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
      await service.publishTrack(trackId);
      throw new Error('Expected publishTrack to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
      expect((error as HttpException).message).toBe('TRACK_THUMBNAIL_REQUIRED');
    }
  });
});

describe('TracksService - playback URLs', () => {
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
    new TracksService(mockSupabaseService as any, mockConfigService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createPreviewPlaybackUrl uses 6h expiry', async () => {
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
      originalAudioKey: '1.mp3',
      previewAudioKey: '2.mp3',
      thumbnailKey: '3.png',
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_PREVIEW_AUDIO') return 'preview-audio';
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed' },
      error: null,
    });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUrl });

    const result = await service.createPreviewPlaybackUrl(trackId);

    expect(createSignedUrl).toHaveBeenCalledWith('2.mp3', 60 * 60 * 6);
    expect(result).toEqual({ playbackUrl: 'https://signed' });
  });

  it('createOriginalPlaybackUrl uses 6h expiry', async () => {
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
      originalAudioKey: '1.mp3',
      previewAudioKey: null,
      thumbnailKey: '3.png',
      createdBy: '00000000-0000-0000-0000-000000000003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'STORAGE_BUCKET_ORIGINAL_AUDIO') return 'original-audio';
      return undefined;
    });

    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed' },
      error: null,
    });
    mockSupabaseClient.storage.from.mockReturnValue({ createSignedUrl });

    const result = await service.createOriginalPlaybackUrl(trackId);

    expect(createSignedUrl).toHaveBeenCalledWith('1.mp3', 60 * 60 * 6);
    expect(result).toEqual({ playbackUrl: 'https://signed' });
  });
});
