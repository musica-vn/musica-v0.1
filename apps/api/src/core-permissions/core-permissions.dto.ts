import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsOptional, IsString, Matches } from 'class-validator'
import { PaginationQueryDto } from '../common/pagination.dto'

export type CorePermissionStatus = 'ACTIVE' | 'INACTIVE'

export class CorePermissionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

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

export class AdminCorePermissionsListDataDto {
  @ApiProperty({ type: [CorePermissionDto] })
  items: CorePermissionDto[]
}

export class AdminCreateCorePermissionRequestDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  code: string

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
}

export class AdminUpdateCorePermissionRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lawReference?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: CorePermissionStatus
}

export class AdminUpdateCorePermissionStatusRequestDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: CorePermissionStatus
}
