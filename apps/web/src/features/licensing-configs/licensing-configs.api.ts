import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/http'
import type { PaginationMeta } from '@musica/contracts'
import type {
  CreateDigitalRightConfigPayload,
  CreateExpressionConfigPayload,
  CreateModificationConfigPayload,
  CreatePhysicalRightConfigPayload,
  DigitalRightConfig,
  DigitalRightConfigsListData,
  DigitalRightConfigsListQuery,
  ExpressionConfig,
  ExpressionConfigsListData,
  GenericLicensingConfigsListQuery,
  ModificationConfig,
  ModificationConfigsListData,
  PhysicalRightConfig,
  PhysicalRightConfigsListData,
  LicensingConfigStatus,
  PackageRegistrationsListData,
  PackageRegistrationsListQuery,
  UpdateDigitalRightConfigPayload,
  UpdateExpressionConfigPayload,
  UpdateModificationConfigPayload,
  UpdatePhysicalRightConfigPayload,
} from './licensing-configs.types'

const listResource = async <TData, TQuery>(path: string, query: TQuery) =>
  apiGet<TData, PaginationMeta>(path, { params: query })

const createResource = async <TData, TBody>(path: string, payload: TBody) =>
  apiPost<TData, TBody>(path, payload)

const updateResource = async <TData, TBody>(path: string, payload: TBody) =>
  apiPatch<TData, TBody>(path, payload)

const updateResourceStatus = async <TData>(path: string, status: LicensingConfigStatus) =>
  apiPatch<TData, { status: LicensingConfigStatus }>(`${path}/status`, { status })

const deleteResource = async (path: string) => apiDelete<{ ok: true }>(path)

export const listAdminDigitalRightConfigs = async (query: DigitalRightConfigsListQuery) =>
  listResource<DigitalRightConfigsListData, DigitalRightConfigsListQuery>('/admin/digital-right-configs', query)

export const createAdminDigitalRightConfig = async (payload: CreateDigitalRightConfigPayload) =>
  createResource<DigitalRightConfig, CreateDigitalRightConfigPayload>('/admin/digital-right-configs', payload)

export const updateAdminDigitalRightConfig = async (configId: string, payload: UpdateDigitalRightConfigPayload) =>
  updateResource<DigitalRightConfig, UpdateDigitalRightConfigPayload>(`/admin/digital-right-configs/${configId}`, payload)

export const updateAdminDigitalRightConfigStatus = async (
  configId: string,
  status: LicensingConfigStatus,
) => updateResourceStatus<DigitalRightConfig>(`/admin/digital-right-configs/${configId}`, status)

export const deleteAdminDigitalRightConfig = async (configId: string) =>
  deleteResource(`/admin/digital-right-configs/${configId}`)

export const listAdminPhysicalRightConfigs = async (query: GenericLicensingConfigsListQuery) =>
  listResource<PhysicalRightConfigsListData, GenericLicensingConfigsListQuery>('/admin/physical-right-configs', query)

export const createAdminPhysicalRightConfig = async (payload: CreatePhysicalRightConfigPayload) =>
  createResource<PhysicalRightConfig, CreatePhysicalRightConfigPayload>('/admin/physical-right-configs', payload)

export const updateAdminPhysicalRightConfig = async (configId: string, payload: UpdatePhysicalRightConfigPayload) =>
  updateResource<PhysicalRightConfig, UpdatePhysicalRightConfigPayload>(`/admin/physical-right-configs/${configId}`, payload)

export const updateAdminPhysicalRightConfigStatus = async (
  configId: string,
  status: LicensingConfigStatus,
) => updateResourceStatus<PhysicalRightConfig>(`/admin/physical-right-configs/${configId}`, status)

export const deleteAdminPhysicalRightConfig = async (configId: string) =>
  deleteResource(`/admin/physical-right-configs/${configId}`)

export const listAdminExpressionConfigs = async (query: GenericLicensingConfigsListQuery) =>
  listResource<ExpressionConfigsListData, GenericLicensingConfigsListQuery>('/admin/expression-configs', query)

export const createAdminExpressionConfig = async (payload: CreateExpressionConfigPayload) =>
  createResource<ExpressionConfig, CreateExpressionConfigPayload>('/admin/expression-configs', payload)

export const updateAdminExpressionConfig = async (configId: string, payload: UpdateExpressionConfigPayload) =>
  updateResource<ExpressionConfig, UpdateExpressionConfigPayload>(`/admin/expression-configs/${configId}`, payload)

export const updateAdminExpressionConfigStatus = async (
  configId: string,
  status: LicensingConfigStatus,
) => updateResourceStatus<ExpressionConfig>(`/admin/expression-configs/${configId}`, status)

export const deleteAdminExpressionConfig = async (configId: string) =>
  deleteResource(`/admin/expression-configs/${configId}`)

export const listAdminModificationConfigs = async (query: GenericLicensingConfigsListQuery) =>
  listResource<ModificationConfigsListData, GenericLicensingConfigsListQuery>('/admin/modification-configs', query)

export const createAdminModificationConfig = async (payload: CreateModificationConfigPayload) =>
  createResource<ModificationConfig, CreateModificationConfigPayload>('/admin/modification-configs', payload)

export const updateAdminModificationConfig = async (configId: string, payload: UpdateModificationConfigPayload) =>
  updateResource<ModificationConfig, UpdateModificationConfigPayload>(`/admin/modification-configs/${configId}`, payload)

export const updateAdminModificationConfigStatus = async (
  configId: string,
  status: LicensingConfigStatus,
) => updateResourceStatus<ModificationConfig>(`/admin/modification-configs/${configId}`, status)

export const deleteAdminModificationConfig = async (configId: string) =>
  deleteResource(`/admin/modification-configs/${configId}`)

export const listAdminDigitalRightConfigProducts = async (
  configId: string,
  query: PackageRegistrationsListQuery,
) =>
  listResource<PackageRegistrationsListData, PackageRegistrationsListQuery>(
    `/admin/digital-right-configs/${configId}/products`,
    query,
  )

export const listAdminPhysicalRightConfigProducts = async (
  configId: string,
  query: PackageRegistrationsListQuery,
) =>
  listResource<PackageRegistrationsListData, PackageRegistrationsListQuery>(
    `/admin/physical-right-configs/${configId}/products`,
    query,
  )
