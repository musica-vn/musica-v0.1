import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { CertificateListItemDto } from './certificate.dto';

export class AdminCertificatesListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerKeyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackKeyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE'])
  status?: 'ACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AdminCertificatesListDataDto {
  @ApiProperty({ type: [CertificateListItemDto] })
  items: CertificateListItemDto[];
}

export class UpdateCertificateTemplateRequestDto {
  @ApiProperty()
  @IsString()
  htmlTemplate: string;
}
