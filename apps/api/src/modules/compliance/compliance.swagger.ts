import { ApiProperty } from '@nestjs/swagger'
import { PaginationMetaDto } from '../../common/base/pagination.swagger'
import {
  AdminComplianceFileDownloadUrlDataDto,
  AdminComplianceListDataDto,
  ComplianceDetailDto,
} from './compliance.dto'

export class AdminComplianceListResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: AdminComplianceListDataDto })
  data: AdminComplianceListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

export class AdminComplianceDetailResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: ComplianceDetailDto })
  data: ComplianceDetailDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

export class AdminComplianceFileDownloadUrlResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: AdminComplianceFileDownloadUrlDataDto })
  data: AdminComplianceFileDownloadUrlDataDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}
