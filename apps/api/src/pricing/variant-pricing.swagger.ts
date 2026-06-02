import { ApiProperty } from '@nestjs/swagger'
import { PublicVariantPricingCalculateDataDto } from './variant-pricing.dto'

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

export class PublicVariantPricingCalculateResponseDto extends BaseResponseEnvelopeDto {
  @ApiProperty({ type: PublicVariantPricingCalculateDataDto })
  data: PublicVariantPricingCalculateDataDto
}

