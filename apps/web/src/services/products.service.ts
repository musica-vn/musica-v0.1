import type { PaginationMeta } from '@musica/contracts'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../api/axios'
import type {
  AdminCreateProductBody,
  AdminProductsListData,
  AdminProductsListQuery,
  AdminProductsSummaryData,
  AdminProductsSummaryQuery,
  AdminUpdateProductBody,
  ConfirmProductAudioUploadBody,
  ConfirmProductSheetMusicUploadBody,
  ConfirmProductThumbnailUploadBody,
  CreateProductPackageRegistrationBody,
  CreatorProductsListData,
  CreateThumbnailUploadUrlBody,
  Product,
  ProductPlatformSettings,
  ProductPackageRegistration,
  ReplaceProductAllowedPermissionsBody,
  SignedPlaybackUrlData,
  SignedSheetMusicUrlData,
  SignedThumbnailUrlData,
  SignedUploadUrlData,
  UpdateProductPlatformSettingsBody,
} from '../types/products.types'

export const listAdminProducts = async (query: AdminProductsListQuery) => {
  return apiGet<AdminProductsListData, PaginationMeta>('/admin/products', { params: query })
}

export const getAdminProductsSummary = async (query: AdminProductsSummaryQuery) => {
  return apiGet<AdminProductsSummaryData>('/admin/products/summary', { params: query })
}

export const createAdminProduct = async (body: AdminCreateProductBody) => {
  return apiPost<Product, AdminCreateProductBody>('/admin/products', body)
}

export const getAdminProduct = async (productId: string) => {
  return apiGet<Product>(`/admin/products/${productId}`)
}

export const updateAdminProduct = async (productId: string, body: AdminUpdateProductBody) => {
  return apiPatch<Product, AdminUpdateProductBody>(`/admin/products/${productId}`, body)
}

export const getAdminProductPlatformSettings = async (productId: string) => {
  return apiGet<ProductPlatformSettings>(`/admin/products/${productId}/platform-settings`)
}

export const updateAdminProductPlatformSettings = async (
  productId: string,
  body: UpdateProductPlatformSettingsBody,
) => {
  return apiPut<ProductPlatformSettings, UpdateProductPlatformSettingsBody>(
    `/admin/products/${productId}/platform-settings`,
    body,
  )
}

export const replaceAdminProductAllowedPermissions = async (
  productId: string,
  body: ReplaceProductAllowedPermissionsBody,
) => {
  return apiPut<Product, ReplaceProductAllowedPermissionsBody>(
    `/admin/products/${productId}/allowed-permissions`,
    body,
  )
}

export const publishAdminProduct = async (productId: string) => {
  return apiPatch<Product>(`/admin/products/${productId}/publish`)
}

export const hideAdminProduct = async (productId: string) => {
  return apiPatch<Product>(`/admin/products/${productId}/hide`)
}

export const getOriginalUploadUrl = async (productId: string) => {
  return apiPost<SignedUploadUrlData>(`/admin/products/${productId}/original-upload-url`)
}

export const confirmAdminProductAudioUpload = async (
  productId: string,
  body: ConfirmProductAudioUploadBody,
) => {
  return apiPost<Product, ConfirmProductAudioUploadBody>(
    `/admin/products/${productId}/confirm-audio-upload`,
    body,
  )
}

export const getThumbnailUploadUrl = async (
  productId: string,
  body: CreateThumbnailUploadUrlBody,
) => {
  return apiPost<SignedUploadUrlData, CreateThumbnailUploadUrlBody>(
    `/admin/products/${productId}/thumbnail-upload-url`,
    body,
  )
}

export const confirmAdminProductThumbnailUpload = async (
  productId: string,
  body: ConfirmProductThumbnailUploadBody,
) => {
  return apiPost<Product, ConfirmProductThumbnailUploadBody>(
    `/admin/products/${productId}/confirm-thumbnail-upload`,
    body,
  )
}

export const getProductThumbnailUrl = async (productId: string) => {
  return apiGet<SignedThumbnailUrlData>(`/admin/products/${productId}/thumbnail-url`)
}

export const getOriginalPlaybackUrl = async (productId: string) => {
  return apiGet<SignedPlaybackUrlData>(`/admin/products/${productId}/original-playback-url`)
}

export const getSheetMusicUploadUrl = async (productId: string) => {
  return apiPost<SignedUploadUrlData>(`/admin/products/${productId}/sheet-music-upload-url`)
}

export const confirmAdminProductSheetMusicUpload = async (
  productId: string,
  body: ConfirmProductSheetMusicUploadBody,
) => {
  return apiPost<Product, ConfirmProductSheetMusicUploadBody>(
    `/admin/products/${productId}/confirm-sheet-music-upload`,
    body,
  )
}

export const getSheetMusicUrl = async (productId: string) => {
  return apiGet<SignedSheetMusicUrlData>(`/admin/products/${productId}/sheet-music-url`)
}

export const createAdminDigitalRightRegistration = async (
  productId: string,
  body: CreateProductPackageRegistrationBody,
) => {
  return apiPost<ProductPackageRegistration, CreateProductPackageRegistrationBody>(
    `/admin/products/${productId}/digital-right-registrations`,
    body,
  )
}

export const removeAdminDigitalRightRegistration = async (
  productId: string,
  registrationId: string,
) => {
  return apiDelete<ProductPackageRegistration>(
    `/admin/products/${productId}/digital-right-registrations/${registrationId}`,
  )
}

export const createAdminPhysicalRightRegistration = async (
  productId: string,
  body: CreateProductPackageRegistrationBody,
) => {
  return apiPost<ProductPackageRegistration, CreateProductPackageRegistrationBody>(
    `/admin/products/${productId}/physical-right-registrations`,
    body,
  )
}

export const removeAdminPhysicalRightRegistration = async (
  productId: string,
  registrationId: string,
) => {
  return apiDelete<ProductPackageRegistration>(
    `/admin/products/${productId}/physical-right-registrations/${registrationId}`,
  )
}

export const listCreatorProducts = async () => {
  return apiGet<CreatorProductsListData>('/creator/products')
}

export const getCreatorProduct = async (productId: string) => {
  return apiGet<Product>(`/creator/products/${productId}`)
}

export const createCreatorDigitalRightRegistration = async (
  productId: string,
  body: CreateProductPackageRegistrationBody,
) => {
  return apiPost<ProductPackageRegistration, CreateProductPackageRegistrationBody>(
    `/creator/products/${productId}/digital-right-registrations`,
    body,
  )
}

export const removeCreatorDigitalRightRegistration = async (
  productId: string,
  registrationId: string,
) => {
  return apiDelete<ProductPackageRegistration>(
    `/creator/products/${productId}/digital-right-registrations/${registrationId}`,
  )
}

export const createCreatorPhysicalRightRegistration = async (
  productId: string,
  body: CreateProductPackageRegistrationBody,
) => {
  return apiPost<ProductPackageRegistration, CreateProductPackageRegistrationBody>(
    `/creator/products/${productId}/physical-right-registrations`,
    body,
  )
}

export const removeCreatorPhysicalRightRegistration = async (
  productId: string,
  registrationId: string,
) => {
  return apiDelete<ProductPackageRegistration>(
    `/creator/products/${productId}/physical-right-registrations/${registrationId}`,
  )
}
