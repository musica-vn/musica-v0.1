import type { PaginationMeta } from '@musica/contracts'
import { apiGet, apiPost } from '../api/axios'
import type {
  MarketplaceProduct,
  MarketplaceProductsListData,
  MarketplaceProductsListQuery,
  MarketplaceVariantPricingCalculateBody,
  MarketplaceVariantPricingCalculateData,
} from '../types/marketplace.types'
import { mockGetMarketplaceProduct, mockListMarketplaceProducts } from './marketplace.mock'

type MarketplaceDataSource = 'mock' | 'admin' | 'creator'

const resolveMarketplaceDataSource = (): MarketplaceDataSource => {
  const raw = import.meta.env.VITE_MARKETPLACE_DATA_SOURCE
  if (raw === 'admin' || raw === 'creator' || raw === 'mock') return raw
  return 'mock'
}

const marketplaceDataSource = resolveMarketplaceDataSource()

export const listMarketplaceProducts = async (
  query: MarketplaceProductsListQuery,
): Promise<{ data: MarketplaceProductsListData; meta: PaginationMeta }> => {
  if (marketplaceDataSource === 'admin') {
    const result = await apiGet<MarketplaceProductsListData, PaginationMeta>('/admin/products', {
      params: query,
    })
    return { data: result.data, meta: result.meta }
  }

  if (marketplaceDataSource === 'creator') {
    const result = await apiGet<{ items: MarketplaceProduct[] }>('/creator/products')
    return {
      data: { items: result.data.items },
      meta: {
        pagination: {
          page: 1,
          pageSize: result.data.items.length,
          totalItems: result.data.items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    }
  }

  return mockListMarketplaceProducts(query)
}

export const getMarketplaceProduct = async (productId: string): Promise<MarketplaceProduct> => {
  if (marketplaceDataSource === 'admin') {
    const result = await apiGet<MarketplaceProduct>(`/admin/products/${productId}`)
    return result.data
  }

  if (marketplaceDataSource === 'creator') {
    const result = await apiGet<MarketplaceProduct>(`/creator/products/${productId}`)
    return result.data
  }

  const product = await mockGetMarketplaceProduct(productId)
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm')
  }
  return product
}

export const calculateMarketplaceVariantPricing = async (body: MarketplaceVariantPricingCalculateBody) => {
  return apiPost<MarketplaceVariantPricingCalculateData, MarketplaceVariantPricingCalculateBody>(
    '/public/variant-pricing/calculate',
    body,
  )
}

