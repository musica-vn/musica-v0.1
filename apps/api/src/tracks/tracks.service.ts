import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { buildPaginationMeta } from '../common/pagination-meta';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../common/api-response.interceptor';
import {
  AdminCreateTrackRequestDto,
  AdminConfirmTrackAudioUploadRequestDto,
  AdminConfirmTrackThumbnailUploadRequestDto,
  AdminTracksListQueryDto,
  AdminTracksSummaryQueryDto,
  TRACK_USAGE_RIGHT_VALUES,
  type TrackUsageRight,
  AdminUpdateTrackRequestDto,
} from './admin-tracks.dto';
import { TrackDto } from './track.dto';

type DbTrackRow = {
  id: string;
  title: string;
  artist_id: string;
  author_name: string | null;
  genre: string | null;
  duration: number | null;
  status: 'HIDDEN' | 'PUBLISHED';
  usage_rights: string[];
  original_audio_key: string | null;
  preview_audio_key: string | null;
  thumbnail_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const isTrackUsageRight = (value: string): value is TrackUsageRight =>
  TRACK_USAGE_RIGHT_VALUES.includes(value as TrackUsageRight);

const mapTrackRowToDto = (row: DbTrackRow): TrackDto => ({
  id: row.id,
  title: row.title,
  artistId: row.artist_id,
  authorName: row.author_name,
  genre: row.genre,
  duration: row.duration,
  status: row.status,
  usageRights: (row.usage_rights ?? []).filter(isTrackUsageRight),
  originalAudioKey: row.original_audio_key,
  previewAudioKey: row.preview_audio_key,
  thumbnailKey: row.thumbnail_key,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeKeyword = (value: string) => value.trim();

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 6;

const parseSort = (
  sort: string | undefined,
): { column: keyof DbTrackRow; ascending: boolean } => {
  const fallback: { column: keyof DbTrackRow; ascending: boolean } = {
    column: 'created_at',
    ascending: false,
  };

  if (!sort) return fallback;

  const [field, dir] = sort.split(':');
  const ascending = dir !== 'desc';

  const fieldMapping: Record<string, keyof DbTrackRow> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    title: 'title',
    status: 'status',
    genre: 'genre',
  };

  const column = fieldMapping[field];
  if (!column) return fallback;

  return { column, ascending };
};

@Injectable()
export class TracksService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private async allocateNextStorageKey(
    bucket: string,
    extension: string,
  ): Promise<string> {
    const { data, error } = await this.supabaseService.client.rpc(
      'allocate_storage_index',
      { p_bucket: bucket },
    );

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (typeof data !== 'number') {
      throw new HttpException(
        'Invalid allocate_storage_index response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return `${data}.${extension}`;
  }

  async listAdminTracks(
    query: AdminTracksListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: TrackDto[] }, PaginationMeta>> {
    // #region debug-point A:tracks-service-list-start
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'tracks.service.ts:listAdminTracks:start', msg: '[DEBUG] tracks service list start', data: { page: query.page, pageSize: query.pageSize, keyword: query.keyword, q: query.q, status: query.status, genre: query.genre, artistId: query.artistId, sort: query.sort }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const { column, ascending } = parseSort(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    const requestBuilder = this.applyTrackAdminFilters(
      this.supabaseService.client
        .from('tracks')
        .select('*', { count: 'exact' })
        .order(column, { ascending }),
      query,
    );

    const { data, error, count } = (await requestBuilder.range(from, to)) as {
      data: DbTrackRow[] | null;
      error: { message: string } | null;
      count: number | null;
    };

    if (error) {
      // #region debug-point A:tracks-service-list-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'tracks.service.ts:listAdminTracks:error', msg: '[DEBUG] tracks service list error', data: { error: error.message }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const totalItems = typeof count === 'number' ? count : 0;
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems);
    // #region debug-point A:tracks-service-list-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'tracks.service.ts:listAdminTracks:success', msg: '[DEBUG] tracks service list success', data: { rowCount: data?.length ?? 0, totalItems }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    return {
      data: { items: (data ?? []).map(mapTrackRowToDto) },
      meta,
    };
  }

  async getAdminTracksSummary(
    query: AdminTracksSummaryQueryDto,
  ): Promise<{ total: number; published: number; hidden: number }> {
    const [total, published, hidden] = await Promise.all([
      this.countTracksByStatus(query),
      this.countTracksByStatus(query, 'PUBLISHED'),
      this.countTracksByStatus(query, 'HIDDEN'),
    ]);

    return { total, published, hidden };
  }

  private applyTrackAdminFilters(
    requestBuilder: any,
    query: Pick<
      AdminTracksSummaryQueryDto,
      'keyword' | 'q' | 'genre' | 'artistId'
    > & { status?: 'HIDDEN' | 'PUBLISHED' },
  ) {
    const keyword =
      typeof query.keyword === 'string' && query.keyword.trim().length > 0
        ? normalizeKeyword(query.keyword)
        : typeof query.q === 'string' && query.q.trim().length > 0
          ? normalizeKeyword(query.q)
          : undefined;

    if (query.status) requestBuilder = requestBuilder.eq('status', query.status);
    if (query.genre) requestBuilder = requestBuilder.eq('genre', query.genre);
    if (query.artistId)
      requestBuilder = requestBuilder.eq('artist_id', query.artistId);

    if (keyword) {
      const escaped = keyword.replaceAll(',', ' ');
      requestBuilder = requestBuilder.or(
        `title.ilike.%${escaped}%,author_name.ilike.%${escaped}%`,
      );
    }

    return requestBuilder;
  }

  private async countTracksByStatus(
    query: AdminTracksSummaryQueryDto,
    status?: 'HIDDEN' | 'PUBLISHED',
  ): Promise<number> {
    const requestBuilder = this.applyTrackAdminFilters(
      this.supabaseService.client.from('tracks').select('id', { count: 'exact' }),
      { ...query, status },
    );

    const { count, error } = await requestBuilder.limit(1);

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return typeof count === 'number' ? count : 0;
  }

  async createTrack(
    payload: AdminCreateTrackRequestDto,
    createdBy: string,
  ): Promise<TrackDto> {
    // #region debug-point D:tracks-service-create-start
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'D', location: 'tracks.service.ts:createTrack:start', msg: '[DEBUG] tracks service create start', data: { title: payload.title, artistId: payload.artistId, genre: payload.genre, duration: payload.duration, usageRights: payload.usageRights, createdBy }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .insert({
        title: payload.title,
        artist_id: payload.artistId,
        author_name: payload.authorName ?? null,
        genre: payload.genre ?? null,
        duration: payload.duration ?? null,
        usage_rights: payload.usageRights ?? [],
        created_by: createdBy,
      })
      .select('*')
      .single<DbTrackRow>();

    if (error) {
      // #region debug-point D:tracks-service-create-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'D', location: 'tracks.service.ts:createTrack:error', msg: '[DEBUG] tracks service create error', data: { error: error.message }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // #region debug-point D:tracks-service-create-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'D', location: 'tracks.service.ts:createTrack:success', msg: '[DEBUG] tracks service create success', data: { trackId: data.id, title: data.title }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return mapTrackRowToDto(data);
  }

  async getTrackById(trackId: string): Promise<TrackDto> {
    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async updateTrack(
    trackId: string,
    payload: AdminUpdateTrackRequestDto,
  ): Promise<TrackDto> {
    const updatePayload: Partial<DbTrackRow> & Record<string, unknown> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.artistId !== undefined)
      updatePayload.artist_id = payload.artistId;
    if (payload.authorName !== undefined)
      updatePayload.author_name = payload.authorName;
    if (payload.genre !== undefined) updatePayload.genre = payload.genre;
    if (payload.duration !== undefined)
      updatePayload.duration = payload.duration;
    if (payload.usageRights !== undefined)
      updatePayload.usage_rights = payload.usageRights;

    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .update(updatePayload)
      .eq('id', trackId)
      .select('*')
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async publishTrack(trackId: string): Promise<TrackDto> {
    const track = await this.getTrackById(trackId);
    if (!track.thumbnailKey) {
      throw new HttpException(
        'TRACK_THUMBNAIL_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .update({ status: 'PUBLISHED' })
      .eq('id', trackId)
      .select('*')
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async hideTrack(trackId: string): Promise<TrackDto> {
    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .update({ status: 'HIDDEN' })
      .eq('id', trackId)
      .select('*')
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async createOriginalUploadUrl(
    trackId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.getTrackById(trackId);

    const bucket = this.configService.get<string>(
      'STORAGE_BUCKET_ORIGINAL_AUDIO',
    );
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_ORIGINAL_AUDIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const fileKey = await this.allocateNextStorageKey(bucket, 'mp3');
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (error || !data) {
      throw new HttpException(
        error?.message ?? 'Failed to create signed upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { error: updateError } = await this.supabaseService.client
      .from('tracks')
      .update({ original_audio_key: fileKey })
      .eq('id', trackId);

    if (updateError) {
      throw new HttpException(
        updateError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { uploadUrl: data.signedUrl, fileKey };
  }

  async createPreviewUploadUrl(
    trackId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.getTrackById(trackId);

    const bucket = this.configService.get<string>(
      'STORAGE_BUCKET_PREVIEW_AUDIO',
    );
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_PREVIEW_AUDIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const fileKey = await this.allocateNextStorageKey(bucket, 'mp3');
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (error || !data) {
      throw new HttpException(
        error?.message ?? 'Failed to create signed upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { error: updateError } = await this.supabaseService.client
      .from('tracks')
      .update({ preview_audio_key: fileKey })
      .eq('id', trackId);

    if (updateError) {
      throw new HttpException(
        updateError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { uploadUrl: data.signedUrl, fileKey };
  }

  async createThumbnailUploadUrl(
    trackId: string,
    extension: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.getTrackById(trackId);

    const bucket = this.configService.get<string>(
      'STORAGE_BUCKET_TRACK_THUMBNAILS',
    );
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_TRACK_THUMBNAILS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const fileKey = await this.allocateNextStorageKey(bucket, extension);
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (error || !data) {
      throw new HttpException(
        error?.message ?? 'Failed to create signed upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { error: updateError } = await this.supabaseService.client
      .from('tracks')
      .update({ thumbnail_key: fileKey })
      .eq('id', trackId);

    if (updateError) {
      throw new HttpException(
        updateError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { uploadUrl: data.signedUrl, fileKey };
  }

  async confirmTrackAudioUpload(
    trackId: string,
    payload: AdminConfirmTrackAudioUploadRequestDto,
  ): Promise<TrackDto> {
    await this.getTrackById(trackId);

    const updatePayload =
      payload.mode === 'original'
        ? { original_audio_key: payload.fileKey }
        : { preview_audio_key: payload.fileKey };

    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .update(updatePayload)
      .eq('id', trackId)
      .select('*')
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async confirmTrackThumbnailUpload(
    trackId: string,
    payload: AdminConfirmTrackThumbnailUploadRequestDto,
  ): Promise<TrackDto> {
    await this.getTrackById(trackId);

    const { data, error } = await this.supabaseService.client
      .from('tracks')
      .update({ thumbnail_key: payload.fileKey })
      .eq('id', trackId)
      .select('*')
      .maybeSingle<DbTrackRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('TRACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapTrackRowToDto(data);
  }

  async createThumbnailUrl(trackId: string): Promise<{ thumbnailUrl: string }> {
    const track = await this.getTrackById(trackId);

    if (!track.thumbnailKey) {
      throw new HttpException('Thumbnail is not available', HttpStatus.NOT_FOUND);
    }

    const bucket = this.configService.get<string>('STORAGE_BUCKET_TRACK_THUMBNAILS');
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_TRACK_THUMBNAILS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expiresInSeconds = SIGNED_URL_EXPIRES_IN_SECONDS;
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(track.thumbnailKey, expiresInSeconds);

    if (data?.signedUrl) {
      return { thumbnailUrl: data.signedUrl };
    }

    const errorMessage = error?.message ?? 'Failed to create signed thumbnail URL';
    if (errorMessage === 'Object not found') {
      throw new HttpException('Thumbnail object not found', HttpStatus.NOT_FOUND);
    }

    throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async createPreviewPlaybackUrl(
    trackId: string,
  ): Promise<{ playbackUrl: string }> {
    const track = await this.getTrackById(trackId);

    const audioKey = track.previewAudioKey ?? track.originalAudioKey;
    if (!audioKey) {
      throw new HttpException('Audio is not available', HttpStatus.NOT_FOUND);
    }

    const previewBucket = this.configService.get<string>(
      'STORAGE_BUCKET_PREVIEW_AUDIO',
    );
    const originalBucket = this.configService.get<string>(
      'STORAGE_BUCKET_ORIGINAL_AUDIO',
    );

    if (!previewBucket || !originalBucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_PREVIEW_AUDIO or STORAGE_BUCKET_ORIGINAL_AUDIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expiresInSeconds = SIGNED_URL_EXPIRES_IN_SECONDS;
    const trySignedUrl = async (bucket: string) =>
      this.supabaseService.client.storage
        .from(bucket)
        .createSignedUrl(audioKey, expiresInSeconds);

    const previewResult = await trySignedUrl(previewBucket);
    if (previewResult.data?.signedUrl) {
      return { playbackUrl: previewResult.data.signedUrl };
    }

    const originalResult = await trySignedUrl(originalBucket);
    if (originalResult.data?.signedUrl) {
      return { playbackUrl: originalResult.data.signedUrl };
    }

    const errorMessage =
      previewResult.error?.message ??
      originalResult.error?.message ??
      'Failed to create signed playback URL';

    if (errorMessage === 'Object not found') {
      throw new HttpException('Audio object not found', HttpStatus.NOT_FOUND);
    }

    throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async createOriginalPlaybackUrl(
    trackId: string,
  ): Promise<{ playbackUrl: string }> {
    const track = await this.getTrackById(trackId);

    const audioKey = track.originalAudioKey;
    if (!audioKey) {
      throw new HttpException('Audio is not available', HttpStatus.NOT_FOUND);
    }

    const bucket = this.configService.get<string>('STORAGE_BUCKET_ORIGINAL_AUDIO');
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_ORIGINAL_AUDIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(audioKey, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (data?.signedUrl) {
      return { playbackUrl: data.signedUrl };
    }

    const errorMessage = error?.message ?? 'Failed to create signed playback URL';
    if (errorMessage === 'Object not found') {
      throw new HttpException('Audio object not found', HttpStatus.NOT_FOUND);
    }

    throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
