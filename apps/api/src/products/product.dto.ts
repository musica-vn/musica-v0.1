import { ApiProperty } from '@nestjs/swagger';

export class ProductAllowedPermissionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lawReference: string;
}

export class ProductLicensingEligibilityConfigDto {
  @ApiProperty()
  configId: string;

  @ApiProperty({ enum: ['DIGITAL', 'PHYSICAL'] })
  configType: 'DIGITAL' | 'PHYSICAL';

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['ELIGIBLE', 'INELIGIBLE'] })
  status: 'ELIGIBLE' | 'INELIGIBLE';

  @ApiProperty({ type: [ProductAllowedPermissionDto] })
  referencedPermissions: ProductAllowedPermissionDto[];

  @ApiProperty({ type: [ProductAllowedPermissionDto] })
  missingPermissions: ProductAllowedPermissionDto[];
}

export class ProductLicensingEligibilitySummaryDto {
  @ApiProperty()
  eligibleDigitalCount: number;

  @ApiProperty()
  ineligibleDigitalCount: number;

  @ApiProperty()
  eligiblePhysicalCount: number;

  @ApiProperty()
  ineligiblePhysicalCount: number;
}

export class ProductLicensingEligibilityDto {
  @ApiProperty({ type: [ProductLicensingEligibilityConfigDto] })
  digitalConfigs: ProductLicensingEligibilityConfigDto[];

  @ApiProperty({ type: [ProductLicensingEligibilityConfigDto] })
  physicalConfigs: ProductLicensingEligibilityConfigDto[];

  @ApiProperty({ type: ProductLicensingEligibilitySummaryDto })
  summary: ProductLicensingEligibilitySummaryDto;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty({ required: false, nullable: true })
  authorName: string | null;

  @ApiProperty({ required: false, nullable: true })
  genre: string | null;

  @ApiProperty({ required: false, nullable: true })
  duration: number | null;

  @ApiProperty({ enum: ['HIDDEN', 'PUBLISHED'] })
  status: 'PENDING' | 'HIDDEN' | 'PUBLISHED';

  @ApiProperty({ required: false, nullable: true })
  useCase: string | null;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ type: [String] })
  allowedPermissionIds: string[];

  @ApiProperty({ type: [ProductAllowedPermissionDto] })
  allowedPermissions: ProductAllowedPermissionDto[];

  @ApiProperty({ type: ProductLicensingEligibilityDto })
  licensingEligibility: ProductLicensingEligibilityDto;

  @ApiProperty({ enum: ['PENDING', 'SUFFICIENT', 'INSUFFICIENT'], required: false, nullable: true })
  complianceLegalStatus: 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT' | null;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'], required: false, nullable: true })
  complianceReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;

  @ApiProperty({ required: false, nullable: true })
  originalAudioKey: string | null;

  @ApiProperty({ required: false, nullable: true })
  thumbnailKey: string | null;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
