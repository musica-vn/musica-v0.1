import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { PaginationQueryDto } from '../../common/base/pagination.dto'

export class MarketplaceProductsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 12, minimum: 1, maximum: 100 })
  @Transform(({ value }) => (value === undefined ? 12 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 12

  @ApiPropertyOptional({
    enum: [
      'createdAt:desc',
      'createdAt:asc',
      'updatedAt:desc',
      'updatedAt:asc',
      'title:asc',
      'title:desc',
    ],
    default: 'createdAt:desc',
  })
  @IsOptional()
  @IsIn([
    'createdAt:desc',
    'createdAt:asc',
    'updatedAt:desc',
    'updatedAt:asc',
    'title:asc',
    'title:desc',
  ])
  declare sort?:
    | 'createdAt:desc'
    | 'createdAt:asc'
    | 'updatedAt:desc'
    | 'updatedAt:asc'
    | 'title:asc'
    | 'title:desc'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  artistId?: string
}

export class MarketplaceProductListItemDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false, nullable: true })
  authorName: string | null

  @ApiProperty({ type: [String] })
  genres: string[]

  @ApiProperty({ required: false, nullable: true })
  duration: number | null

  @ApiProperty()
  artistId: string

  @ApiProperty({ required: false, nullable: true })
  thumbnailUrl: string | null

  @ApiProperty({ required: false, nullable: true })
  previewAudioUrl: string | null

  @ApiProperty()
  createdAt: string

  @ApiProperty()
  updatedAt: string
}

export class MarketplaceProductsListDataDto {
  @ApiProperty({ type: [MarketplaceProductListItemDto] })
  items: MarketplaceProductListItemDto[]
}

export class MarketplaceAllowedPermissionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  lawReference: string
}

export class MarketplaceProductDetailDto extends MarketplaceProductListItemDto {
  @ApiProperty({ required: false, nullable: true })
  description: string | null

  @ApiProperty({ type: [String] })
  useCases: string[]

  @ApiProperty({ type: [MarketplaceAllowedPermissionDto] })
  allowedPermissions: MarketplaceAllowedPermissionDto[]

  @ApiProperty({ required: false, nullable: true })
  digitalRightConfigId: string | null

  @ApiProperty({ required: false, nullable: true })
  physicalRightConfigId: string | null
}

