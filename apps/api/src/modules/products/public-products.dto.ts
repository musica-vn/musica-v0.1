import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/base/pagination.dto';

export class PublicProductsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

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
  @IsString()
  useCase?: string;

  @ApiPropertyOptional({ enum: ['lt2', '2to4', 'gt4'] })
  @IsOptional()
  @IsIn(['lt2', '2to4', 'gt4'])
  duration?: 'lt2' | '2to4' | 'gt4';

  @ApiPropertyOptional({
    enum: [
      'createdAt:desc',
      'createdAt:asc',
      'updatedAt:desc',
      'updatedAt:asc',
      'title:asc',
      'title:desc',
      'genre:asc',
      'genre:desc',
      'duration:asc',
      'duration:desc',
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
    'genre:asc',
    'genre:desc',
    'duration:asc',
    'duration:desc',
  ])
  declare sort?:
    | 'createdAt:desc'
    | 'createdAt:asc'
    | 'updatedAt:desc'
    | 'updatedAt:asc'
    | 'title:asc'
    | 'title:desc'
    | 'genre:asc'
    | 'genre:desc'
    | 'duration:asc'
    | 'duration:desc';
}

export class PublicProductListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productCode: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty()
  artistDisplayName: string;

  @ApiProperty({ required: false, nullable: true })
  genre: string | null;

  @ApiProperty({ type: [String] })
  genres: string[];

  @ApiProperty({ required: false, nullable: true })
  durationSeconds: number | null;

  @ApiProperty({ type: [String] })
  useCases: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PublicProductsListDataDto {
  @ApiProperty({ type: [PublicProductListItemDto] })
  items: PublicProductListItemDto[];
}
