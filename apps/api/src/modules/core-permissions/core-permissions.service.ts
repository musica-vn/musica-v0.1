import { HttpStatus, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { buildPaginationMeta } from '../../common/base/pagination-meta'
import type { PaginationMeta } from '@musica/contracts'
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor'
import { ApiHttpException } from '../../common/errors/api-http.exception'
import { throwSupabaseError } from '../../common/database/supabase-errors'
import { SupabaseService } from '../../database/supabase.service'
import type {
  AdminCorePermissionsListQueryDto,
  AdminCreateCorePermissionRequestDto,
  AdminUpdateCorePermissionRequestDto,
  AdminUpdateCorePermissionStatusRequestDto,
  CorePermissionDto,
} from './dto'

type DbCorePermissionRow = {
  id: string
  name: string
  law_reference: string
  status: 'ACTIVE' | 'INACTIVE'
  description: string | null
  created_at: string
  updated_at: string
}

const mapRowToDto = (row: DbCorePermissionRow): CorePermissionDto => ({
  id: row.id,
  name: row.name,
  lawReference: row.law_reference,
  status: row.status,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

@Injectable()
export class CorePermissionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Assert core permission không bị tham chiếu bởi các bảng nghiệp vụ khác trước khi disable/delete.
   */
  private async assertPermissionNotInUse(permissionId: string): Promise<void> {
    const [
      { count: trackAllowedCount, error: trackAllowedError },
      { count: approvedCount, error: approvedError },
      { count: digitalCount, error: digitalError },
      { count: physicalCount, error: physicalError },
      { count: expressionCount, error: expressionError },
      { count: modificationCount, error: modificationError },
    ] = await Promise.all([
      this.supabaseService.client
        .from('track_allowed_permissions')
        .select('track_id', { count: 'exact', head: true })
        .eq('permission_id', permissionId),
      this.supabaseService.client
        .from('compliance_approved_permissions')
        .select('compliance_id', { count: 'exact', head: true })
        .eq('permission_id', permissionId),
      this.supabaseService.client
        .from('digital_right_config_permissions')
        .select('digital_right_config_id', { count: 'exact', head: true })
        .eq('core_permission_id', permissionId),
      this.supabaseService.client
        .from('physical_right_config_permissions')
        .select('physical_right_config_id', { count: 'exact', head: true })
        .eq('core_permission_id', permissionId),
      this.supabaseService.client
        .from('expression_config_permissions')
        .select('expression_config_id', { count: 'exact', head: true })
        .eq('core_permission_id', permissionId),
      this.supabaseService.client
        .from('modification_config_permissions')
        .select('modification_config_id', { count: 'exact', head: true })
        .eq('core_permission_id', permissionId),
    ])

    if (trackAllowedError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        trackAllowedError,
      )
    }

    if (approvedError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        approvedError,
      )
    }

    if (digitalError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        digitalError,
      )
    }

    if (physicalError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        physicalError,
      )
    }

    if (expressionError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        expressionError,
      )
    }

    if (modificationError) {
      throwSupabaseError(
        'CORE_PERMISSION_USAGE_CHECK_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        modificationError,
      )
    }

    const trackAllowed = typeof trackAllowedCount === 'number' ? trackAllowedCount : 0
    const complianceApproved = typeof approvedCount === 'number' ? approvedCount : 0
    const digitalConfigs = typeof digitalCount === 'number' ? digitalCount : 0
    const physicalConfigs = typeof physicalCount === 'number' ? physicalCount : 0
    const expressionConfigs = typeof expressionCount === 'number' ? expressionCount : 0
    const modificationConfigs = typeof modificationCount === 'number' ? modificationCount : 0

    if (
      trackAllowed > 0 ||
      complianceApproved > 0 ||
      digitalConfigs > 0 ||
      physicalConfigs > 0 ||
      expressionConfigs > 0 ||
      modificationConfigs > 0
    ) {
      throw new ApiHttpException(
        {
          code: 'CORE_PERMISSION_IN_USE',
          details: {
            trackAllowed,
            complianceApproved,
            digitalConfigs,
            physicalConfigs,
            expressionConfigs,
            modificationConfigs,
          },
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  async listAdminCorePermissions(
    query: AdminCorePermissionsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: CorePermissionDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : undefined
    const q = typeof query.q === 'string' ? query.q.trim() : undefined
    const search = keyword && keyword.length > 0 ? keyword : q && q.length > 0 ? q : undefined

    let sb = this.supabaseService.client
      .from('core_permissions')
      .select('*', { count: 'exact' })

    if (search) {
      const escaped = search.replaceAll(',', '')
      sb = sb.or(
        `name.ilike.%${escaped}%,law_reference.ilike.%${escaped}%,description.ilike.%${escaped}%`,
      )
    }

    if (query.status) sb = sb.eq('status', query.status)

    const { data, error, count } = await sb
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<DbCorePermissionRow[]>()

    if (error) {
      throwSupabaseError(
        'CORE_PERMISSIONS_LIST_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }

    const totalItems = typeof count === 'number' ? count : 0
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems)

    return { data: { items: (data ?? []).map(mapRowToDto) }, meta }
  }

  async createAdminCorePermission(payload: AdminCreateCorePermissionRequestDto): Promise<CorePermissionDto> {
    const { data, error } = await this.supabaseService.client
      .from('core_permissions')
      .insert({
        id: randomUUID(),
        name: payload.name,
        law_reference: payload.lawReference,
        description: payload.description ?? null,
        status: payload.status ?? 'INACTIVE',
      })
      .select('*')
      .maybeSingle<DbCorePermissionRow>()

    if (error) {
      throwSupabaseError(
        'CORE_PERMISSION_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'CORE_PERMISSION_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    return mapRowToDto(data)
  }

  async updateAdminCorePermission(
    permissionId: string,
    payload: AdminUpdateCorePermissionRequestDto,
  ): Promise<CorePermissionDto> {
    if (payload.status === 'INACTIVE') {
      await this.assertPermissionNotInUse(permissionId)
    }

    const updatePayload: Partial<DbCorePermissionRow> & Record<string, unknown> = {}
    if (payload.name !== undefined) updatePayload.name = payload.name
    if (payload.lawReference !== undefined) updatePayload.law_reference = payload.lawReference
    if (payload.description !== undefined) updatePayload.description = payload.description
    if (payload.status !== undefined) updatePayload.status = payload.status

    const { data, error } = await this.supabaseService.client
      .from('core_permissions')
      .update(updatePayload)
      .eq('id', permissionId)
      .select('*')
      .maybeSingle<DbCorePermissionRow>()

    if (error) {
      throwSupabaseError(
        'CORE_PERMISSION_UPDATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'CORE_PERMISSION_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      )
    }

    return mapRowToDto(data)
  }

  async updateAdminCorePermissionStatus(
    permissionId: string,
    payload: AdminUpdateCorePermissionStatusRequestDto,
  ): Promise<CorePermissionDto> {
    if (payload.status === 'INACTIVE') {
      await this.assertPermissionNotInUse(permissionId)
    }

    const { data, error } = await this.supabaseService.client
      .from('core_permissions')
      .update({ status: payload.status })
      .eq('id', permissionId)
      .select('*')
      .maybeSingle<DbCorePermissionRow>()

    if (error) {
      throwSupabaseError(
        'CORE_PERMISSION_UPDATE_STATUS_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'CORE_PERMISSION_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      )
    }

    return mapRowToDto(data)
  }

  async deleteAdminCorePermission(permissionId: string): Promise<{ ok: true }> {
    await this.assertPermissionNotInUse(permissionId)

    const { error } = await this.supabaseService.client
      .from('core_permissions')
      .delete()
      .eq('id', permissionId)

    if (error) {
      throwSupabaseError(
        'CORE_PERMISSION_DELETE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }

    return { ok: true }
  }
}
