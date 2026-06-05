import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../database/supabase.service';
import { buildPaginationMeta } from '../../common/base/pagination-meta';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import {
  AdminCreateProductRequestDto,
  AdminConfirmProductAudioUploadRequestDto,
  AdminConfirmProductThumbnailUploadRequestDto,
  AdminConfirmProductSheetMusicUploadRequestDto,
  AdminProductsListQueryDto,
  AdminProductsSummaryQueryDto,
  AdminUpdateProductRequestDto,
} from './admin-products.dto';
import { ProductDto } from './product.dto';
import {
  applyProductPriorityOrdering,
  PRODUCT_PRIORITY_SELECT,
} from '../product-priorities/product-priority-ordering';

type DbProductRow = {
  id: string;
  title: string;
  artist_id: string;
  author_name: string | null;
  genre: string | null;
  genres: string[] | null;
  duration: number | null;
  status: 'PENDING' | 'HIDDEN' | 'PUBLISHED';
  use_case: string | null;
  use_cases: string[] | null;
  description: string | null;
  original_audio_key: string | null;
  thumbnail_key: string | null;
  sheet_music_pdf_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type DbCorePermissionJoinRow = {
  id: string;
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

type DbProductPriorityJoinRow = {
  priority_score: number;
  is_trigger: boolean;
  effective_start: string | null;
  effective_end: string | null;
};

type DbProductJoinRow = DbProductRow & {
  track_allowed_permissions?: DbProductAllowedPermissionRow[] | null;
  compliance_reviews?: DbComplianceReviewJoinRow[] | DbComplianceReviewJoinRow | null;
  product_priorities?: DbProductPriorityJoinRow[] | DbProductPriorityJoinRow | null;
};

type DbLicensingConfigPermissionRow = {
  core_permission_id: string;
  core_permissions?: DbCorePermissionJoinRow | null;
};

type DbDigitalEligibilityConfigRow = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  target_platform: 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK';
  duration_type: 'ONE_YEAR' | 'PERPETUAL';
  digital_right_config_permissions?: DbLicensingConfigPermissionRow[] | null;
};

type DbPhysicalEligibilityConfigRow = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  venue_usage_type: string;
  physical_right_config_permissions?: DbLicensingConfigPermissionRow[] | null;
};

type DbDigitalRegistrationJoinRow = {
  id: string;
  right_config_id: string;
  status: 'JOINED' | 'REMOVED';
  joined_at: string;
  joined_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
  digital_right_configs?: DbDigitalEligibilityConfigRow | null;
};

type DbPhysicalRegistrationJoinRow = {
  id: string;
  right_config_id: string;
  status: 'JOINED' | 'REMOVED';
  joined_at: string;
  joined_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
  physical_right_configs?: DbPhysicalEligibilityConfigRow | null;
};

type ProductLicensingConfigDefinition = {
  configId: string;
  configType: 'DIGITAL' | 'PHYSICAL';
  title: string;
  referencedPermissions: Array<{
    id: string;
    name: string;
    lawReference: string;
  }>;
};

const createEmptyLicensingEligibility = (): ProductDto['licensingEligibility'] => ({
  digitalConfigs: [],
  physicalConfigs: [],
  summary: {
    eligibleDigitalCount: 0,
    ineligibleDigitalCount: 0,
    eligiblePhysicalCount: 0,
    ineligiblePhysicalCount: 0,
    joinedDigitalCount: 0,
    joinedPhysicalCount: 0,
  },
});

const formatDigitalEligibilityTitle = (
  platform: DbDigitalEligibilityConfigRow['target_platform'],
  durationType: DbDigitalEligibilityConfigRow['duration_type'],
) => `${platform} · ${durationType === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'}`;

const mapReferencedPermissionSummary = (
  permissionId: string,
  permission: DbCorePermissionJoinRow | null | undefined,
) => ({
  id: permission?.id ?? permissionId,
  name: permission?.name ?? permissionId,
  lawReference: permission?.law_reference ?? '',
});

const mapProductRowToDto = (row: DbProductJoinRow): ProductDto => {
  const allowedPermissionRows = (row.track_allowed_permissions ?? []).filter(
    (x): x is DbProductAllowedPermissionRow => !!x && typeof x === 'object',
  );

  const allowedPermissionIds = allowedPermissionRows
    .map((x) => x.permission_id)
    .filter((x): x is string => typeof x === 'string');

  const allowedPermissions = allowedPermissionRows
    .map((x) => mapReferencedPermissionSummary(x.permission_id, x.core_permissions))
    .filter((x) => x.name.length > 0);

  const complianceJoin = row.compliance_reviews;
  const compliance =
    Array.isArray(complianceJoin) && complianceJoin.length > 0
      ? complianceJoin[0]
      : !Array.isArray(complianceJoin) && complianceJoin
        ? complianceJoin
        : null;

  const priorityJoin = row.product_priorities;
  const priority =
    Array.isArray(priorityJoin) && priorityJoin.length > 0
      ? priorityJoin[0]
      : !Array.isArray(priorityJoin) && priorityJoin
        ? priorityJoin
        : null;

  return {
    id: row.id,
    title: row.title,
    artistId: row.artist_id,
    authorName: row.author_name,
    genre: row.genre,
    genres: row.genres ?? (row.genre ? [row.genre] : []),
    duration: row.duration,
    status: row.status,
    useCase: row.use_case,
    useCases: row.use_cases ?? (row.use_case ? [row.use_case] : []),
    description: row.description,
    allowedPermissionIds,
    allowedPermissions,
    licensingEligibility: createEmptyLicensingEligibility(),
    digitalPackageRegistrations: [],
    physicalPackageRegistrations: [],
    complianceLegalStatus: compliance ? compliance.legal_status : null,
    complianceReviewStatus: compliance ? compliance.review_status : null,
    originalAudioKey: row.original_audio_key,
    thumbnailKey: row.thumbnail_key,
    sheetMusicPdfKey: row.sheet_music_pdf_key,
    priority: priority
      ? {
          priorityScore: priority.priority_score,
          isTrigger: priority.is_trigger,
          effectiveStart: priority.effective_start,
          effectiveEnd: priority.effective_end,
        }
      : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeKeyword = (value: string) => value.trim();

const escapePostgrestOrValue = (value: string): string =>
  value
    .replaceAll('%', '')
    .replaceAll(',', ' ')
    .replaceAll('(', ' ')
    .replaceAll(')', ' ')
    .replaceAll('"', ' ')
    .replaceAll("'", ' ')
    .replaceAll(':', ' ')
    .trim();

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

/**
 * Service quản lý Products (admin + creator), bao gồm list/filter/sort, compliance,
 * và các flow upload/signed-url cho audio/thumbnail/sheet music.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đọc bucket name từ env và throw lỗi chuẩn hoá nếu thiếu.
   */
  private getRequiredBucket(envKey: string): string {
    const bucket = this.configService.get<string>(envKey);
    if (typeof bucket === 'string' && bucket.length > 0) return bucket;
    throw new ApiHttpException(
      { code: `MISSING_${envKey}` },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private async createSignedUploadUrlOrThrow(
    bucket: string,
    fileKey: string,
    failedCode: string,
  ): Promise<string> {
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileKey);

    if (data?.signedUrl) return data.signedUrl;

    throw new ApiHttpException(
      { code: failedCode, details: { message: error?.message ?? null } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private async createSignedUrlOrThrow(
    bucket: string,
    fileKey: string,
    failedCode: string,
    objectNotFoundCode: string,
  ): Promise<string> {
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(fileKey, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (data?.signedUrl) return data.signedUrl;

    const errorMessage = error?.message ?? null;
    if (errorMessage === 'Object not found') {
      throw new ApiHttpException({ code: objectNotFoundCode }, HttpStatus.NOT_FOUND);
    }

    throw new ApiHttpException(
      { code: failedCode, details: { message: errorMessage } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private licensingEligibilityDefinitionsCache:
    | {
        value: {
          digitalConfigs: ProductLicensingConfigDefinition[];
          physicalConfigs: ProductLicensingConfigDefinition[];
        };
        expiresAt: number;
      }
    | null = null;

  private async allocateNextStorageKey(
    bucket: string,
    extension: string,
  ): Promise<string> {
    const { data, error } = await this.supabaseService.client.rpc(
      'allocate_storage_index',
      { p_bucket: bucket },
    );

    if (error) {
      throwSupabaseError(
        'STORAGE_ALLOCATE_INDEX_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (typeof data !== 'number') {
      throw new HttpException(
        'Invalid allocate_storage_index response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return `${data}.${extension}`;
  }

  private async loadActiveDigitalEligibilityConfigs(): Promise<
    ProductLicensingConfigDefinition[]
  > {
    const { data, error } = await this.supabaseService.client
      .from('digital_right_configs')
      .select(
        'id, target_platform, duration_type, digital_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference))',
      )
      .eq('status', 'ACTIVE')
      .order('target_platform', { ascending: true })
      .returns<DbDigitalEligibilityConfigRow[]>();

    if (error) {
      throwSupabaseError(
        'DIGITAL_ELIGIBILITY_CONFIGS_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return (data ?? []).map((config) => ({
      configId: config.id,
      configType: 'DIGITAL',
      title: formatDigitalEligibilityTitle(
        config.target_platform,
        config.duration_type,
      ),
      referencedPermissions: (config.digital_right_config_permissions ?? []).map(
        (permissionRow) =>
          mapReferencedPermissionSummary(
            permissionRow.core_permission_id,
            permissionRow.core_permissions,
          ),
      ),
    }));
  }

  private async loadActivePhysicalEligibilityConfigs(): Promise<
    ProductLicensingConfigDefinition[]
  > {
    const { data, error } = await this.supabaseService.client
      .from('physical_right_configs')
      .select(
        'id, venue_usage_type, physical_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference))',
      )
      .eq('status', 'ACTIVE')
      .order('venue_usage_type', { ascending: true })
      .returns<DbPhysicalEligibilityConfigRow[]>();

    if (error) {
      throwSupabaseError(
        'PHYSICAL_ELIGIBILITY_CONFIGS_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return (data ?? []).map((config) => ({
      configId: config.id,
      configType: 'PHYSICAL',
      title: config.venue_usage_type,
      referencedPermissions: (config.physical_right_config_permissions ?? []).map(
        (permissionRow) =>
          mapReferencedPermissionSummary(
            permissionRow.core_permission_id,
            permissionRow.core_permissions,
          ),
      ),
    }));
  }

  private async loadLicensingEligibilityDefinitions(): Promise<{
    digitalConfigs: ProductLicensingConfigDefinition[];
    physicalConfigs: ProductLicensingConfigDefinition[];
  }> {
    const [digitalConfigs, physicalConfigs] = await Promise.all([
      this.loadActiveDigitalEligibilityConfigs(),
      this.loadActivePhysicalEligibilityConfigs(),
    ]);

    return { digitalConfigs, physicalConfigs };
  }

  private async loadLicensingEligibilityDefinitionsCached(): Promise<{
    digitalConfigs: ProductLicensingConfigDefinition[];
    physicalConfigs: ProductLicensingConfigDefinition[];
  }> {
    const now = Date.now();
    const cached = this.licensingEligibilityDefinitionsCache;
    if (cached && cached.expiresAt > now) return cached.value;

    const value = await this.loadLicensingEligibilityDefinitions();
    this.licensingEligibilityDefinitionsCache = {
      value,
      expiresAt: now + 60_000,
    };
    return value;
  }

  private async loadDigitalPackageRegistrations(
    productId: string,
    allowedPermissionIds: string[],
  ): Promise<ProductDto['digitalPackageRegistrations']> {
    const { data, error } = await this.supabaseService.client
      .from('product_digital_right_registrations')
      .select(
        'id,right_config_id,status,joined_at,joined_by,removed_at,removed_by,digital_right_configs(id,status,target_platform,duration_type,digital_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference)))',
      )
      .eq('product_id', productId)
      .order('joined_at', { ascending: false })
      .returns<DbDigitalRegistrationJoinRow[]>();

    if (error) {
      throwSupabaseError(
        'DIGITAL_PACKAGE_REGISTRATIONS_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return (data ?? [])
      .filter((registration) => registration.digital_right_configs)
      .map((registration) => {
        const config = registration.digital_right_configs!;
        const referencedPermissions = (config.digital_right_config_permissions ?? []).map(
          (permissionRow) =>
            mapReferencedPermissionSummary(
              permissionRow.core_permission_id,
              permissionRow.core_permissions,
            ),
        );
        const allowedPermissionSet = new Set(allowedPermissionIds);
        const missingPermissions = referencedPermissions.filter(
          (permission) => !allowedPermissionSet.has(permission.id),
        );

        return {
          registrationId: registration.id,
          configId: registration.right_config_id,
          configType: 'DIGITAL' as const,
          title: formatDigitalEligibilityTitle(
            config.target_platform,
            config.duration_type,
          ),
          configStatus: config.status,
          registrationStatus: registration.status,
          referencedPermissions,
          missingPermissions,
          joinedAt: registration.joined_at,
          joinedBy: registration.joined_by,
          removedAt: registration.removed_at,
          removedBy: registration.removed_by,
        };
      });
  }

  private async loadDigitalPackageRegistrationsByProductIds(
    productIds: string[],
    allowedPermissionIdsByProductId: Record<string, string[]>,
  ): Promise<Record<string, ProductDto['digitalPackageRegistrations']>> {
    if (productIds.length === 0) return {};

    const { data, error } = await this.supabaseService.client
      .from('product_digital_right_registrations')
      .select(
        'product_id,id,right_config_id,status,joined_at,joined_by,removed_at,removed_by,digital_right_configs(id,status,target_platform,duration_type,digital_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference)))',
      )
      .in('product_id', productIds)
      .order('joined_at', { ascending: false })
      .returns<Array<DbDigitalRegistrationJoinRow & { product_id: string }>>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    const grouped = (data ?? []).reduce<
      Record<string, Array<DbDigitalRegistrationJoinRow & { product_id: string }>>
    >((acc, row) => {
      const productId = row.product_id;
      if (!acc[productId]) acc[productId] = [];
      acc[productId].push(row);
      return acc;
    }, {});

    return productIds.reduce<Record<string, ProductDto['digitalPackageRegistrations']>>(
      (acc, productId) => {
        const allowedPermissionIds = allowedPermissionIdsByProductId[productId] ?? [];
        const allowedPermissionSet = new Set(allowedPermissionIds);
        acc[productId] = (grouped[productId] ?? [])
          .filter((registration) => registration.digital_right_configs)
          .map((registration) => {
            const config = registration.digital_right_configs!;
            const referencedPermissions = (config.digital_right_config_permissions ?? []).map(
              (permissionRow) =>
                mapReferencedPermissionSummary(
                  permissionRow.core_permission_id,
                  permissionRow.core_permissions,
                ),
            );
            const missingPermissions = referencedPermissions.filter(
              (permission) => !allowedPermissionSet.has(permission.id),
            );

            return {
              registrationId: registration.id,
              configId: registration.right_config_id,
              configType: 'DIGITAL' as const,
              title: formatDigitalEligibilityTitle(
                config.target_platform,
                config.duration_type,
              ),
              configStatus: config.status,
              registrationStatus: registration.status,
              referencedPermissions,
              missingPermissions,
              joinedAt: registration.joined_at,
              joinedBy: registration.joined_by,
              removedAt: registration.removed_at,
              removedBy: registration.removed_by,
            };
          });
        return acc;
      },
      {},
    );
  }

  private async loadPhysicalPackageRegistrations(
    productId: string,
    allowedPermissionIds: string[],
  ): Promise<ProductDto['physicalPackageRegistrations']> {
    const { data, error } = await this.supabaseService.client
      .from('product_physical_right_registrations')
      .select(
        'id,right_config_id,status,joined_at,joined_by,removed_at,removed_by,physical_right_configs(id,status,venue_usage_type,physical_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference)))',
      )
      .eq('product_id', productId)
      .order('joined_at', { ascending: false })
      .returns<DbPhysicalRegistrationJoinRow[]>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    return (data ?? [])
      .filter((registration) => registration.physical_right_configs)
      .map((registration) => {
        const config = registration.physical_right_configs!;
        const referencedPermissions = (config.physical_right_config_permissions ?? []).map(
          (permissionRow) =>
            mapReferencedPermissionSummary(
              permissionRow.core_permission_id,
              permissionRow.core_permissions,
            ),
        );
        const allowedPermissionSet = new Set(allowedPermissionIds);
        const missingPermissions = referencedPermissions.filter(
          (permission) => !allowedPermissionSet.has(permission.id),
        );

        return {
          registrationId: registration.id,
          configId: registration.right_config_id,
          configType: 'PHYSICAL' as const,
          title: config.venue_usage_type,
          configStatus: config.status,
          registrationStatus: registration.status,
          referencedPermissions,
          missingPermissions,
          joinedAt: registration.joined_at,
          joinedBy: registration.joined_by,
          removedAt: registration.removed_at,
          removedBy: registration.removed_by,
        };
      });
  }

  private async loadPhysicalPackageRegistrationsByProductIds(
    productIds: string[],
    allowedPermissionIdsByProductId: Record<string, string[]>,
  ): Promise<Record<string, ProductDto['physicalPackageRegistrations']>> {
    if (productIds.length === 0) return {};

    const { data, error } = await this.supabaseService.client
      .from('product_physical_right_registrations')
      .select(
        'product_id,id,right_config_id,status,joined_at,joined_by,removed_at,removed_by,physical_right_configs(id,status,venue_usage_type,physical_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference)))',
      )
      .in('product_id', productIds)
      .order('joined_at', { ascending: false })
      .returns<Array<DbPhysicalRegistrationJoinRow & { product_id: string }>>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    const grouped = (data ?? []).reduce<
      Record<string, Array<DbPhysicalRegistrationJoinRow & { product_id: string }>>
    >((acc, row) => {
      const productId = row.product_id;
      if (!acc[productId]) acc[productId] = [];
      acc[productId].push(row);
      return acc;
    }, {});

    return productIds.reduce<Record<string, ProductDto['physicalPackageRegistrations']>>(
      (acc, productId) => {
        const allowedPermissionIds = allowedPermissionIdsByProductId[productId] ?? [];
        const allowedPermissionSet = new Set(allowedPermissionIds);
        acc[productId] = (grouped[productId] ?? [])
          .filter((registration) => registration.physical_right_configs)
          .map((registration) => {
            const config = registration.physical_right_configs!;
            const referencedPermissions = (config.physical_right_config_permissions ?? []).map(
              (permissionRow) =>
                mapReferencedPermissionSummary(
                  permissionRow.core_permission_id,
                  permissionRow.core_permissions,
                ),
            );
            const missingPermissions = referencedPermissions.filter(
              (permission) => !allowedPermissionSet.has(permission.id),
            );

            return {
              registrationId: registration.id,
              configId: registration.right_config_id,
              configType: 'PHYSICAL' as const,
              title: config.venue_usage_type,
              configStatus: config.status,
              registrationStatus: registration.status,
              referencedPermissions,
              missingPermissions,
              joinedAt: registration.joined_at,
              joinedBy: registration.joined_by,
              removedAt: registration.removed_at,
              removedBy: registration.removed_by,
            };
          });
        return acc;
      },
      {},
    );
  }

  private mapConfigEligibility(
    config: ProductLicensingConfigDefinition,
    allowedPermissionIds: string[],
    joinedRegistration:
      | ProductDto['digitalPackageRegistrations'][number]
      | ProductDto['physicalPackageRegistrations'][number]
      | undefined,
  ): ProductDto['licensingEligibility']['digitalConfigs'][number] {
    const allowedPermissionSet = new Set(allowedPermissionIds);
    const missingPermissions = config.referencedPermissions.filter(
      (permission) => !allowedPermissionSet.has(permission.id),
    );

    return {
      configId: config.configId,
      configType: config.configType,
      title: config.title,
      status: missingPermissions.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE',
      referencedPermissions: config.referencedPermissions,
      missingPermissions,
      registrationStatus:
        joinedRegistration?.registrationStatus === 'JOINED'
          ? 'JOINED'
          : 'NOT_JOINED',
      registrationId:
        joinedRegistration?.registrationStatus === 'JOINED'
          ? joinedRegistration.registrationId
          : null,
      joinedAt:
        joinedRegistration?.registrationStatus === 'JOINED'
          ? joinedRegistration.joinedAt
          : null,
      joinedBy:
        joinedRegistration?.registrationStatus === 'JOINED'
          ? joinedRegistration.joinedBy
          : null,
    };
  }

  private enrichProductWithLicensingEligibilityFromRegistrations(
    product: ProductDto,
    definitions: {
      digitalConfigs: ProductLicensingConfigDefinition[];
      physicalConfigs: ProductLicensingConfigDefinition[];
    },
    digitalPackageRegistrations: ProductDto['digitalPackageRegistrations'],
    physicalPackageRegistrations: ProductDto['physicalPackageRegistrations'],
  ): ProductDto {
    const joinedDigitalByConfigId = new Map(
      digitalPackageRegistrations
        .filter((registration) => registration.registrationStatus === 'JOINED')
        .map((registration) => [registration.configId, registration]),
    );
    const joinedPhysicalByConfigId = new Map(
      physicalPackageRegistrations
        .filter((registration) => registration.registrationStatus === 'JOINED')
        .map((registration) => [registration.configId, registration]),
    );

    const digitalConfigs = definitions.digitalConfigs.map((config) =>
      this.mapConfigEligibility(
        config,
        product.allowedPermissionIds,
        joinedDigitalByConfigId.get(config.configId),
      ),
    );
    const physicalConfigs = definitions.physicalConfigs.map((config) =>
      this.mapConfigEligibility(
        config,
        product.allowedPermissionIds,
        joinedPhysicalByConfigId.get(config.configId),
      ),
    );

    return {
      ...product,
      digitalPackageRegistrations,
      physicalPackageRegistrations,
      licensingEligibility: {
        digitalConfigs,
        physicalConfigs,
        summary: {
          eligibleDigitalCount: digitalConfigs.filter(
            (config) => config.status === 'ELIGIBLE',
          ).length,
          ineligibleDigitalCount: digitalConfigs.filter(
            (config) => config.status === 'INELIGIBLE',
          ).length,
          eligiblePhysicalCount: physicalConfigs.filter(
            (config) => config.status === 'ELIGIBLE',
          ).length,
          ineligiblePhysicalCount: physicalConfigs.filter(
            (config) => config.status === 'INELIGIBLE',
          ).length,
          joinedDigitalCount: digitalPackageRegistrations.filter(
            (registration) => registration.registrationStatus === 'JOINED',
          ).length,
          joinedPhysicalCount: physicalPackageRegistrations.filter(
            (registration) => registration.registrationStatus === 'JOINED',
          ).length,
        },
      },
    };
  }

  private async enrichProductWithLicensingEligibility(
    product: ProductDto,
    definitions: {
      digitalConfigs: ProductLicensingConfigDefinition[];
      physicalConfigs: ProductLicensingConfigDefinition[];
    },
  ): Promise<ProductDto> {
    const [digitalPackageRegistrations, physicalPackageRegistrations] =
      await Promise.all([
        this.loadDigitalPackageRegistrations(product.id, product.allowedPermissionIds),
        this.loadPhysicalPackageRegistrations(product.id, product.allowedPermissionIds),
      ]);

    return this.enrichProductWithLicensingEligibilityFromRegistrations(
      product,
      definitions,
      digitalPackageRegistrations,
      physicalPackageRegistrations,
    );
  }

  async listAdminProducts(
    query: AdminProductsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ProductDto[] }, PaginationMeta>> {
    const { column, ascending } = parseSort(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    const rawRequestBuilder = applyProductPriorityOrdering(
      this.supabaseService.client
        .from('products')
        .select(
          `*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status), ${PRODUCT_PRIORITY_SELECT}`,
          { count: 'exact' },
        )
        .order(column, { ascending })
        .returns<DbProductJoinRow[]>(),
    );
    const requestBuilder = this.applyProductAdminFilters(
      rawRequestBuilder as unknown,
      query,
    ) as unknown as {
      range: (
        from: number,
        to: number,
      ) => Promise<{
        data: unknown;
        error: { message: string } | null;
        count: unknown;
      }>;
    };

    const { data, error, count } = await requestBuilder.range(from, to);

    if (error) throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);

    const productRows = (data ?? []) as DbProductJoinRow[];
    const productDtos: ProductDto[] = productRows.map(mapProductRowToDto);
    const definitions = await this.loadLicensingEligibilityDefinitionsCached();
    const totalItems = typeof count === 'number' ? count : 0;
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems);

    const productIds = productDtos.map((item) => item.id);
    const allowedPermissionIdsByProductId = productDtos.reduce(
      (acc, item) => {
        acc[item.id] = item.allowedPermissionIds;
        return acc;
      },
      {} as Record<string, string[]>,
    );
    const [digitalRegistrationsByProductId, physicalRegistrationsByProductId] =
      await Promise.all([
        this.loadDigitalPackageRegistrationsByProductIds(
          productIds,
          allowedPermissionIdsByProductId,
        ),
        this.loadPhysicalPackageRegistrationsByProductIds(
          productIds,
          allowedPermissionIdsByProductId,
        ),
      ]);

    return {
      data: {
        items: productDtos.map((product) =>
          this.enrichProductWithLicensingEligibilityFromRegistrations(
            product,
            definitions,
            digitalRegistrationsByProductId[product.id] ?? [],
            physicalRegistrationsByProductId[product.id] ?? [],
          ),
        ),
      },
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
    requestBuilder: unknown,
    query: Pick<
      AdminProductsSummaryQueryDto,
      'keyword' | 'q' | 'genre' | 'artistId'
    > & { status?: 'PENDING' | 'HIDDEN' | 'PUBLISHED' },
  ) {
    type FilterableBuilder = {
      eq: (column: string, value: unknown) => unknown;
      contains: (column: string, value: unknown) => unknown;
      or: (filters: string) => unknown;
    };

    let builder = requestBuilder as FilterableBuilder;
    const keyword =
      typeof query.keyword === 'string' && query.keyword.trim().length > 0
        ? normalizeKeyword(query.keyword)
        : typeof query.q === 'string' && query.q.trim().length > 0
          ? normalizeKeyword(query.q)
          : undefined;

    if (query.status) builder = builder.eq('status', query.status) as FilterableBuilder;
    if (query.genre) builder = builder.contains('genres', [query.genre]) as FilterableBuilder;
    if (query.artistId) builder = builder.eq('artist_id', query.artistId) as FilterableBuilder;

    if (keyword) {
      const escaped = escapePostgrestOrValue(keyword);
      builder = builder.or(
        `title.ilike.%${escaped}%,author_name.ilike.%${escaped}%,genre.ilike.%${escaped}%,use_case.ilike.%${escaped}%`,
      ) as FilterableBuilder;
    }

    return builder;
  }

  private async countProductsByStatus(
    query: AdminProductsSummaryQueryDto,
    status?: 'PENDING' | 'HIDDEN' | 'PUBLISHED',
  ): Promise<number> {
    const rawRequestBuilder = this.supabaseService.client
      .from('products')
      .select('id', { count: 'exact' });
    const requestBuilder = this.applyProductAdminFilters(rawRequestBuilder as unknown, {
      ...query,
      status,
    }) as unknown as {
      limit: (count: number) => Promise<{ count: unknown; error: { message: string } | null }>;
    };

    const { count, error } = await requestBuilder.limit(1);

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    return typeof count === 'number' ? count : 0;
  }

  async createProduct(
    payload: AdminCreateProductRequestDto,
    createdBy: string,
  ): Promise<ProductDto> {
    const genres = payload.genres ?? (payload.genre ? [payload.genre] : []);
    const useCases = payload.useCases ?? (payload.useCase ? [payload.useCase] : []);

    const { data, error } = await this.supabaseService.client
      .from('products')
      .insert({
        title: payload.title,
        artist_id: payload.artistId,
        author_name: payload.authorName ?? null,
        genre: genres[0] ?? null,
        genres,
        use_case: useCases[0] ?? null,
        use_cases: useCases,
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'PRODUCT_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { error: complianceError } = await this.supabaseService.client
      .from('compliance_reviews')
      .insert({ track_id: data.id });

    if (complianceError) {
      throwSupabaseError(
        'COMPLIANCE_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        complianceError,
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
  }

  private async ensureProductExists(productId: string) {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle<{ id: string }>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
  }

  async listCreatorProducts(artistId: string): Promise<{ items: ProductDto[] }> {
    const requestBuilder = applyProductPriorityOrdering(
      this.supabaseService.client
        .from('products')
        .select(
          `*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status), ${PRODUCT_PRIORITY_SELECT}`,
        )
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .returns<DbProductJoinRow[]>(),
    );

    const { data, error } = await requestBuilder;

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    const definitions = await this.loadLicensingEligibilityDefinitionsCached();

    return {
      items: await Promise.all(
        (data ?? []).map((row) =>
          this.enrichProductWithLicensingEligibility(
            mapProductRowToDto(row),
            definitions,
          ),
        ),
      ),
    };
  }

  async getCreatorProductById(productId: string, artistId: string): Promise<ProductDto> {
    const product = await this.getProductById(productId);
    if (product.artistId !== artistId) {
      throw new HttpException('FORBIDDEN_PRODUCT_ACCESS', HttpStatus.FORBIDDEN);
    }
    return product;
  }

  async updateProduct(
    productId: string,
    payload: AdminUpdateProductRequestDto,
  ): Promise<ProductDto> {
    const updatePayload: Partial<DbProductRow> & Record<string, unknown> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.authorName !== undefined)
      updatePayload.author_name = payload.authorName;
    if (payload.genres !== undefined) {
      updatePayload.genres = payload.genres;
      updatePayload.genre = payload.genres[0] ?? null;
    } else if (payload.genre !== undefined) {
      updatePayload.genres = payload.genre ? [payload.genre] : [];
      updatePayload.genre = payload.genre;
    }
    if (payload.useCases !== undefined) {
      updatePayload.use_cases = payload.useCases;
      updatePayload.use_case = payload.useCases[0] ?? null;
    } else if (payload.useCase !== undefined) {
      updatePayload.use_cases = payload.useCase ? [payload.useCase] : [];
      updatePayload.use_case = payload.useCase;
    }
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
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
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
  }

  async createOriginalUploadUrl(
    productId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.ensureProductExists(productId);

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_ORIGINAL_AUDIO');

    const fileKey = await this.allocateNextStorageKey(bucket, 'mp3');
    const uploadUrl = await this.createSignedUploadUrlOrThrow(
      bucket,
      fileKey,
      'PRODUCT_ORIGINAL_AUDIO_SIGNED_UPLOAD_URL_CREATE_FAILED',
    );

    return { uploadUrl, fileKey };
  }

  async createThumbnailUploadUrl(
    productId: string,
    extension: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.ensureProductExists(productId);

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_TRACK_THUMBNAILS');

    const fileKey = await this.allocateNextStorageKey(bucket, extension);
    const uploadUrl = await this.createSignedUploadUrlOrThrow(
      bucket,
      fileKey,
      'PRODUCT_THUMBNAIL_SIGNED_UPLOAD_URL_CREATE_FAILED',
    );

    return { uploadUrl, fileKey };
  }

  async confirmProductAudioUpload(
    productId: string,
    payload: AdminConfirmProductAudioUploadRequestDto,
  ): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ original_audio_key: payload.fileKey })
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
  }

  async confirmProductThumbnailUpload(
    productId: string,
    payload: AdminConfirmProductThumbnailUploadRequestDto,
  ): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ thumbnail_key: payload.fileKey })
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
  }

  async confirmProductSheetMusicUpload(
    productId: string,
    payload: AdminConfirmProductSheetMusicUploadRequestDto,
  ): Promise<ProductDto> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .update({ sheet_music_pdf_key: payload.fileKey })
      .eq('id', productId)
      .select(
        '*, track_allowed_permissions(permission_id, core_permissions(name,law_reference)), compliance_reviews(legal_status,review_status)',
      )
      .maybeSingle<DbProductJoinRow>();

    if (error) {
      throwSupabaseError('PRODUCTS_QUERY_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return await this.enrichProductWithLicensingEligibility(
      mapProductRowToDto(data),
      await this.loadLicensingEligibilityDefinitionsCached(),
    );
  }

  async createThumbnailUrl(productId: string): Promise<{ thumbnailUrl: string }> {
    const track = await this.getProductById(productId);

    if (!track.thumbnailKey) {
      throw new ApiHttpException(
        { code: 'PRODUCT_THUMBNAIL_NOT_AVAILABLE' },
        HttpStatus.NOT_FOUND,
      );
    }

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_TRACK_THUMBNAILS');
    const thumbnailUrl = await this.createSignedUrlOrThrow(
      bucket,
      track.thumbnailKey,
      'PRODUCT_THUMBNAIL_SIGNED_URL_CREATE_FAILED',
      'PRODUCT_THUMBNAIL_OBJECT_NOT_FOUND',
    );
    return { thumbnailUrl };
  }

  async createOriginalPlaybackUrl(
    productId: string,
  ): Promise<{ playbackUrl: string }> {
    const track = await this.getProductById(productId);

    const audioKey = track.originalAudioKey;
    if (!audioKey) {
      throw new ApiHttpException(
        { code: 'PRODUCT_AUDIO_NOT_AVAILABLE' },
        HttpStatus.NOT_FOUND,
      );
    }

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_ORIGINAL_AUDIO');
    const playbackUrl = await this.createSignedUrlOrThrow(
      bucket,
      audioKey,
      'PRODUCT_AUDIO_SIGNED_URL_CREATE_FAILED',
      'PRODUCT_AUDIO_OBJECT_NOT_FOUND',
    );

    return { playbackUrl };
  }

  async createSheetMusicUploadUrl(
    productId: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    await this.ensureProductExists(productId);

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_SHEET_MUSIC');

    const fileKey = `products/${productId}/sheet-music/${randomUUID()}.pdf`;
    const uploadUrl = await this.createSignedUploadUrlOrThrow(
      bucket,
      fileKey,
      'PRODUCT_SHEET_MUSIC_SIGNED_UPLOAD_URL_CREATE_FAILED',
    );

    return { uploadUrl, fileKey };
  }

  async createSheetMusicUrl(
    productId: string,
  ): Promise<{ sheetMusicUrl: string }> {
    const product = await this.getProductById(productId);
    const fileKey = product.sheetMusicPdfKey;
    if (!fileKey) {
      throw new ApiHttpException(
        { code: 'PRODUCT_SHEET_MUSIC_NOT_AVAILABLE' },
        HttpStatus.NOT_FOUND,
      );
    }

    const bucket = this.getRequiredBucket('STORAGE_BUCKET_SHEET_MUSIC');
    const sheetMusicUrl = await this.createSignedUrlOrThrow(
      bucket,
      fileKey,
      'PRODUCT_SHEET_MUSIC_SIGNED_URL_CREATE_FAILED',
      'PRODUCT_SHEET_MUSIC_OBJECT_NOT_FOUND',
    );

    return { sheetMusicUrl };
  }
}
