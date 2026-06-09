import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/base/pagination.swagger';
import {
  AdminProductPlaybackUrlResponseDataDto,
  AdminProductSheetMusicUrlResponseDataDto,
  AdminProductThumbnailUrlResponseDataDto,
  AdminProductsSummaryDataDto,
  AdminProductUploadUrlResponseDataDto,
  AdminProductsListDataDto,
} from './admin-products.dto';
import { PublicProductsListDataDto } from './public-products.dto';
import { ProductDto } from './product.dto';

export class AdminProductResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: ProductDto })
  data: ProductDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductsListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductsListDataDto })
  data: AdminProductsListDataDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class PublicProductsListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: PublicProductsListDataDto })
  data: PublicProductsListDataDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductsSummaryResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductsSummaryDataDto })
  data: AdminProductsSummaryDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductUploadUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductUploadUrlResponseDataDto })
  data: AdminProductUploadUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductPlaybackUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductPlaybackUrlResponseDataDto })
  data: AdminProductPlaybackUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductThumbnailUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductThumbnailUrlResponseDataDto })
  data: AdminProductThumbnailUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminProductSheetMusicUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminProductSheetMusicUrlResponseDataDto })
  data: AdminProductSheetMusicUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}
