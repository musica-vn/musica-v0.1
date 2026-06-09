import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString } from 'class-validator'
import type { CorePermissionStatus } from '../types'

export class AdminCreateCorePermissionRequestDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  lawReference: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: CorePermissionStatus
}

