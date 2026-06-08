export type MarketplaceProductStatus = 'PENDING' | 'HIDDEN' | 'PUBLISHED'

export type MarketplaceProduct = {
  id: string
  title: string
  authorName: string | null
  genres: string[]
  duration: number | null
  description: string | null
  status: MarketplaceProductStatus
  thumbnailUrl?: string | null
}

export type MarketplaceProductsListQuery = {
  page: number
  pageSize: number
  keyword?: string
}

export type MarketplaceProductsListData = {
  items: MarketplaceProduct[]
}

export type VariantPricingPlatformType = 'DIGITAL' | 'PHYSICAL'
export type VariantSubject = 'INDIVIDUAL' | 'ORGANIZATION'
export type VariantDuration = 'ONE_YEAR' | 'PERPETUAL'
export type VariantScope = 'SINGLE_CHANNEL' | 'MULTI_CHANNEL'

export type MarketplaceVariantPricingCalculateBody = {
  platformType: VariantPricingPlatformType
  digitalRightConfigId?: string
  physicalRightConfigId?: string
  subject?: VariantSubject
  duration?: VariantDuration
  scope?: VariantScope
  expressionConfigId?: string
  modificationConfigId?: string
}

export type MarketplaceVariantPricingBreakdownLine = {
  key: string
  label: string
}

export type MarketplaceVariantPricingCalculateData = {
  totalPrice: number
  currency: 'VND'
  breakdown: MarketplaceVariantPricingBreakdownLine[]
}

