export type ProductStatus = 'PENDING' | 'HIDDEN' | 'PUBLISHED'

export type ProductSortValue =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'updatedAt:desc'
  | 'updatedAt:asc'
  | 'title:asc'
  | 'title:desc'
  | 'status:asc'
  | 'status:desc'
  | 'genre:asc'
  | 'genre:desc'

export type ProductAllowedPermission = {
  id: string
  name: string
  lawReference: string
}

export type ProductPlatformKey = 'YOUTUBE'
export type ProductPlatformDurationType = 'ONE_YEAR' | 'PERPETUAL'

export type ProductLicensingEligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE'
export type ProductPackageJoinStatus = 'NOT_JOINED' | 'JOINED'
export type ProductPackageRegistrationStatus = 'JOINED' | 'REMOVED'

export type ProductLicensingEligibilityConfig = {
  configId: string
  configType: 'DIGITAL' | 'PHYSICAL'
  title: string
  status: ProductLicensingEligibilityStatus
  referencedPermissions: ProductAllowedPermission[]
  missingPermissions: ProductAllowedPermission[]
  registrationStatus: ProductPackageJoinStatus
  registrationId: string | null
  joinedAt: string | null
  joinedBy: string | null
}

export type ProductLicensingEligibilitySummary = {
  eligibleDigitalCount: number
  ineligibleDigitalCount: number
  eligiblePhysicalCount: number
  ineligiblePhysicalCount: number
  joinedDigitalCount: number
  joinedPhysicalCount: number
}

export type ProductLicensingEligibility = {
  digitalConfigs: ProductLicensingEligibilityConfig[]
  physicalConfigs: ProductLicensingEligibilityConfig[]
  summary: ProductLicensingEligibilitySummary
}

export type ProductPackageRegistration = {
  registrationId: string
  configId: string
  productId: string
  productTitle: string
  configType: 'DIGITAL' | 'PHYSICAL'
  title: string
  configStatus: 'ACTIVE' | 'INACTIVE'
  registrationStatus: ProductPackageRegistrationStatus
  referencedPermissions: ProductAllowedPermission[]
  missingPermissions: ProductAllowedPermission[]
  joinedAt: string | null
  joinedBy: string | null
  removedAt: string | null
  removedBy: string | null
}

export type Product = {
  id: string
  title: string
  artistId: string
  authorName: string | null
  genre: string | null
  genres: string[]
  duration: number | null
  status: ProductStatus
  useCase: string | null
  useCases: string[]
  description: string | null
  allowedPermissionIds: string[]
  allowedPermissions: ProductAllowedPermission[]
  licensingEligibility: ProductLicensingEligibility
  digitalPackageRegistrations: ProductPackageRegistration[]
  physicalPackageRegistrations: ProductPackageRegistration[]
  complianceLegalStatus: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT' | null
  complianceReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  originalAudioKey: string | null
  thumbnailKey: string | null
  sheetMusicPdfKey: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ProductPlatformPricingMode = 'GLOBAL' | 'CUSTOM'

export type ProductPlatformConfigOption = {
  digitalRightConfigId: string
  platformKey: ProductPlatformKey
  platformLabel: string
  title: string
  durationType: ProductPlatformDurationType
  globalBaseMultiplier: number
}

export type ProductPlatformSettingGroup = {
  platformKey: ProductPlatformKey
  platformLabel: string
  availableConfigs: ProductPlatformConfigOption[]
  selectedDigitalRightConfigId: string | null
  pricingMode: ProductPlatformPricingMode
  customPriceMultiplier: number | null
  systemBaseMultiplier: number | null
  effectiveMultiplier: number | null
  updatedAt: string | null
  updatedBy: string | null
}

export type ProductPlatformSettings = {
  productId: string
  supportedPlatforms: ProductPlatformSettingGroup[]
}

export type AdminProductsListQuery = {
  page: number
  pageSize: number
  keyword?: string
  sort?: ProductSortValue
  status?: ProductStatus
  genre?: string
  artistId?: string
}

export type AdminProductsListData = {
  items: Product[]
}

export type AdminProductsSummaryQuery = {
  keyword?: string
  genre?: string
  artistId?: string
}

export type AdminProductsSummaryData = {
  total: number
  published: number
  hidden: number
  pending: number
}

export type AdminCreateProductBody = {
  title: string
  artistId: string
  authorName?: string
  genre?: string
  genres?: string[]
  useCase?: string
  useCases?: string[]
  description?: string
  duration?: number
}

export type AdminUpdateProductBody = Partial<Omit<AdminCreateProductBody, 'artistId'>>

export type ReplaceProductAllowedPermissionsBody = {
  permissionIds: string[]
}

export type CreateProductPackageRegistrationBody = {
  configId: string
}

export type UpdateProductPlatformSettingsBody = {
  platformKey: ProductPlatformKey
  selectedDigitalRightConfigId?: string | null
  pricingMode: ProductPlatformPricingMode
  customPriceMultiplier?: number | null
}

export type CreatorProductsListData = {
  items: Product[]
}

export type SignedUploadUrlData = {
  uploadUrl: string
  fileKey: string
}

export type SignedPlaybackUrlData = {
  playbackUrl: string
}

export type ConfirmProductAudioUploadBody = {
  mode: 'original'
  fileKey: string
}

export type ProductThumbnailExtension = 'png' | 'jpg' | 'jpeg' | 'webp'

export type CreateThumbnailUploadUrlBody = {
  extension: ProductThumbnailExtension
}

export type ConfirmProductThumbnailUploadBody = {
  fileKey: string
}

export type SignedThumbnailUrlData = {
  thumbnailUrl: string
}

export type SignedSheetMusicUrlData = {
  sheetMusicUrl: string
}

export type ConfirmProductSheetMusicUploadBody = {
  fileKey: string
}
