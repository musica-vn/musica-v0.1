import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'
import type { CorePermissionStatus } from '../types'

export class AdminUpdateCorePermissionStatusRequestDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: CorePermissionStatus
}

