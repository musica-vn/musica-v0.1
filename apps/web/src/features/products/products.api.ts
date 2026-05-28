import type { PaginationMeta } from '@musica/contracts'
import { apiGet, apiPatch, apiPost, apiPut } from '../../shared/api/http'
import type {
  AdminCreateProductBody,
  AdminProductsListData,
  AdminProductsListQuery,
  AdminProductsSummaryData,
  AdminProductsSummaryQuery,
  AdminUpdateProductBody,
  ConfirmProductAudioUploadBody,
  ConfirmProductThumbnailUploadBody,
  CreateThumbnailUploadUrlBody,
  Product,
  ReplaceProductAllowedPermissionsBody,
  SignedPlaybackUrlData,
  SignedThumbnailUrlData,
  SignedUploadUrlData,
} from './products.types'

export const listAdminProducts = async (query: AdminProductsListQuery) => {
  return apiGet<AdminProductsListData, PaginationMeta>('/admin/products', { params: query })
}

export const getAdminProductsSummary = async (query: AdminProductsSummaryQuery) => {
  return apiGet<AdminProductsSummaryData>('/admin/products/summary', { params: query })
}

export const createAdminProduct = async (body: AdminCreateProductBody) => {
  return apiPost<Product, AdminCreateProductBody>('/admin/products', body)
}

export const updateAdminProduct = async (productId: string, body: AdminUpdateProductBody) => {
  return apiPatch<Product, AdminUpdateProductBody>(`/admin/products/${productId}`, body)
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