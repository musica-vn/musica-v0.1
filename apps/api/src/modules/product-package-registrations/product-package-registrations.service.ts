import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/base/pagination-meta';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import { SupabaseService } from '../../database/supabase.service';
import {
  applyProductPriorityOrdering,
  PRODUCT_PRIORITY_SELECT,
} from '../product-priorities/product-priority-ordering';
import type {
  ProductPackageRegistrationEligibilityStatus,
  ProductPackageRegistrationItemDto,
  ProductPackageRegistrationListQueryDto,
  ProductPackageRegistrationStatus,
  ProductPackageType,
} from './product-package-registrations.dto';

type PermissionSummary = {
  id: string;
  name: string;
  lawReference: string;
};

type ProductEligibilityContext = {
  productId: string;
  productTitle: string;
  artistId: string;
  allowedPermissionIds: string[];
};

type DbCorePermissionRow = {
  id: string;
  name: string;
  law_reference: string;
};

type DbConfigPermissionRow = {
  core_permission_id: string;
  core_permissions?: DbCorePermissionRow | null;
};

type DbDigitalConfigRow = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  target_platform: 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK';
  duration_type: 'ONE_YEAR' | 'PERPETUAL';
  digital_right_config_permissions?: DbConfigPermissionRow[] | null;
};

type DbPhysicalConfigRow = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  venue_usage_type: string;
  physical_right_config_permissions?: DbConfigPermissionRow[] | null;
};

type DbDigitalRegistrationRow = {
  id: string;
  product_id: string;
  right_config_id: string;
  status: ProductPackageRegistrationStatus;
  joined_at: string;
  joined_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
};

type DbPhysicalRegistrationRow = DbDigitalRegistrationRow;

const mapPermission = (
  permissionId: string,
  permission: DbCorePermissionRow | null | undefined,
): PermissionSummary => ({
  id: permission?.id ?? permissionId,
  name: permission?.name ?? permissionId,
  lawReference: permission?.law_reference ?? '',
});

const formatDigitalTitle = (
  platform: DbDigitalConfigRow['target_platform'],
  durationType: DbDigitalConfigRow['duration_type'],
) => `${platform} · ${durationType === 'ONE_YEAR' ? '1 năm' : 'Vĩnh viễn'}`;

@Injectable()
export class ProductPackageRegistrationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getProductEligibilityContext(
    productId: string,
  ): Promise<ProductEligibilityContext> {
    const { data, error } = await this.supabaseService.client
      .from('products')
      .select('id,title,artist_id,track_allowed_permissions(permission_id)')
      .eq('id', productId)
      .maybeSingle<{
        id: string;
        title: string;
        artist_id: string;
        track_allowed_permissions?: Array<{ permission_id: string }> | null;
      }>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return {
      productId: data.id,
      productTitle: data.title,
      artistId: data.artist_id,
      allowedPermissionIds: (data.track_allowed_permissions ?? [])
        .map((item) => item.permission_id)
        .filter((item): item is string => typeof item === 'string' && item.length > 0),
    };
  }

  private assertOwnership(product: ProductEligibilityContext, userId: string) {
    if (product.artistId !== userId) {
      throw new HttpException('FORBIDDEN_PRODUCT_ACCESS', HttpStatus.FORBIDDEN);
    }
  }

  private computeEligibility(
    allowedPermissionIds: string[],
    referencedPermissions: PermissionSummary[],
  ): {
    eligibilityStatus: ProductPackageRegistrationEligibilityStatus;
    missingPermissions: PermissionSummary[];
  } {
    const allowedPermissionSet = new Set(allowedPermissionIds);
    const missingPermissions = referencedPermissions.filter(
      (permission) => !allowedPermissionSet.has(permission.id),
    );

    return {
      eligibilityStatus: missingPermissions.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE',
      missingPermissions,
    };
  }

  private mapDigitalRegistrationItem(
    registration: DbDigitalRegistrationRow,
    config: DbDigitalConfigRow,
    product: ProductEligibilityContext,
  ): ProductPackageRegistrationItemDto {
    const referencedPermissions = (config.digital_right_config_permissions ?? []).map(
      (permissionRow) =>
        mapPermission(permissionRow.core_permission_id, permissionRow.core_permissions),
    );
    const { eligibilityStatus, missingPermissions } = this.computeEligibility(
      product.allowedPermissionIds,
      referencedPermissions,
    );

    return {
      registrationId: registration.id,
      productId: registration.product_id,
      productTitle: product.productTitle,
      configId: registration.right_config_id,
      packageType: 'DIGITAL',
      title: formatDigitalTitle(config.target_platform, config.duration_type),
      configStatus: config.status,
      eligibilityStatus,
      registrationStatus: registration.status,
      referencedPermissions,
      missingPermissions,
      joinedAt: registration.joined_at,
      joinedBy: registration.joined_by,
      removedAt: registration.removed_at,
      removedBy: registration.removed_by,
    };
  }

  private mapPhysicalRegistrationItem(
    registration: DbPhysicalRegistrationRow,
    config: DbPhysicalConfigRow,
    product: ProductEligibilityContext,
  ): ProductPackageRegistrationItemDto {
    const referencedPermissions = (config.physical_right_config_permissions ?? []).map(
      (permissionRow) =>
        mapPermission(permissionRow.core_permission_id, permissionRow.core_permissions),
    );
    const { eligibilityStatus, missingPermissions } = this.computeEligibility(
      product.allowedPermissionIds,
      referencedPermissions,
    );

    return {
      registrationId: registration.id,
      productId: registration.product_id,
      productTitle: product.productTitle,
      configId: registration.right_config_id,
      packageType: 'PHYSICAL',
      title: config.venue_usage_type,
      configStatus: config.status,
      eligibilityStatus,
      registrationStatus: registration.status,
      referencedPermissions,
      missingPermissions,
      joinedAt: registration.joined_at,
      joinedBy: registration.joined_by,
      removedAt: registration.removed_at,
      removedBy: registration.removed_by,
    };
  }

  private async getDigitalConfig(configId: string): Promise<DbDigitalConfigRow> {
    const { data, error } = await this.supabaseService.client
      .from('digital_right_configs')
      .select(
        'id,status,target_platform,duration_type,digital_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference))',
      )
      .eq('id', configId)
      .maybeSingle<DbDigitalConfigRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('DIGITAL_RIGHT_CONFIG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return data;
  }

  private async getPhysicalConfig(configId: string): Promise<DbPhysicalConfigRow> {
    const { data, error } = await this.supabaseService.client
      .from('physical_right_configs')
      .select(
        'id,status,venue_usage_type,physical_right_config_permissions(core_permission_id, core_permissions(id,name,law_reference))',
      )
      .eq('id', configId)
      .maybeSingle<DbPhysicalConfigRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PHYSICAL_RIGHT_CONFIG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return data;
  }

  private async assertCanJoinDigital(
    product: ProductEligibilityContext,
    configId: string,
  ): Promise<DbDigitalConfigRow> {
    const config = await this.getDigitalConfig(configId);
    if (config.status !== 'ACTIVE') {
      throw new HttpException('PACKAGE_IS_INACTIVE', HttpStatus.BAD_REQUEST);
    }

    if (product.allowedPermissionIds.length === 0) {
      throw new HttpException(
        'PRODUCT_ALLOWED_PERMISSIONS_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const referencedPermissions = (config.digital_right_config_permissions ?? []).map(
      (permissionRow) =>
        mapPermission(permissionRow.core_permission_id, permissionRow.core_permissions),
    );
    const eligibility = this.computeEligibility(
      product.allowedPermissionIds,
      referencedPermissions,
    );

    if (eligibility.eligibilityStatus !== 'ELIGIBLE') {
      throw new HttpException(
        {
          message: 'PACKAGE_ELIGIBILITY_FAILED',
          details: { missingPermissions: eligibility.missingPermissions },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return config;
  }

  private async assertCanJoinPhysical(
    product: ProductEligibilityContext,
    configId: string,
  ): Promise<DbPhysicalConfigRow> {
    const config = await this.getPhysicalConfig(configId);
    if (config.status !== 'ACTIVE') {
      throw new HttpException('PACKAGE_IS_INACTIVE', HttpStatus.BAD_REQUEST);
    }

    if (product.allowedPermissionIds.length === 0) {
      throw new HttpException(
        'PRODUCT_ALLOWED_PERMISSIONS_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const referencedPermissions = (config.physical_right_config_permissions ?? []).map(
      (permissionRow) =>
        mapPermission(permissionRow.core_permission_id, permissionRow.core_permissions),
    );
    const eligibility = this.computeEligibility(
      product.allowedPermissionIds,
      referencedPermissions,
    );

    if (eligibility.eligibilityStatus !== 'ELIGIBLE') {
      throw new HttpException(
        {
          message: 'PACKAGE_ELIGIBILITY_FAILED',
          details: { missingPermissions: eligibility.missingPermissions },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return config;
  }

  async createDigitalRegistration(
    productId: string,
    configId: string,
    actorUserId: string,
  ): Promise<ProductPackageRegistrationItemDto> {
    const product = await this.getProductEligibilityContext(productId);
    const config = await this.assertCanJoinDigital(product, configId);

    const { data, error } = await this.supabaseService.client
      .from('product_digital_right_registrations')
      .insert({
        product_id: productId,
        right_config_id: configId,
        status: 'JOINED',
        joined_by: actorUserId,
      })
      .select('*')
      .maybeSingle<DbDigitalRegistrationRow>();

    if (error) {
      if (error.code === '23505') {
        throw new HttpException('PACKAGE_ALREADY_JOINED', HttpStatus.CONFLICT);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException(
        'DIGITAL_PACKAGE_REGISTRATION_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.mapDigitalRegistrationItem(data, config, product);
  }

  async createPhysicalRegistration(
    productId: string,
    configId: string,
    actorUserId: string,
  ): Promise<ProductPackageRegistrationItemDto> {
    const product = await this.getProductEligibilityContext(productId);
    const config = await this.assertCanJoinPhysical(product, configId);

    const { data, error } = await this.supabaseService.client
      .from('product_physical_right_registrations')
      .insert({
        product_id: productId,
        right_config_id: configId,
        status: 'JOINED',
        joined_by: actorUserId,
      })
      .select('*')
      .maybeSingle<DbPhysicalRegistrationRow>();

    if (error) {
      if (error.code === '23505') {
        throw new HttpException('PACKAGE_ALREADY_JOINED', HttpStatus.CONFLICT);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException(
        'PHYSICAL_PACKAGE_REGISTRATION_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.mapPhysicalRegistrationItem(data, config, product);
  }

  async removeDigitalRegistration(
    productId: string,
    registrationId: string,
    actorUserId: string,
  ): Promise<ProductPackageRegistrationItemDto> {
    const product = await this.getProductEligibilityContext(productId);

    const { data, error } = await this.supabaseService.client
      .from('product_digital_right_registrations')
      .update({
        status: 'REMOVED',
        removed_at: new Date().toISOString(),
        removed_by: actorUserId,
      })
      .eq('id', registrationId)
      .eq('product_id', productId)
      .eq('status', 'JOINED')
      .select('*')
      .maybeSingle<DbDigitalRegistrationRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PACKAGE_REGISTRATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const config = await this.getDigitalConfig(data.right_config_id);
    return this.mapDigitalRegistrationItem(data, config, product);
  }

  async removePhysicalRegistration(
    productId: string,
    registrationId: string,
    actorUserId: string,
  ): Promise<ProductPackageRegistrationItemDto> {
    const product = await this.getProductEligibilityContext(productId);

    const { data, error } = await this.supabaseService.client
      .from('product_physical_right_registrations')
      .update({
        status: 'REMOVED',
        removed_at: new Date().toISOString(),
        removed_by: actorUserId,
      })
      .eq('id', registrationId)
      .eq('product_id', productId)
      .eq('status', 'JOINED')
      .select('*')
      .maybeSingle<DbPhysicalRegistrationRow>();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data) {
      throw new HttpException('PACKAGE_REGISTRATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const config = await this.getPhysicalConfig(data.right_config_id);
    return this.mapPhysicalRegistrationItem(data, config, product);
  }

  async creatorCreateDigitalRegistration(
    productId: string,
    configId: string,
    actorUserId: string,
  ) {
    const product = await this.getProductEligibilityContext(productId);
    this.assertOwnership(product, actorUserId);
    return this.createDigitalRegistration(productId, configId, actorUserId);
  }

  async creatorCreatePhysicalRegistration(
    productId: string,
    configId: string,
    actorUserId: string,
  ) {
    const product = await this.getProductEligibilityContext(productId);
    this.assertOwnership(product, actorUserId);
    return this.createPhysicalRegistration(productId, configId, actorUserId);
  }

  async creatorRemoveDigitalRegistration(
    productId: string,
    registrationId: string,
    actorUserId: string,
  ) {
    const product = await this.getProductEligibilityContext(productId);
    this.assertOwnership(product, actorUserId);
    return this.removeDigitalRegistration(productId, registrationId, actorUserId);
  }

  async creatorRemovePhysicalRegistration(
    productId: string,
    registrationId: string,
    actorUserId: string,
  ) {
    const product = await this.getProductEligibilityContext(productId);
    this.assertOwnership(product, actorUserId);
    return this.removePhysicalRegistration(productId, registrationId, actorUserId);
  }

  async listProductsForDigitalConfig(
    configId: string,
    query: ProductPackageRegistrationListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ProductPackageRegistrationItemDto[] }, PaginationMeta>> {
    await this.getDigitalConfig(configId);

    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let requestBuilder = this.supabaseService.client
      .from('product_digital_right_registrations')
      .select('*', { count: 'exact' })
      .eq('right_config_id', configId)
      .order('joined_at', { ascending: false });

    if (query.status) requestBuilder = requestBuilder.eq('status', query.status);

    const { data, error, count } = await requestBuilder.range(from, to).returns<DbDigitalRegistrationRow[]>();
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const items = await Promise.all(
      (data ?? []).map(async (registration) => {
        const [config, product] = await Promise.all([
          this.getDigitalConfig(registration.right_config_id),
          this.getProductEligibilityContext(registration.product_id),
        ]);
        return this.mapDigitalRegistrationItem(
          registration,
          config,
          product,
        );
      }),
    );

    const filteredItems =
      query.keyword && query.keyword.trim().length > 0
        ? items.filter((item) =>
            item.title.toLowerCase().includes(query.keyword!.trim().toLowerCase()),
          )
        : items;

    return {
      data: { items: filteredItems },
      meta: buildPaginationMeta(
        query.page,
        query.pageSize,
        typeof count === 'number' ? count : filteredItems.length,
      ),
    };
  }

  async listProductsForPhysicalConfig(
    configId: string,
    query: ProductPackageRegistrationListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ProductPackageRegistrationItemDto[] }, PaginationMeta>> {
    await this.getPhysicalConfig(configId);

    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let requestBuilder = this.supabaseService.client
      .from('product_physical_right_registrations')
      .select('*', { count: 'exact' })
      .eq('right_config_id', configId)
      .order('joined_at', { ascending: false });

    if (query.status) requestBuilder = requestBuilder.eq('status', query.status);

    const { data, error, count } = await requestBuilder.range(from, to).returns<DbPhysicalRegistrationRow[]>();
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const items = await Promise.all(
      (data ?? []).map(async (registration) => {
        const [config, product] = await Promise.all([
          this.getPhysicalConfig(registration.right_config_id),
          this.getProductEligibilityContext(registration.product_id),
        ]);
        return this.mapPhysicalRegistrationItem(
          registration,
          config,
          product,
        );
      }),
    );

    const filteredItems =
      query.keyword && query.keyword.trim().length > 0
        ? items.filter((item) =>
            item.title.toLowerCase().includes(query.keyword!.trim().toLowerCase()),
          )
        : items;

    return {
      data: { items: filteredItems },
      meta: buildPaginationMeta(
        query.page,
        query.pageSize,
        typeof count === 'number' ? count : filteredItems.length,
      ),
    };
  }

  async listCreatorProducts(actorUserId: string) {
    const { data, error } = await applyProductPriorityOrdering(
      this.supabaseService.client
        .from('products')
        .select(`id, ${PRODUCT_PRIORITY_SELECT}`)
        .eq('artist_id', actorUserId),
    ).order('created_at', { ascending: false });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      items: (data ?? []).map((item) => ({ id: item.id })),
    };
  }
}
