import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { CorePermissionStatus } from '../types'

export class CorePermissionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  lawReference: string

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status: CorePermissionStatus

  @ApiPropertyOptional({ required: false, nullable: true })
  description: string | null

  @ApiProperty()
  createdAt: string

  @ApiProperty()
  updatedAt: string
}

