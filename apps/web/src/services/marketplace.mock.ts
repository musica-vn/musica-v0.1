import type { PaginationMeta } from '@musica/contracts'
import type {
  MarketplaceProduct,
  MarketplaceProductsListData,
  MarketplaceProductsListQuery,
} from '../types/marketplace.types'

const mockMarketplaceProducts: MarketplaceProduct[] = [
  {
    id: 'mock-marketplace-product-1',
    title: 'Dem Sai Gon',
    authorName: 'Minh Ha',
    genres: ['Ballad', 'Pop'],
    duration: 215,
    description: 'Ban ghi demo cho luong marketplace.',
    status: 'PUBLISHED',
    thumbnailUrl: null,
  },
  {
    id: 'mock-marketplace-product-2',
    title: 'Mua Tren Pho',
    authorName: 'Lan Anh',
    genres: ['Lo-fi', 'Instrumental'],
    duration: 184,
    description: 'Track instrumental dung cho xem truoc giao dien.',
    status: 'PUBLISHED',
    thumbnailUrl: null,
  },
  {
    id: 'mock-marketplace-product-3',
    title: 'Binh Minh Moi',
    authorName: 'Hoang Phuc',
    genres: ['Acoustic'],
    duration: 201,
    description: 'Du lieu mock de giu build on dinh khi chua noi backend.',
    status: 'HIDDEN',
    thumbnailUrl: null,
  },
]

const normalizeKeyword = (value?: string) => value?.trim().toLocaleLowerCase() ?? ''

const filterMockMarketplaceProducts = (query: MarketplaceProductsListQuery) => {
  const keyword = normalizeKeyword(query.keyword)

  if (keyword.length === 0) {
    return mockMarketplaceProducts
  }

  return mockMarketplaceProducts.filter((product) =>
    [product.title, product.authorName, product.description, product.genres.join(' ')]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .some((value) => value.toLocaleLowerCase().includes(keyword)),
  )
}

const buildPaginationMeta = (
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  return {
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}

export const mockListMarketplaceProducts = async (
  query: MarketplaceProductsListQuery,
): Promise<{ data: MarketplaceProductsListData; meta: PaginationMeta }> => {
  const page = Math.max(1, query.page)
  const pageSize = Math.max(1, query.pageSize)
  const filteredItems = filterMockMarketplaceProducts(query)
  const startIndex = (page - 1) * pageSize
  const items = filteredItems.slice(startIndex, startIndex + pageSize)

  return {
    data: { items },
    meta: buildPaginationMeta(page, pageSize, filteredItems.length),
  }
}

export const mockGetMarketplaceProduct = async (
  productId: string,
): Promise<MarketplaceProduct | undefined> => {
  return mockMarketplaceProducts.find((product) => product.id === productId)
}
