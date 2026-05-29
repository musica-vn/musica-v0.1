import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { buildPaginationMeta } from '../common/pagination-meta';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../common/api-response.interceptor';
import {
  AdminCreateProductRequestDto,
  AdminConfirmProductAudioUploadRequestDto,
  AdminConfirmProductThumbnailUploadRequestDto,
  AdminProductsListQueryDto,
  AdminProductsSummaryQueryDto,
  AdminUpdateProductRequestDto,
} from './admin-products.dto';
import { ProductDto } from './product.dto';

type DbProductRow = {
  id: string;
  title: string;
  artist_id: string;
  author_name: string | null;
  genre: string | null;
  duration: number | null;
  status: 'PENDING' | 'HIDDEN' | 'PUBLISHED';
  use_case: string | null;
  description: string | null;
  original_audio_key: string | null;
  thumbnail_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type DbCorePermissionJoinRow = {
  name: string;
  law_reference: string;
};

type DbProductAllowedPermissionRow = {
  permission_id: string;
  core_permissions?: DbCorePermissionJoinRow | null;
};

type DbComplianceReviewJoinRow = {
  legal_status: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT';
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

type DbProductJoinRow = DbProductRow & {
  track_allowed_permissions?: DbProductAllowedPermissionRow[] | null;
  compliance_reviews?: DbComplianceReviewJoinRow[] | DbComplianceReviewJoinRow | null;
};

const mapProductRowToDto = (row: DbProductJoinRow): ProductDto => {
  const allowedPermissionRows = (row.track_allowed_permissions ?? []).filter(
    (x): x is DbProductAllowedPermissionRow => !!x && typeof x === 'object',
  );

  const allowedPermissionIds = allowedPermissionRows
    .map((x) => x.permission_id)
    .filter((x): x is string => typeof x === 'string');

  const allowedPermissions = allowedPermissionRows
    .map((x) => x.core_permissions)
    .filter((x): x is DbCorePermissionJoinRow => !!x)
    .map((x) => ({ name: x.name, lawReference: x.law_reference }));

  const complianceJoin = row.compliance_reviews;
  const compliance =
    Array.isArray(complianceJoin) && complianceJoin.length > 0
      ? complianceJoin[0]
      : !Array.isArray(complianceJoin) && complianceJoin
        ? complianceJoin
        : null;

  return {
    id: row.id,
    title: row.title,
    artistId: row.artist_id,
    authorName: row.author_name,
    genre: row.genre,
    duration: row.duration,
    status: row.status,
    useCase: row.use_case,
    description: row.description,
    allowedPermissionIds,
    allowedPermissions,
    complianceLegalStatus: compliance ? compliance.legal_status : null,
    complianceReviewStatus: compliance ? compliance.review_status : null,
    originalAudioKey: row.original_audio_key,
    thumbnailKey: row.thumbnail_key,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeKeyword = (value: string) => value.trim();

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 6;

const parseSort = (
  sort: string | undefined,
): { column: keyof DbProductRow; ascending: boolean } => {
  const fallback: { column: keyof DbProductRow; ascending: boolean } = {
    column: 'created_at',
    ascending: false,
  };

  if (!sort) return fallback;

  const [field, dir] = sort.split(':');
  const ascending = dir !== 'desc';

  const fieldMapping: Record<string, keyof DbProductRow> = {
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
export class ProductsService {
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

  async listAdminProducts(
    query: AdminProductsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ProductDto[] }, PaginationMeta>> {
    const { column, ascending } = parseSort(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    const requestBuilder = this.applyProductAdminFilters(
      this.supabaseService.client
        .from('products')
        .select(
          '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
          { count: 'exact' },
        )
        .order(column, { ascending })
        .returns<DbProductJoinRow[]>(),
      query,
    );

    const { data, error, count } = await requestBuilder.range(from, to);

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    const totalItems = typeof count === 'number' ? count : 0;
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems);

    return {
      data: { items: (data ?? []).map(mapProductRowToDto) },
      meta,
    };
  }

  async getAdminProductsSummary(
    query: AdminProductsSummaryQueryDto,
  ): Promise<{ total: number; published: number; hidden: number; pending: number }> {
    const [total, published, hidden, pending] = await Promise.all([
      this.countProductsByStatus(query),
      this.countProductsByStatus(query, 'PUBLISHED'),
      this.countProductsByStatus(query, 'HIDDEN'),
      this.countProductsByStatus(query, 'PENDING'),
    ]);

    return { total, published, hidden, pending };
  }

  private applyProductAdminFilters(
    requestBuilder: any,
    query: Pick<
      AdminProductsSummaryQueryDto,
      'keyword' | 'q' | 'genre' | 'artistId'
    > & { status?: 'PENDING' | 'HIDDEN' | 'PUBLISHED' },
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
        `title.ilike.%${escaped}%,author_name.ilike.%${escaped}%,genre.ilike.%${escaped}%,use_case.ilike.%${escaped}%`,
      );
    }

    return requestBuilder;
  }

  private async countProductsByStatus(
    query: AdminProductsSummaryQueryDto,
    status?: 'PENDING' | 'HIDDEN' | 'PUBLISHED',
  ): Promise<number> {
    const requestBuilder = this.applyProductAdminFilters(
      this.supabaseService.client.from('products').select('id', { count: 'exact' }),
      { ...query, status },
    );

    const { count, error } = await requestBuilder.limit(1);

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return typeof count === 'number' ? count : 0;
  }

  async createProduct(
    payload: AdminCreateProductRequestDto,
    createdBy: string,
  ): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .insert({
        title: payload.title,
        artist_id: payload.artistId,
        author_name: payload.authorName ?? null,
        genre: payload.genre ?? null,
        use_case: payload.useCase ?? null,
        description: payload.description ?? null,
        duration: payload.duration ?? null,
        status: 'PENDING',
        created_by: createdBy,
      })
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .single<DbProductJoinRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { error: complianceError } = await this.supabaseService.client
      .from('compliance_reviews')
      .insert({ track_id: data.id });

    if (complianceError) {
      throw new HttpException(
        complianceError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.getProductById(data.id);
  }

  async getProductById(productId: string): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .eq('id', productId)
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  async updateProduct(
    productId: string,
    payload: AdminUpdateProductRequestDto,
  ): Promise<ProductDto> {
    const updatePayload: Partial<DbProductRow> & Record<string, unknown> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.authorName !== undefined)
      updatePayload.author_name = payload.authorName;
    if (payload.genre !== undefined) updatePayload.genre = payload.genre;
    if (payload.useCase !== undefined) updatePayload.use_case = payload.useCase;
    if (payload.description !== undefined)
      updatePayload.description = payload.description;
    if (payload.duration !== undefined)
      updatePayload.duration = payload.duration;

    const { data, error } = await this.supabaseService.client
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  private async getApprovedPermissionIdsForProduct(productId: string): Promise<{
    legalStatus: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT';
    reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvedPermissionIds: string[];
  }> {
    const { data, error } = await this.supabaseService.client
      .from('compliance_reviews')
      .select(
        'legal_status, review_status, compliance_approved_permissions(permission_id)',
      )
      .eq('track_id', productId)
      .maybeSingle<{
        legal_status: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT';
        review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
        compliance_approved_permissions?: Array<{ permission_id: string }> | null;
      }>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('COMPLIANCE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return {
      legalStatus: data.legal_status,
      reviewStatus: data.review_status,
      approvedPermissionIds: (data.compliance_approved_permissions ?? [])
        .map((item) => item.permission_id)
        .filter((item): item is string => typeof item === 'string' && item.length > 0),
    };
  }

  async replaceAllowedPermissions(
    productId: string,
    permissionIds: string[],
  ): Promise<ProductDto> {
    await this.getProductById(productId);

    const compliance = await this.getApprovedPermissionIdsForProduct(productId);
    if (
      compliance.legalStatus !== 'SUFFICIENT' ||
      compliance.reviewStatus !== 'APPROVED'
    ) {
      throw new HttpException(
        'PRODUCT_ALLOWED_PERMISSIONS_LOCKED_UNTIL_COMPLIANCE_APPROVED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedPermissionIds = Array.from(
      new Set(
        (permissionIds ?? [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );

    const approvedPermissionSet = new Set(compliance.approvedPermissionIds);
    const invalidPermissionIds = normalizedPermissionIds.filter(
      (item) => !approvedPermissionSet.has(item),
    );

    if (invalidPermissionIds.length > 0) {
      throw new HttpException(
        {
          message: 'PERMISSION_NOT_APPROVED_FOR_PRODUCT',
          details: { permissionIds: invalidPermissionIds },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { error: deleteError } = await this.supabaseService.client
      .from('track_allowed_permissions')
      .delete()
      .eq('track_id', productId);

    if (deleteError) {
      throw new HttpException(deleteError.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (normalizedPermissionIds.length > 0) {
      const { error: insertError } = await this.supabaseService.client
        .from('track_allowed_permissions')
        .insert(
          normalizedPermissionIds.map((permissionId) => ({
            track_id: productId,
            permission_id: permissionId,
          })),
        );

      if (insertError) {
        throw new HttpException(insertError.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    return this.getProductById(productId);
  }

  async publishProduct(productId: string): Promise<ProductDto> {
    const track = await this.getProductById(productId);
    if (!track.thumbnailKey) {
      throw new HttpException(
        'PRODUCT_THUMBNAIL_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!track.allowedPermissionIds || track.allowedPermissionIds.length === 0) {
      throw new HttpException(
        'PRODUCT_ALLOWED_PERMISSIONS_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      track.complianceLegalStatus !== 'SUFFICIENT' ||
      track.complianceReviewStatus !== 'APPROVED'
    ) {
      throw new HttpException('COMPLIANCE_NOT_APPROVED', HttpStatus.BAD_REQUEST);
    }

    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ status: 'PUBLISHED' })
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  async hideProduct(productId: string): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ status: 'HIDDEN' })
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  async createOriginalUploadUrl(
    productId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.getProductById(productId);

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
      .from('products')
      .update({ original_audio_key: fileKey })
      .eq('id', productId);

    if (updateError) {
      throw new HttpException(
        updateError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { uploadUrl: data.signedUrl, fileKey };
  }

  async createThumbnailUploadUrl(
    productId: string,
    extension: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.getProductById(productId);

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
      .from('products')
      .update({ thumbnail_key: fileKey })
      .eq('id', productId);

    if (updateError) {
      throw new HttpException(
        updateError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { uploadUrl: data.signedUrl, fileKey };
  }

  async confirmProductAudioUpload(
    productId: string,
    payload: AdminConfirmProductAudioUploadRequestDto,
  ): Promise<ProductDto> {
    await this.getProductById(productId);

    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ original_audio_key: payload.fileKey })
      .eq('id', productId)
      .select('*')
      .maybeSingle<DbProductRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  async confirmProductThumbnailUpload(
    productId: string,
    payload: AdminConfirmProductThumbnailUploadRequestDto,
  ): Promise<ProductDto> {
    await this.getProductById(productId);

    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ thumbnail_key: payload.fileKey })
      .eq('id', productId)
      .select('*')
      .maybeSingle<DbProductRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return mapProductRowToDto(data);
  }

  async createThumbnailUrl(productId: string): Promise<{ thumbnailUrl: string }> {
    const track = await this.getProductById(productId);

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

  async createOriginalPlaybackUrl(
    productId: string,
  ): Promise<{ playbackUrl: string }> {
    const track = await this.getProductById(productId);

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
