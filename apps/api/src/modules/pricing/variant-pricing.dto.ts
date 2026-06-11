import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  VARIANT_DURATION_OPTIONS,
  VARIANT_SCOPE_OPTIONS,
  VARIANT_SUBJECT_OPTIONS,
  type VariantDuration,
  type VariantScope,
  type VariantSubject,
} from './variant-pricing.enums';

export type VariantPricingPlatformType = 'DIGITAL' | 'PHYSICAL';

export class PublicVariantPricingCalculateRequestDto {
  @ApiProperty({ enum: ['DIGITAL', 'PHYSICAL'] })
  @IsIn(['DIGITAL', 'PHYSICAL'])
  platformType: VariantPricingPlatformType;

  @ApiPropertyOptional()
  @ValidateIf((dto: PublicVariantPricingCalculateRequestDto) => dto.platformType === 'DIGITAL')
  @IsUUID('4')
  digitalRightConfigId?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: PublicVariantPricingCalculateRequestDto) => dto.platformType === 'PHYSICAL')
  @IsUUID('4')
  physicalRightConfigId?: string;

  @ApiPropertyOptional({ enum: VARIANT_SUBJECT_OPTIONS })
  @IsOptional()
  @IsIn(VARIANT_SUBJECT_OPTIONS)
  subject?: VariantSubject;

  @ApiPropertyOptional({ enum: VARIANT_DURATION_OPTIONS })
  @IsOptional()
  @IsIn(VARIANT_DURATION_OPTIONS)
  duration?: VariantDuration;

  @ApiPropertyOptional({ enum: VARIANT_SCOPE_OPTIONS })
  @IsOptional()
  @IsIn(VARIANT_SCOPE_OPTIONS)
  scope?: VariantScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  expressionConfigId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  modificationConfigId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  productId?: string;
}

export class VariantPricingBreakdownLineDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;
}

export class PublicVariantPricingCalculateDataDto {
  @ApiProperty()
  totalPrice: number;

  @ApiProperty({ example: 'VND' })
  currency: 'VND';

  @ApiProperty({ type: [VariantPricingBreakdownLineDto] })
  @ValidateNested({ each: true })
  @Type(() => VariantPricingBreakdownLineDto)
  breakdown: VariantPricingBreakdownLineDto[];
}
