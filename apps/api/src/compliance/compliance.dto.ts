import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsArray, IsIn, IsOptional, IsString, IsUUID, Max, Min, ValidateIf } from 'class-validator'
import { PaginationQueryDto } from '../common/pagination.dto'

export type ComplianceLegalStatus = 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT'
export type ComplianceReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ProductStatus = 'PENDING' | 'HIDDEN' | 'PUBLISHED'

export type UploadedLegalFileDto = {
  fileName: string
  fileKey: string
  uploadedAt: string
  mimeType: string
  size: number
}

export class CorePermissionSummaryDto {
  @ApiProperty()
  name: string

  @ApiProperty()
  lawReference: string
}

export class ComplianceProductSnapshotDto {
  @ApiProperty()
  trackId: string

  @ApiProperty()
  productCode: string

  @ApiProperty()
  title: string

  @ApiProperty()
  artistId: string

  @ApiPropertyOptional({ required: false, nullable: true })
  artistName: string | null

  @ApiProperty({ enum: ['PENDING', 'HIDDEN', 'PUBLISHED'] })
  status: ProductStatus
}

export class ComplianceListItemDto {
  @ApiProperty()
  complianceId: string

  @ApiProperty()
  complianceCode: string

  @ApiProperty({ enum: ['PENDING', 'SUFFICIENT', 'INSUFFICIENT'] })
  legalStatus: ComplianceLegalStatus

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  reviewStatus: ComplianceReviewStatus

  @ApiProperty()
  filesCount: number

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedBy: string | null

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedByName: string | null

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedAt: string | null

  @ApiProperty({ type: ComplianceProductSnapshotDto })
  product: ComplianceProductSnapshotDto
}

export class ComplianceDetailDto {
  @ApiProperty()
  complianceId: string

  @ApiProperty()
  complianceCode: string

  @ApiProperty({ enum: ['PENDING', 'SUFFICIENT', 'INSUFFICIENT'] })
  legalStatus: ComplianceLegalStatus

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  reviewStatus: ComplianceReviewStatus

  @ApiPropertyOptional({ required: false, nullable: true })
  rejectReason: string | null

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedBy: string | null

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedByName: string | null

  @ApiPropertyOptional({ required: false, nullable: true })
  reviewedAt: string | null

  @ApiProperty({ type: [String] })
  approvedPermissionIds: string[]

  @ApiProperty({ type: [CorePermissionSummaryDto] })
  approvedPermissions: CorePermissionSummaryDto[]

  @ApiProperty({ type: Array })
  uploadedLegalFiles: UploadedLegalFileDto[]

  @ApiProperty({ type: ComplianceProductSnapshotDto })
  product: ComplianceProductSnapshotDto
}

export class AdminComplianceListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ['PENDING', 'SUFFICIENT', 'INSUFFICIENT'] })
  @IsOptional()
  @IsIn(['PENDING', 'SUFFICIENT', 'INSUFFICIENT'])
  legalStatus?: ComplianceLegalStatus

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  reviewStatus?: ComplianceReviewStatus

  @ApiPropertyOptional({ enum: ['PENDING', 'HIDDEN', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['PENDING', 'HIDDEN', 'PUBLISHED'])
  productStatus?: ProductStatus

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @Min(1)
  @Max(100)
  declare pageSize: number
}

export class AdminComplianceListDataDto {
  @ApiProperty({ type: [ComplianceListItemDto] })
  items: ComplianceListItemDto[]
}

export class AdminCreateComplianceFileDownloadUrlRequestDto {
  @ApiProperty()
  @IsString()
  fileKey: string
}

export class AdminComplianceFileDownloadUrlDataDto {
  @ApiProperty()
  downloadUrl: string
}

export class AdminComplianceDecisionRequestDto {
  @ApiProperty({ enum: ['PENDING', 'SUFFICIENT', 'INSUFFICIENT'] })
  @IsIn(['PENDING', 'SUFFICIENT', 'INSUFFICIENT'])
  legalStatus: ComplianceLegalStatus

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  reviewStatus: ComplianceReviewStatus

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  approvedPermissionIds: string[]

  @ApiPropertyOptional()
  @ValidateIf((value: AdminComplianceDecisionRequestDto) =>
    value.legalStatus === 'INSUFFICIENT' || value.reviewStatus === 'REJECTED',
  )
  @IsString()
  rejectReason?: string
}

export class AdminComplianceUploadResultDto {
  @ApiProperty({ type: [Object] })
  uploadedLegalFiles: UploadedLegalFileDto[]
}
