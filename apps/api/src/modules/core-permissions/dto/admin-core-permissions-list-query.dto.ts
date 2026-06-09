import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/base/pagination.dto'
import type { CorePermissionStatus } from '../types'

export class AdminCorePermissionsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: CorePermissionStatus

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  declare pageSize: number
}

