import type { PaginationMeta } from '@musica/contracts'

export type LicensingConfigStatus = 'ACTIVE' | 'INACTIVE'
export type DigitalPlatform = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK'
export type DigitalDurationType = 'ONE_YEAR' | 'PERPETUAL'
export type LicensingConfigResource = 'digital' | 'physical' | 'expression' | 'modification'

export type ReferencedPermissionSummary = {
  id: string
  name: string
  lawReference: string
}

export type LicensingConfigBase = {
  id: string
  status: LicensingConfigStatus
  referencedPermissionIds: string[]
  referencedPermissions: ReferencedPermissionSummary[]
  createdAt: string
  updatedAt: string
}

export type DigitalRightConfig = LicensingConfigBase & {
  targetPlatform: DigitalPlatform
  durationType: DigitalDurationType
  basePriceMultiplier: number
}

export type PhysicalRightConfig = LicensingConfigBase & {
  venueUsageType: string
  basePriceMultiplier: number
}

export type ExpressionConfig = LicensingConfigBase & {
  name: string
  priceMultiplier: number
}

export type ModificationConfig = LicensingConfigBase & {
  name: string
  priceMultiplier: number
}

export type DigitalRightConfigsListQuery = {
  page: number
  pageSize: number
  keyword?: string
  status?: LicensingConfigStatus
  targetPlatform?: DigitalPlatform
  durationType?: DigitalDurationType
}

export type GenericLicensingConfigsListQuery = {
  page: number
  pageSize: number
  keyword?: string
  status?: LicensingConfigStatus
}

export type DigitalRightConfigsListData = {
  items: DigitalRightConfig[]
}

export type PhysicalRightConfigsListData = {
  items: PhysicalRightConfig[]
}

export type ExpressionConfigsListData = {
  items: ExpressionConfig[]
}

export type ModificationConfigsListData = {
  items: ModificationConfig[]
}

export type DigitalRightConfigsListResult = {
  data: DigitalRightConfigsListData
  meta: PaginationMeta
}

export type PhysicalRightConfigsListResult = {
  data: PhysicalRightConfigsListData
  meta: PaginationMeta
}

export type ExpressionConfigsListResult = {
  data: ExpressionConfigsListData
  meta: PaginationMeta
}

export type ModificationConfigsListResult = {
  data: ModificationConfigsListData
  meta: PaginationMeta
}

export type CreateDigitalRightConfigPayload = {
  targetPlatform: DigitalPlatform
  durationType: DigitalDurationType
  basePriceMultiplier: number
  referencedPermissionIds?: string[]
}

export type UpdateDigitalRightConfigPayload = Partial<
  CreateDigitalRightConfigPayload
>

export type CreatePhysicalRightConfigPayload = {
  venueUsageType: string
  basePriceMultiplier: number
  referencedPermissionIds?: string[]
}

export type UpdatePhysicalRightConfigPayload = Partial<
  CreatePhysicalRightConfigPayload
>

export type CreateExpressionConfigPayload = {
  name: string
  priceMultiplier: number
  referencedPermissionIds?: string[]
}

export type UpdateExpressionConfigPayload = Partial<
  CreateExpressionConfigPayload
>

export type CreateModificationConfigPayload = {
  name: string
  priceMultiplier: number
  referencedPermissionIds?: string[]
}

export type UpdateModificationConfigPayload = Partial<
  CreateModificationConfigPayload
>
