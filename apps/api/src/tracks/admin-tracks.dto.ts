import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../common/pagination.dto';
import { TrackDto } from './track.dto';

export class AdminTracksListQueryDto extends PaginationQueryDto {
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
  sort?:
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

  @ApiPropertyOptional({ enum: ['HIDDEN', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['HIDDEN', 'PUBLISHED'])
  status?: 'HIDDEN' | 'PUBLISHED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class AdminCreateTrackRequestDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  usageRights?: string[];
}

export class AdminUpdateTrackRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  usageRights?: string[];
}

export class AdminTrackUploadUrlResponseDataDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  fileKey: string;
}

export class AdminTrackPlaybackUrlResponseDataDto {
  @ApiProperty()
  playbackUrl: string;
}

export class AdminTracksListDataDto {
  @ApiProperty({ type: [TrackDto] })
  items: TrackDto[];
}
