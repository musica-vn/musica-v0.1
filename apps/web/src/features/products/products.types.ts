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
  name: string
  lawReference: string
}

export type Product = {
  id: string
  productCode: string
  title: string
  artistId: string
  authorName: string | null
  genre: string | null
  duration: number | null
  status: ProductStatus
  useCase: string | null
  description: string | null
  allowedPermissionIds: string[]
  allowedPermissions: ProductAllowedPermission[]
  complianceLegalStatus: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT' | null
  complianceReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  originalAudioKey: string | null
  thumbnailKey: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
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
  useCase?: string
  description?: string
  duration?: number
}

export type AdminUpdateProductBody = Partial<Omit<AdminCreateProductBody, 'artistId'>>

export type ReplaceProductAllowedPermissionsBody = {
  permissionIds: string[]
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