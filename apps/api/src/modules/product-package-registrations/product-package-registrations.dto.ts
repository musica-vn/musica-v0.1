import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type ProductPackageRegistrationStatus = 'JOINED' | 'REMOVED';
export type ProductPackageType = 'DIGITAL' | 'PHYSICAL';
export type ProductPackageRegistrationEligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE';

export class CreateProductPackageRegistrationRequestDto {
  @ApiProperty()
  @IsUUID('4')
  configId: string;
}

export class ProductPackageRegistrationPermissionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lawReference: string;
}

export class ProductPackageRegistrationItemDto {
  @ApiProperty()
  registrationId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productTitle: string;

  @ApiProperty()
  configId: string;

  @ApiProperty({ enum: ['DIGITAL', 'PHYSICAL'] })
  packageType: ProductPackageType;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  configStatus: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ enum: ['ELIGIBLE', 'INELIGIBLE'] })
  eligibilityStatus: ProductPackageRegistrationEligibilityStatus;

  @ApiProperty({ enum: ['JOINED', 'REMOVED'] })
  registrationStatus: ProductPackageRegistrationStatus;

  @ApiProperty({ type: [ProductPackageRegistrationPermissionDto] })
  referencedPermissions: ProductPackageRegistrationPermissionDto[];

  @ApiProperty({ type: [ProductPackageRegistrationPermissionDto] })
  missingPermissions: ProductPackageRegistrationPermissionDto[];

  @ApiProperty()
  joinedAt: string;

  @ApiPropertyOptional({ nullable: true })
  joinedBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  removedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  removedBy: string | null;
}

export class ProductPackageRegistrationListDataDto {
  @ApiProperty({ type: [ProductPackageRegistrationItemDto] })
  items: ProductPackageRegistrationItemDto[];
}

export class ProductPackageRegistrationListQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: ['JOINED', 'REMOVED'] })
  @IsOptional()
  @IsIn(['JOINED', 'REMOVED'])
  status?: ProductPackageRegistrationStatus;
}

export class ProductPackageRegistrationSummaryDto {
  @ApiProperty()
  eligibleCount: number;

  @ApiProperty()
  joinedCount: number;
}
