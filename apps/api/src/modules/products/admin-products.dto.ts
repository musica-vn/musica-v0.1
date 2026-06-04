import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/base/pagination.dto';
import { ProductDto } from './product.dto';
import { PRODUCT_GENRES, PRODUCT_USE_CASES } from './products.enums';

export class AdminProductsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 10, minimum: 1, maximum: 10 })
  @Transform(({ value }) => (value === undefined ? 10 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10)
  pageSize = 10;

  @ApiPropertyOptional({
    enum: [
      'createdAt:desc',
      'createdAt:asc',
      'updatedAt:desc',
      'updatedAt:asc',
      'title:asc',
      'title:desc',
      'status:asc',
      'status:desc',
      'genre:asc',
      'genre:desc',
    ],
  })
  @IsOptional()
  @IsIn([
    'createdAt:desc',
    'createdAt:asc',
    'updatedAt:desc',
    'updatedAt:asc',
    'title:asc',
    'title:desc',
    'status:asc',
    'status:desc',
    'genre:asc',
    'genre:desc',
  ])
  declare sort?:
    | 'createdAt:desc'
    | 'createdAt:asc'
    | 'updatedAt:desc'
    | 'updatedAt:asc'
    | 'title:asc'
    | 'title:desc'
    | 'status:asc'
    | 'status:desc'
    | 'genre:asc'
    | 'genre:desc';

  @ApiPropertyOptional({ enum: ['PENDING', 'HIDDEN', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['PENDING', 'HIDDEN', 'PUBLISHED'])
  status?: 'PENDING' | 'HIDDEN' | 'PUBLISHED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class AdminProductsSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;
}

export class AdminCreateProductRequestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsUUID()
  artistId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ type: [String], enum: PRODUCT_GENRES })
  @IsOptional()
  @IsArray()
  @IsIn(PRODUCT_GENRES, { each: true })
  genres?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  useCase?: string;

  @ApiPropertyOptional({ type: [String], enum: PRODUCT_USE_CASES })
  @IsOptional()
  @IsArray()
  @IsIn(PRODUCT_USE_CASES, { each: true })
  useCases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  duration?: number;
}

export class AdminUpdateProductRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ type: [String], enum: PRODUCT_GENRES })
  @IsOptional()
  @IsArray()
  @IsIn(PRODUCT_GENRES, { each: true })
  genres?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  useCase?: string;

  @ApiPropertyOptional({ type: [String], enum: PRODUCT_USE_CASES })
  @IsOptional()
  @IsArray()
  @IsIn(PRODUCT_USE_CASES, { each: true })
  useCases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  duration?: number;
}

export class AdminReplaceProductAllowedPermissionsRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class AdminProductUploadUrlResponseDataDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  fileKey: string;
}

export class AdminConfirmProductAudioUploadRequestDto {
  @ApiProperty({ enum: ['original'] })
  @IsIn(['original'])
  mode: 'original';

  @ApiProperty({ example: '1.mp3' })
  @IsString()
  @Matches(/^\d+\.mp3$/)
  fileKey: string;
}

export class AdminCreateProductThumbnailUploadUrlRequestDto {
  @ApiProperty({ enum: ['png', 'jpg', 'jpeg', 'webp'] })
  @IsIn(['png', 'jpg', 'jpeg', 'webp'])
  extension: 'png' | 'jpg' | 'jpeg' | 'webp';
}

export class AdminConfirmProductThumbnailUploadRequestDto {
  @ApiProperty({ example: '123.png' })
  @IsString()
  @Matches(/^\d+\.(png|jpg|jpeg|webp)$/i)
  fileKey: string;
}

export class AdminProductThumbnailUrlResponseDataDto {
  @ApiProperty()
  thumbnailUrl: string;
}

export class AdminProductPlaybackUrlResponseDataDto {
  @ApiProperty()
  playbackUrl: string;
}

export class AdminConfirmProductSheetMusicUploadRequestDto {
  @ApiProperty({ example: '1.pdf' })
  @IsString()
  @Matches(/\.pdf$/i)
  fileKey: string;
}

export class AdminProductSheetMusicUrlResponseDataDto {
  @ApiProperty()
  sheetMusicUrl: string;
}

export class AdminProductsListDataDto {
  @ApiProperty({ type: [ProductDto] })
  items: ProductDto[];
}

export class AdminProductsSummaryDataDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  published: number;

  @ApiProperty()
  hidden: number;

  @ApiProperty()
  pending: number;
}
