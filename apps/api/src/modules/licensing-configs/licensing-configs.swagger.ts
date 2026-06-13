import { ApiProperty } from '@nestjs/swagger'
import { PaginationMetaDto } from '../../common/base/pagination.swagger'
import {
  DigitalRightConfigDto,
  DigitalPlatformDefaultTemplateDto,
  DigitalRightConfigsListDataDto,
  ExpressionConfigDto,
  ExpressionConfigsListDataDto,
  ModificationConfigDto,
  ModificationConfigsListDataDto,
  PhysicalRightConfigDto,
  PhysicalRightConfigsListDataDto,
} from './licensing-configs.dto'

class BaseResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

export class AdminDigitalRightConfigResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: DigitalRightConfigDto })
  data: DigitalRightConfigDto
}

export class AdminDigitalRightConfigsListResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: DigitalRightConfigsListDataDto })
  data: DigitalRightConfigsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto
}

export class AdminDigitalPlatformDefaultTemplateResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: DigitalPlatformDefaultTemplateDto })
  data: DigitalPlatformDefaultTemplateDto
}

export class AdminPhysicalRightConfigResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: PhysicalRightConfigDto })
  data: PhysicalRightConfigDto
}

export class AdminPhysicalRightConfigsListResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: PhysicalRightConfigsListDataDto })
  data: PhysicalRightConfigsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto
}

export class AdminExpressionConfigResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: ExpressionConfigDto })
  data: ExpressionConfigDto
}

export class AdminExpressionConfigsListResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: ExpressionConfigsListDataDto })
  data: ExpressionConfigsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto
}

export class AdminModificationConfigResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: ModificationConfigDto })
  data: ModificationConfigDto
}

export class AdminModificationConfigsListResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: ModificationConfigsListDataDto })
  data: ModificationConfigsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto
}
