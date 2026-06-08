import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { PaginationMeta } from '@musica/contracts'
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor'
import { ProductsService } from './products.service'
import { MarketplaceProductsListQueryDto } from './marketplace-products.dto'
import { MarketplaceProductDetailResponseDto, MarketplaceProductsListResponseDto } from './marketplace-products.swagger'
import type { MarketplaceProductDetailDto, MarketplaceProductListItemDto } from './marketplace-products.dto'

@ApiTags('Marketplace - Products')
@Controller('marketplace/products')
export class MarketplaceProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List marketplace products (public, PUBLISHED only)' })
  @ApiOkResponse({ type: MarketplaceProductsListResponseDto })
  async list(
    @Query() query: MarketplaceProductsListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: MarketplaceProductListItemDto[] }, PaginationMeta>> {
    return this.productsService.listMarketplaceProducts(query)
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get marketplace product detail (public, PUBLISHED only)' })
  @ApiOkResponse({ type: MarketplaceProductDetailResponseDto })
  async detail(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<MarketplaceProductDetailDto> {
    return this.productsService.getMarketplaceProductById(productId)
  }
}

