import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { buildPaginationMeta } from '../common/pagination-meta';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../common/api-response.interceptor';
import {
  AdminCreateTrackRequestDto,
  AdminTracksListQueryDto,
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
  created_by: string;
  created_at: string;
  updated_at: string;
};

const mapTrackRowToDto = (row: DbTrackRow): TrackDto => ({
  id: row.id,
  title: row.title,
  artistId: row.artist_id,
  authorName: row.author_name,
  genre: row.genre,
  duration: row.duration,
  status: row.status,
  usageRights: row.usage_rights ?? [],
  originalAudioKey: row.original_audio_key,
  previewAudioKey: row.preview_audio_key,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeKeyword = (value: string) => value.trim();

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

  async listAdminTracks(
    query: AdminTracksListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: TrackDto[] }, PaginationMeta>> {
    // #region debug-point A:tracks-service-list-start
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'A', location: 'tracks.service.ts:listAdminTracks:start', msg: '[DEBUG] tracks service list start', data: { page: query.page, pageSize: query.pageSize, keyword: query.keyword, q: query.q, status: query.status, genre: query.genre, artistId: query.artistId, sort: query.sort }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const keyword =
      typeof query.keyword === 'string' && query.keyword.trim().length > 0
        ? normalizeKeyword(query.keyword)
        : typeof query.q === 'string' && query.q.trim().length > 0
          ? normalizeKeyword(query.q)
          : undefined;

    const { column, ascending } = parseSort(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let requestBuilder = this.supabaseService.client
      .from('tracks')
      .select('*', { count: 'exact' })
      .order(column, { ascending });

    if (query.status)
      requestBuilder = requestBuilder.eq('status', query.status);
    if (query.genre) requestBuilder = requestBuilder.eq('genre', query.genre);
    if (query.artistId)
      requestBuilder = requestBuilder.eq('artist_id', query.artistId);

    if (keyword) {
      const escaped = keyword.replaceAll(',', ' ');
      requestBuilder = requestBuilder.or(
        `title.ilike.%${escaped}%,author_name.ilike.%${escaped}%`,
      );
    }

    const { data, error, count } = await requestBuilder
      .range(from, to)
      .returns<DbTrackRow[]>();

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
    // #region debug-point B:tracks-service-original-upload-start
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createOriginalUploadUrl:start', msg: '[DEBUG] original upload url start', data: { trackId }, ts: Date.now() }) }).catch(() => {});
    // #endregion
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

    const fileKey = `tracks/${trackId}/original/${randomUUID()}.mp3`;
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (error || !data) {
      // #region debug-point B:tracks-service-original-upload-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createOriginalUploadUrl:error', msg: '[DEBUG] original upload url error', data: { error: error?.message ?? 'unknown', bucket, fileKey }, ts: Date.now() }) }).catch(() => {});
      // #endregion
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

    // #region debug-point B:tracks-service-original-upload-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createOriginalUploadUrl:success', msg: '[DEBUG] original upload url success', data: { bucket, fileKey, hasSignedUrl: Boolean(data.signedUrl) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return { uploadUrl: data.signedUrl, fileKey };
  }

  async createPreviewUploadUrl(
    trackId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    // #region debug-point B:tracks-service-preview-upload-start
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createPreviewUploadUrl:start', msg: '[DEBUG] preview upload url start', data: { trackId }, ts: Date.now() }) }).catch(() => {});
    // #endregion
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

    const fileKey = `tracks/${trackId}/preview/${randomUUID()}.mp3`;
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (error || !data) {
      // #region debug-point B:tracks-service-preview-upload-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createPreviewUploadUrl:error', msg: '[DEBUG] preview upload url error', data: { error: error?.message ?? 'unknown', bucket, fileKey }, ts: Date.now() }) }).catch(() => {});
      // #endregion
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

    // #region debug-point B:tracks-service-preview-upload-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'track-admin-runtime', runId: 'pre-fix', hypothesisId: 'B', location: 'tracks.service.ts:createPreviewUploadUrl:success', msg: '[DEBUG] preview upload url success', data: { bucket, fileKey, hasSignedUrl: Boolean(data.signedUrl) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return { uploadUrl: data.signedUrl, fileKey };
  }

  async createPreviewPlaybackUrl(
    trackId: string,
  ): Promise<{ playbackUrl: string }> {
    const track = await this.getTrackById(trackId);

    if (!track.previewAudioKey) {
      throw new HttpException('Preview audio is not available', HttpStatus.NOT_FOUND);
    }

    const bucket = this.configService.get<string>('STORAGE_BUCKET_PREVIEW_AUDIO');
    if (!bucket) {
      throw new HttpException(
        'Missing STORAGE_BUCKET_PREVIEW_AUDIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expiresInSeconds = 60 * 15;
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(track.previewAudioKey, expiresInSeconds);

    if (error || !data) {
      throw new HttpException(
        error?.message ?? 'Failed to create signed playback URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { playbackUrl: data.signedUrl };
  }
}
