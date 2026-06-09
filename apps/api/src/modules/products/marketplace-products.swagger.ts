import { ApiProperty } from '@nestjs/swagger'
import { PaginationMetaDto } from '../../common/base/pagination.swagger'
import { MarketplaceProductDetailDto, MarketplaceProductsListDataDto } from './marketplace-products.dto'

export class MarketplaceProductsListResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: MarketplaceProductsListDataDto })
  data: MarketplaceProductsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

export class MarketplaceProductDetailResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: MarketplaceProductDetailDto })
  data: MarketplaceProductDetailDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

