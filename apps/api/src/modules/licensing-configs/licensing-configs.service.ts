import { HttpStatus, Injectable } from '@nestjs/common'
import type { PaginationMeta } from '@musica/contracts'
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor'
import { buildPaginationMeta } from '../../common/base/pagination-meta'
import { ApiHttpException } from '../../common/errors/api-http.exception'
import { SupabaseService } from '../../database/supabase.service'
import {
  VARIANT_PRICING_MODIFIER_KEYS,
  type VariantPricingModifierKey,
} from '../pricing/variant-pricing.enums'
import type {
  ConfigPermissionSummaryDto,
  ConfigStatus,
  ConfigPriceModifierDto,
  CreateDigitalRightConfigRequestDto,
  CreateExpressionConfigRequestDto,
  CreateModificationConfigRequestDto,
  CreatePhysicalRightConfigRequestDto,
  DigitalRightConfigDto,
  DigitalRightConfigsListQueryDto,
  ExpressionConfigDto,
  GenericConfigsListQueryDto,
  ModificationConfigDto,
  PhysicalRightConfigDto,
  UpdateConfigStatusRequestDto,
  UpdateDigitalRightConfigRequestDto,
  UpdateExpressionConfigRequestDto,
  UpdateModificationConfigRequestDto,
  UpdatePhysicalRightConfigRequestDto,
} from './licensing-configs.dto'

type DbConfigPermissionRelationRow = {
  core_permission_id: string
  core_permissions:
    | {
        id: string
        name: string
        law_reference: string
      }
    | null
}

type DbDigitalRightConfigRow = {
  id: string
  target_platform: 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK'
  duration_type: 'ONE_YEAR' | 'PERPETUAL'
  base_price_multiplier: number | string
  status: ConfigStatus
  created_at: string
  updated_at: string
  digital_right_config_permissions?: DbConfigPermissionRelationRow[]
  digital_right_config_price_modifiers?: DbPriceModifierRow[]
}

type DbPhysicalRightConfigRow = {
  id: string
  venue_usage_type: string
  base_price_multiplier: number | string
  status: ConfigStatus
  created_at: string
  updated_at: string
  physical_right_config_permissions?: DbConfigPermissionRelationRow[]
  physical_right_config_price_modifiers?: DbPriceModifierRow[]
}

type DbPriceModifierRow = {
  id: string
  modifier_key: string
  multiplier: number | string
  created_at: string
}

type DbExpressionConfigRow = {
  id: string
  name: string
  price_multiplier: number | string
  status: ConfigStatus
  created_at: string
  updated_at: string
  expression_config_permissions?: DbConfigPermissionRelationRow[]
}

type DbModificationConfigRow = {
  id: string
  name: string
  price_multiplier: number | string
  status: ConfigStatus
  created_at: string
  updated_at: string
  modification_config_permissions?: DbConfigPermissionRelationRow[]
}

type ConfigResourceDefinition = {
  tableName: string
  mappingTableName: string
  mappingForeignKey: string
}

type PriceModifierResourceDefinition = {
  tableName: string
  mappingForeignKey: string
}

const digitalRightConfigResource: ConfigResourceDefinition = {
  tableName: 'digital_right_configs',
  mappingTableName: 'digital_right_config_permissions',
  mappingForeignKey: 'digital_right_config_id',
}

const physicalRightConfigResource: ConfigResourceDefinition = {
  tableName: 'physical_right_configs',
  mappingTableName: 'physical_right_config_permissions',
  mappingForeignKey: 'physical_right_config_id',
}

const digitalRightConfigPriceModifierResource: PriceModifierResourceDefinition = {
  tableName: 'digital_right_config_price_modifiers',
  mappingForeignKey: 'digital_right_config_id',
}

const physicalRightConfigPriceModifierResource: PriceModifierResourceDefinition = {
  tableName: 'physical_right_config_price_modifiers',
  mappingForeignKey: 'physical_right_config_id',
}

const expressionConfigResource: ConfigResourceDefinition = {
  tableName: 'expression_configs',
  mappingTableName: 'expression_config_permissions',
  mappingForeignKey: 'expression_config_id',
}

const modificationConfigResource: ConfigResourceDefinition = {
  tableName: 'modification_configs',
  mappingTableName: 'modification_config_permissions',
  mappingForeignKey: 'modification_config_id',
}

const normalizeSearchKeyword = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.replaceAll(',', '') : undefined
}

const toNumber = (value: number | string): number => Number(value)

const readStringField = (value: unknown, key: string): string | null => {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return typeof record[key] === 'string' ? record[key] : null
}

const isVariantPricingModifierKey = (
  value: string,
): value is VariantPricingModifierKey =>
  VARIANT_PRICING_MODIFIER_KEYS.includes(value as VariantPricingModifierKey)

const mapPriceModifiers = (
  rows: DbPriceModifierRow[] | undefined,
): ConfigPriceModifierDto[] =>
  (Array.isArray(rows) ? rows : [])
    .map((item) => {
      const key = isVariantPricingModifierKey(item.modifier_key)
        ? item.modifier_key
        : null
      if (!key) return null
      return { key, multiplier: toNumber(item.multiplier) }
    })
    .filter(
      (value): value is ConfigPriceModifierDto =>
        value !== null,
    )

const mapPermissionSummary = (row: DbConfigPermissionRelationRow): ConfigPermissionSummaryDto | null => {
  if (!row.core_permissions) return null

  return {
    id: row.core_permissions.id,
    name: row.core_permissions.name,
    lawReference: row.core_permissions.law_reference,
  }
}

const mapReferencedPermissions = (
  rows: DbConfigPermissionRelationRow[] | undefined,
): { referencedPermissionIds: string[]; referencedPermissions: ConfigPermissionSummaryDto[] } => {
  const relationRows = Array.isArray(rows) ? rows : []
  const referencedPermissions = relationRows
    .map(mapPermissionSummary)
    .filter((item): item is ConfigPermissionSummaryDto => item !== null)

  return {
    referencedPermissionIds: relationRows.map((item) => item.core_permission_id),
    referencedPermissions,
  }
}

const mapDigitalRightConfig = (row: DbDigitalRightConfigRow): DigitalRightConfigDto => {
  const permissionData = mapReferencedPermissions(row.digital_right_config_permissions)

  return {
    id: row.id,
    targetPlatform: row.target_platform,
    durationType: row.duration_type,
    basePriceMultiplier: toNumber(row.base_price_multiplier),
    status: row.status,
    priceModifiers: mapPriceModifiers(row.digital_right_config_price_modifiers),
    referencedPermissionIds: permissionData.referencedPermissionIds,
    referencedPermissions: permissionData.referencedPermissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const mapPhysicalRightConfig = (row: DbPhysicalRightConfigRow): PhysicalRightConfigDto => {
  const permissionData = mapReferencedPermissions(row.physical_right_config_permissions)

  return {
    id: row.id,
    venueUsageType: row.venue_usage_type,
    basePriceMultiplier: toNumber(row.base_price_multiplier),
    status: row.status,
    priceModifiers: mapPriceModifiers(row.physical_right_config_price_modifiers),
    referencedPermissionIds: permissionData.referencedPermissionIds,
    referencedPermissions: permissionData.referencedPermissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const mapExpressionConfig = (row: DbExpressionConfigRow): ExpressionConfigDto => {
  const permissionData = mapReferencedPermissions(row.expression_config_permissions)

  return {
    id: row.id,
    name: row.name,
    priceMultiplier: toNumber(row.price_multiplier),
    status: row.status,
    referencedPermissionIds: permissionData.referencedPermissionIds,
    referencedPermissions: permissionData.referencedPermissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const mapModificationConfig = (row: DbModificationConfigRow): ModificationConfigDto => {
  const permissionData = mapReferencedPermissions(row.modification_config_permissions)

  return {
    id: row.id,
    name: row.name,
    priceMultiplier: toNumber(row.price_multiplier),
    status: row.status,
    referencedPermissionIds: permissionData.referencedPermissionIds,
    referencedPermissions: permissionData.referencedPermissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

@Injectable()
export class LicensingConfigsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private throwSupabaseError(code: string, error: unknown): never {
    const supabaseCode = readStringField(error, 'code')
    throw new ApiHttpException(
      { code, details: supabaseCode ? { supabaseCode } : undefined },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }

  private async getConfigById<TDbRow, TDto>(
    params: {
      tableName: string
      select: string
      mapper: (row: TDbRow) => TDto
      notFoundCode: string
      queryFailedCode: string
    },
    configId: string,
  ): Promise<TDto> {
    const { data, error } = await this.supabaseService.client
      .from(params.tableName)
      .select(params.select)
      .eq('id', configId)
      .maybeSingle<TDbRow>()

    if (error) {
      this.throwSupabaseError(params.queryFailedCode, error)
    }

    if (!data) {
      throw new ApiHttpException(
        { code: params.notFoundCode },
        HttpStatus.NOT_FOUND,
      )
    }

    return params.mapper(data)
  }

  private async validateActivePermissionIds(permissionIds: string[]): Promise<string[]> {
    const normalizedIds = [...new Set(permissionIds.filter((item) => item.length > 0))]
    if (normalizedIds.length === 0) return []

    const { data, error } = await this.supabaseService.client
      .from('core_permissions')
      .select('id')
      .eq('status', 'ACTIVE')
      .in('id', normalizedIds)

    if (error) {
      this.throwSupabaseError('CORE_PERMISSIONS_QUERY_FAILED', error)
    }

    const validIds = (data ?? []).map((item: { id: string }) => item.id)
    if (validIds.length !== normalizedIds.length) {
      throw new ApiHttpException(
        { code: 'INVALID_REFERENCED_PERMISSIONS' },
        HttpStatus.BAD_REQUEST,
      )
    }

    return normalizedIds
  }

  private async syncConfigPermissions(
    resource: ConfigResourceDefinition,
    configId: string,
    permissionIds: string[],
  ): Promise<void> {
    const validPermissionIds = await this.validateActivePermissionIds(permissionIds)

    const { error: deleteError } = await this.supabaseService.client
      .from(resource.mappingTableName)
      .delete()
      .eq(resource.mappingForeignKey, configId)

    if (deleteError) {
      this.throwSupabaseError('CONFIG_PERMISSION_SYNC_DELETE_FAILED', deleteError)
    }

    if (validPermissionIds.length === 0) return

    const insertRows = validPermissionIds.map((permissionId) => ({
      [resource.mappingForeignKey]: configId,
      core_permission_id: permissionId,
    }))

    const { error: insertError } = await this.supabaseService.client.from(resource.mappingTableName).insert(insertRows)

    if (insertError) {
      this.throwSupabaseError('CONFIG_PERMISSION_SYNC_INSERT_FAILED', insertError)
    }
  }

  private async syncConfigPriceModifiers(
    resource: PriceModifierResourceDefinition,
    configId: string,
    modifiers: ConfigPriceModifierDto[],
  ): Promise<void> {
    const normalizedModifiers = Array.from(
      new Map(
        (modifiers ?? [])
          .filter((item) => !!item && typeof item === 'object')
          .map((item) => [item.key, { key: item.key, multiplier: item.multiplier }]),
      ).values(),
    )

    const { error: deleteError } = await this.supabaseService.client
      .from(resource.tableName)
      .delete()
      .eq(resource.mappingForeignKey, configId)

    if (deleteError) {
      this.throwSupabaseError('CONFIG_PRICE_MODIFIER_SYNC_DELETE_FAILED', deleteError)
    }

    if (normalizedModifiers.length === 0) return

    const insertRows = normalizedModifiers.map((item) => ({
      [resource.mappingForeignKey]: configId,
      modifier_key: item.key,
      multiplier: item.multiplier,
    }))

    const { error: insertError } = await this.supabaseService.client
      .from(resource.tableName)
      .insert(insertRows)

    if (insertError) {
      this.throwSupabaseError('CONFIG_PRICE_MODIFIER_SYNC_INSERT_FAILED', insertError)
    }
  }

  private async getDigitalRightConfigById(configId: string): Promise<DigitalRightConfigDto> {
    return this.getConfigById(
      {
        tableName: digitalRightConfigResource.tableName,
        select:
          '*, digital_right_config_permissions(core_permission_id, core_permissions(id, name, law_reference)), digital_right_config_price_modifiers(id,modifier_key,multiplier,created_at)',
        mapper: mapDigitalRightConfig,
        notFoundCode: 'DIGITAL_RIGHT_CONFIG_NOT_FOUND',
        queryFailedCode: 'DIGITAL_RIGHT_CONFIG_GET_FAILED',
      },
      configId,
    )
  }

  private async getPhysicalRightConfigById(configId: string): Promise<PhysicalRightConfigDto> {
    return this.getConfigById(
      {
        tableName: physicalRightConfigResource.tableName,
        select:
          '*, physical_right_config_permissions(core_permission_id, core_permissions(id, name, law_reference)), physical_right_config_price_modifiers(id,modifier_key,multiplier,created_at)',
        mapper: mapPhysicalRightConfig,
        notFoundCode: 'PHYSICAL_RIGHT_CONFIG_NOT_FOUND',
        queryFailedCode: 'PHYSICAL_RIGHT_CONFIG_GET_FAILED',
      },
      configId,
    )
  }

  private async getExpressionConfigById(configId: string): Promise<ExpressionConfigDto> {
    return this.getConfigById(
      {
        tableName: expressionConfigResource.tableName,
        select:
          '*, expression_config_permissions(core_permission_id, core_permissions(id, name, law_reference))',
        mapper: mapExpressionConfig,
        notFoundCode: 'EXPRESSION_CONFIG_NOT_FOUND',
        queryFailedCode: 'EXPRESSION_CONFIG_GET_FAILED',
      },
      configId,
    )
  }

  private async getModificationConfigById(configId: string): Promise<ModificationConfigDto> {
    return this.getConfigById(
      {
        tableName: modificationConfigResource.tableName,
        select:
          '*, modification_config_permissions(core_permission_id, core_permissions(id, name, law_reference))',
        mapper: mapModificationConfig,
        notFoundCode: 'MODIFICATION_CONFIG_NOT_FOUND',
        queryFailedCode: 'MODIFICATION_CONFIG_GET_FAILED',
      },
      configId,
    )
  }

  async listDigitalRightConfigs(
    query: DigitalRightConfigsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: DigitalRightConfigDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const search = normalizeSearchKeyword(query.keyword ?? query.q)

    let sb = this.supabaseService.client
      .from(digitalRightConfigResource.tableName)
      .select(
        '*, digital_right_config_permissions(core_permission_id, core_permissions(id, name, law_reference)), digital_right_config_price_modifiers(id,modifier_key,multiplier,created_at)',
        { count: 'exact' },
      )

    if (search) {
      sb = sb.or(`target_platform.ilike.%${search}%,duration_type.ilike.%${search}%`)
    }

    if (query.status) sb = sb.eq('status', query.status)
    if (query.targetPlatform) sb = sb.eq('target_platform', query.targetPlatform)
    if (query.durationType) sb = sb.eq('duration_type', query.durationType)

    const { data, error, count } = await sb
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<DbDigitalRightConfigRow[]>()

    if (error) {
      this.throwSupabaseError('DIGITAL_RIGHT_CONFIG_LIST_FAILED', error)
    }

    return {
      data: { items: (data ?? []).map(mapDigitalRightConfig) },
      meta: buildPaginationMeta(query.page, query.pageSize, typeof count === 'number' ? count : 0),
    }
  }

  async getDigitalRightConfig(configId: string): Promise<DigitalRightConfigDto> {
    return this.getDigitalRightConfigById(configId)
  }

  async createDigitalRightConfig(payload: CreateDigitalRightConfigRequestDto): Promise<DigitalRightConfigDto> {
    const { data, error } = await this.supabaseService.client
      .from(digitalRightConfigResource.tableName)
      .insert({
        target_platform: payload.targetPlatform,
        duration_type: payload.durationType,
        base_price_multiplier: payload.basePriceMultiplier,
        status: payload.status ?? 'INACTIVE',
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (error) {
      this.throwSupabaseError('DIGITAL_RIGHT_CONFIG_CREATE_FAILED', error)
    }

    if (!data?.id) {
      throw new ApiHttpException(
        { code: 'DIGITAL_RIGHT_CONFIG_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    await this.syncConfigPermissions(
      digitalRightConfigResource,
      data.id,
      payload.referencedPermissionIds ?? [],
    )

    await this.syncConfigPriceModifiers(
      digitalRightConfigPriceModifierResource,
      data.id,
      payload.priceModifiers ?? [],
    )

    return this.getDigitalRightConfigById(data.id)
  }

  async updateDigitalRightConfig(
    configId: string,
    payload: UpdateDigitalRightConfigRequestDto,
  ): Promise<DigitalRightConfigDto> {
    const updatePayload: Record<string, unknown> = {}
    if (payload.targetPlatform !== undefined) updatePayload.target_platform = payload.targetPlatform
    if (payload.durationType !== undefined) updatePayload.duration_type = payload.durationType
    if (payload.basePriceMultiplier !== undefined) updatePayload.base_price_multiplier = payload.basePriceMultiplier

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabaseService.client
        .from(digitalRightConfigResource.tableName)
        .update(updatePayload)
        .eq('id', configId)

      if (error) {
        this.throwSupabaseError('DIGITAL_RIGHT_CONFIG_UPDATE_FAILED', error)
      }
    }

    if (payload.referencedPermissionIds !== undefined) {
      await this.syncConfigPermissions(digitalRightConfigResource, configId, payload.referencedPermissionIds)
    }

    if (payload.priceModifiers !== undefined) {
      await this.syncConfigPriceModifiers(
        digitalRightConfigPriceModifierResource,
        configId,
        payload.priceModifiers,
      )
    }

    return this.getDigitalRightConfigById(configId)
  }

  async updateDigitalRightConfigStatus(
    configId: string,
    payload: UpdateConfigStatusRequestDto,
  ): Promise<DigitalRightConfigDto> {
    const { error } = await this.supabaseService.client
      .from(digitalRightConfigResource.tableName)
      .update({ status: payload.status })
      .eq('id', configId)

    if (error) {
      this.throwSupabaseError('DIGITAL_RIGHT_CONFIG_UPDATE_STATUS_FAILED', error)
    }

    return this.getDigitalRightConfigById(configId)
  }

  async deleteDigitalRightConfig(configId: string): Promise<{ ok: true }> {
    const { error } = await this.supabaseService.client.from(digitalRightConfigResource.tableName).delete().eq('id', configId)

    if (error) {
      this.throwSupabaseError('DIGITAL_RIGHT_CONFIG_DELETE_FAILED', error)
    }

    return { ok: true }
  }

  async listPhysicalRightConfigs(
    query: GenericConfigsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: PhysicalRightConfigDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const search = normalizeSearchKeyword(query.keyword ?? query.q)

    let sb = this.supabaseService.client
      .from(physicalRightConfigResource.tableName)
      .select(
        '*, physical_right_config_permissions(core_permission_id, core_permissions(id, name, law_reference)), physical_right_config_price_modifiers(id,modifier_key,multiplier,created_at)',
        { count: 'exact' },
      )

    if (search) {
      sb = sb.or(`venue_usage_type.ilike.%${search}%`)
    }

    if (query.status) sb = sb.eq('status', query.status)

    const { data, error, count } = await sb
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<DbPhysicalRightConfigRow[]>()

    if (error) {
      this.throwSupabaseError('PHYSICAL_RIGHT_CONFIG_LIST_FAILED', error)
    }

    return {
      data: { items: (data ?? []).map(mapPhysicalRightConfig) },
      meta: buildPaginationMeta(query.page, query.pageSize, typeof count === 'number' ? count : 0),
    }
  }

  async getPhysicalRightConfig(configId: string): Promise<PhysicalRightConfigDto> {
    return this.getPhysicalRightConfigById(configId)
  }

  async createPhysicalRightConfig(payload: CreatePhysicalRightConfigRequestDto): Promise<PhysicalRightConfigDto> {
    const { data, error } = await this.supabaseService.client
      .from(physicalRightConfigResource.tableName)
      .insert({
        venue_usage_type: payload.venueUsageType,
        base_price_multiplier: payload.basePriceMultiplier,
        status: payload.status ?? 'INACTIVE',
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (error) {
      this.throwSupabaseError('PHYSICAL_RIGHT_CONFIG_CREATE_FAILED', error)
    }

    if (!data?.id) {
      throw new ApiHttpException(
        { code: 'PHYSICAL_RIGHT_CONFIG_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    await this.syncConfigPermissions(
      physicalRightConfigResource,
      data.id,
      payload.referencedPermissionIds ?? [],
    )

    await this.syncConfigPriceModifiers(
      physicalRightConfigPriceModifierResource,
      data.id,
      payload.priceModifiers ?? [],
    )

    return this.getPhysicalRightConfigById(data.id)
  }

  async updatePhysicalRightConfig(
    configId: string,
    payload: UpdatePhysicalRightConfigRequestDto,
  ): Promise<PhysicalRightConfigDto> {
    const updatePayload: Record<string, unknown> = {}
    if (payload.venueUsageType !== undefined) updatePayload.venue_usage_type = payload.venueUsageType
    if (payload.basePriceMultiplier !== undefined) updatePayload.base_price_multiplier = payload.basePriceMultiplier

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabaseService.client
        .from(physicalRightConfigResource.tableName)
        .update(updatePayload)
        .eq('id', configId)

      if (error) {
        this.throwSupabaseError('PHYSICAL_RIGHT_CONFIG_UPDATE_FAILED', error)
      }
    }

    if (payload.referencedPermissionIds !== undefined) {
      await this.syncConfigPermissions(physicalRightConfigResource, configId, payload.referencedPermissionIds)
    }

    if (payload.priceModifiers !== undefined) {
      await this.syncConfigPriceModifiers(
        physicalRightConfigPriceModifierResource,
        configId,
        payload.priceModifiers,
      )
    }

    return this.getPhysicalRightConfigById(configId)
  }

  async updatePhysicalRightConfigStatus(
    configId: string,
    payload: UpdateConfigStatusRequestDto,
  ): Promise<PhysicalRightConfigDto> {
    const { error } = await this.supabaseService.client
      .from(physicalRightConfigResource.tableName)
      .update({ status: payload.status })
      .eq('id', configId)

    if (error) {
      this.throwSupabaseError('PHYSICAL_RIGHT_CONFIG_UPDATE_STATUS_FAILED', error)
    }

    return this.getPhysicalRightConfigById(configId)
  }

  async deletePhysicalRightConfig(configId: string): Promise<{ ok: true }> {
    const { error } = await this.supabaseService.client.from(physicalRightConfigResource.tableName).delete().eq('id', configId)

    if (error) {
      this.throwSupabaseError('PHYSICAL_RIGHT_CONFIG_DELETE_FAILED', error)
    }

    return { ok: true }
  }

  async listExpressionConfigs(
    query: GenericConfigsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ExpressionConfigDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const search = normalizeSearchKeyword(query.keyword ?? query.q)

    let sb = this.supabaseService.client
      .from(expressionConfigResource.tableName)
      .select('*, expression_config_permissions(core_permission_id, core_permissions(id, name, law_reference))', {
        count: 'exact',
      })

    if (search) {
      sb = sb.or(`name.ilike.%${search}%`)
    }

    if (query.status) sb = sb.eq('status', query.status)

    const { data, error, count } = await sb
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<DbExpressionConfigRow[]>()

    if (error) {
      this.throwSupabaseError('EXPRESSION_CONFIG_LIST_FAILED', error)
    }

    return {
      data: { items: (data ?? []).map(mapExpressionConfig) },
      meta: buildPaginationMeta(query.page, query.pageSize, typeof count === 'number' ? count : 0),
    }
  }

  async getExpressionConfig(configId: string): Promise<ExpressionConfigDto> {
    return this.getExpressionConfigById(configId)
  }

  async createExpressionConfig(payload: CreateExpressionConfigRequestDto): Promise<ExpressionConfigDto> {
    const { data, error } = await this.supabaseService.client
      .from(expressionConfigResource.tableName)
      .insert({
        name: payload.name,
        price_multiplier: payload.priceMultiplier,
        status: payload.status ?? 'ACTIVE',
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (error) {
      this.throwSupabaseError('EXPRESSION_CONFIG_CREATE_FAILED', error)
    }

    if (!data?.id) {
      throw new ApiHttpException(
        { code: 'EXPRESSION_CONFIG_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    await this.syncConfigPermissions(expressionConfigResource, data.id, payload.referencedPermissionIds ?? [])

    return this.getExpressionConfigById(data.id)
  }

  async updateExpressionConfig(
    configId: string,
    payload: UpdateExpressionConfigRequestDto,
  ): Promise<ExpressionConfigDto> {
    const updatePayload: Record<string, unknown> = {}
    if (payload.name !== undefined) updatePayload.name = payload.name
    if (payload.priceMultiplier !== undefined) updatePayload.price_multiplier = payload.priceMultiplier

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabaseService.client
        .from(expressionConfigResource.tableName)
        .update(updatePayload)
        .eq('id', configId)

      if (error) {
        this.throwSupabaseError('EXPRESSION_CONFIG_UPDATE_FAILED', error)
      }
    }

    if (payload.referencedPermissionIds !== undefined) {
      await this.syncConfigPermissions(expressionConfigResource, configId, payload.referencedPermissionIds)
    }

    return this.getExpressionConfigById(configId)
  }

  async updateExpressionConfigStatus(
    configId: string,
    payload: UpdateConfigStatusRequestDto,
  ): Promise<ExpressionConfigDto> {
    const { error } = await this.supabaseService.client
      .from(expressionConfigResource.tableName)
      .update({ status: payload.status })
      .eq('id', configId)

    if (error) {
      this.throwSupabaseError('EXPRESSION_CONFIG_UPDATE_STATUS_FAILED', error)
    }

    return this.getExpressionConfigById(configId)
  }

  async deleteExpressionConfig(configId: string): Promise<{ ok: true }> {
    const { error } = await this.supabaseService.client.from(expressionConfigResource.tableName).delete().eq('id', configId)

    if (error) {
      this.throwSupabaseError('EXPRESSION_CONFIG_DELETE_FAILED', error)
    }

    return { ok: true }
  }

  async listModificationConfigs(
    query: GenericConfigsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ModificationConfigDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const search = normalizeSearchKeyword(query.keyword ?? query.q)

    let sb = this.supabaseService.client
      .from(modificationConfigResource.tableName)
      .select(
        '*, modification_config_permissions(core_permission_id, core_permissions(id, name, law_reference))',
        { count: 'exact' },
      )

    if (search) {
      sb = sb.or(`name.ilike.%${search}%`)
    }

    if (query.status) sb = sb.eq('status', query.status)

    const { data, error, count } = await sb
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<DbModificationConfigRow[]>()

    if (error) {
      this.throwSupabaseError('MODIFICATION_CONFIG_LIST_FAILED', error)
    }

    return {
      data: { items: (data ?? []).map(mapModificationConfig) },
      meta: buildPaginationMeta(query.page, query.pageSize, typeof count === 'number' ? count : 0),
    }
  }

  async getModificationConfig(configId: string): Promise<ModificationConfigDto> {
    return this.getModificationConfigById(configId)
  }

  async createModificationConfig(payload: CreateModificationConfigRequestDto): Promise<ModificationConfigDto> {
    const { data, error } = await this.supabaseService.client
      .from(modificationConfigResource.tableName)
      .insert({
        name: payload.name,
        price_multiplier: payload.priceMultiplier,
        status: payload.status ?? 'ACTIVE',
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (error) {
      this.throwSupabaseError('MODIFICATION_CONFIG_CREATE_FAILED', error)
    }

    if (!data?.id) {
      throw new ApiHttpException(
        { code: 'MODIFICATION_CONFIG_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    await this.syncConfigPermissions(modificationConfigResource, data.id, payload.referencedPermissionIds ?? [])

    return this.getModificationConfigById(data.id)
  }

  async updateModificationConfig(
    configId: string,
    payload: UpdateModificationConfigRequestDto,
  ): Promise<ModificationConfigDto> {
    const updatePayload: Record<string, unknown> = {}
    if (payload.name !== undefined) updatePayload.name = payload.name
    if (payload.priceMultiplier !== undefined) updatePayload.price_multiplier = payload.priceMultiplier

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabaseService.client
        .from(modificationConfigResource.tableName)
        .update(updatePayload)
        .eq('id', configId)

      if (error) {
        this.throwSupabaseError('MODIFICATION_CONFIG_UPDATE_FAILED', error)
      }
    }

    if (payload.referencedPermissionIds !== undefined) {
      await this.syncConfigPermissions(modificationConfigResource, configId, payload.referencedPermissionIds)
    }

    return this.getModificationConfigById(configId)
  }

  async updateModificationConfigStatus(
    configId: string,
    payload: UpdateConfigStatusRequestDto,
  ): Promise<ModificationConfigDto> {
    const { error } = await this.supabaseService.client
      .from(modificationConfigResource.tableName)
      .update({ status: payload.status })
      .eq('id', configId)

    if (error) {
      this.throwSupabaseError('MODIFICATION_CONFIG_UPDATE_STATUS_FAILED', error)
    }

    return this.getModificationConfigById(configId)
  }

  async deleteModificationConfig(configId: string): Promise<{ ok: true }> {
    const { error } = await this.supabaseService.client
      .from(modificationConfigResource.tableName)
      .delete()
      .eq('id', configId)

    if (error) {
      this.throwSupabaseError('MODIFICATION_CONFIG_DELETE_FAILED', error)
    }

    return { ok: true }
  }
}
