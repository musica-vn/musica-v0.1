import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { PaginationQueryDto } from '../common/pagination.dto'

export type ConfigStatus = 'ACTIVE' | 'INACTIVE'
export type DigitalPlatform = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK'
export type DigitalDurationType = 'ONE_YEAR' | 'PERPETUAL'

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

const normalizePermissionIds = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) return value

  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()))]
}

export class ConfigPermissionSummaryDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  lawReference: string
}

export class ConfigBaseDto {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status: ConfigStatus

  @ApiProperty({ type: [String] })
  referencedPermissionIds: string[]

  @ApiProperty({ type: [ConfigPermissionSummaryDto] })
  referencedPermissions: ConfigPermissionSummaryDto[]

  @ApiProperty()
  createdAt: string

  @ApiProperty()
  updatedAt: string
}

export class DigitalRightConfigDto extends ConfigBaseDto {
  @ApiProperty({ enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'] })
  targetPlatform: DigitalPlatform

  @ApiProperty({ enum: ['ONE_YEAR', 'PERPETUAL'] })
  durationType: DigitalDurationType

  @ApiProperty()
  basePriceMultiplier: number
}

export class PhysicalRightConfigDto extends ConfigBaseDto {
  @ApiProperty()
  venueUsageType: string

  @ApiProperty()
  basePriceMultiplier: number
}

export class ExpressionConfigDto extends ConfigBaseDto {
  @ApiProperty()
  name: string

  @ApiProperty()
  priceMultiplier: number
}

export class ModificationConfigDto extends ConfigBaseDto {
  @ApiProperty()
  name: string

  @ApiProperty()
  priceMultiplier: number
}

export class DigitalRightConfigsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus

  @ApiPropertyOptional({ enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'] })
  @IsOptional()
  @IsIn(['YOUTUBE', 'TIKTOK', 'FACEBOOK'])
  targetPlatform?: DigitalPlatform

  @ApiPropertyOptional({ enum: ['ONE_YEAR', 'PERPETUAL'] })
  @IsOptional()
  @IsIn(['ONE_YEAR', 'PERPETUAL'])
  durationType?: DigitalDurationType
}

export class GenericConfigsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class DigitalRightConfigsListDataDto {
  @ApiProperty({ type: [DigitalRightConfigDto] })
  items: DigitalRightConfigDto[]
}

export class PhysicalRightConfigsListDataDto {
  @ApiProperty({ type: [PhysicalRightConfigDto] })
  items: PhysicalRightConfigDto[]
}

export class ExpressionConfigsListDataDto {
  @ApiProperty({ type: [ExpressionConfigDto] })
  items: ExpressionConfigDto[]
}

export class ModificationConfigsListDataDto {
  @ApiProperty({ type: [ModificationConfigDto] })
  items: ModificationConfigDto[]
}

class ConfigPermissionIdsFieldDto {
  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @Transform(normalizePermissionIds)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  referencedPermissionIds?: string[]
}

class ConfigStatusFieldDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class CreateDigitalRightConfigRequestDto {
  @ApiProperty({ enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'] })
  @IsIn(['YOUTUBE', 'TIKTOK', 'FACEBOOK'])
  targetPlatform: DigitalPlatform

  @ApiProperty({ enum: ['ONE_YEAR', 'PERPETUAL'] })
  @IsIn(['ONE_YEAR', 'PERPETUAL'])
  durationType: DigitalDurationType

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  basePriceMultiplier: number

  @ApiPropertyOptional({ type: [String], default: [] })
  @Transform(normalizePermissionIds)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  referencedPermissionIds?: string[]

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class UpdateDigitalRightConfigRequestDto extends ConfigPermissionIdsFieldDto {
  @ApiPropertyOptional({ enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'] })
  @IsOptional()
  @IsIn(['YOUTUBE', 'TIKTOK', 'FACEBOOK'])
  targetPlatform?: DigitalPlatform

  @ApiPropertyOptional({ enum: ['ONE_YEAR', 'PERPETUAL'] })
  @IsOptional()
  @IsIn(['ONE_YEAR', 'PERPETUAL'])
  durationType?: DigitalDurationType

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  basePriceMultiplier?: number
}

export class CreatePhysicalRightConfigRequestDto {
  @ApiProperty()
  @Transform(normalizeString)
  @IsString()
  venueUsageType: string

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  basePriceMultiplier: number

  @ApiPropertyOptional({ type: [String], default: [] })
  @Transform(normalizePermissionIds)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  referencedPermissionIds?: string[]

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class UpdatePhysicalRightConfigRequestDto extends ConfigPermissionIdsFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  venueUsageType?: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  basePriceMultiplier?: number
}

export class CreateExpressionConfigRequestDto {
  @ApiProperty()
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceMultiplier: number

  @ApiPropertyOptional({ type: [String], default: [] })
  @Transform(normalizePermissionIds)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  referencedPermissionIds?: string[]

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class UpdateExpressionConfigRequestDto extends ConfigPermissionIdsFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name?: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceMultiplier?: number
}

export class CreateModificationConfigRequestDto {
  @ApiProperty()
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceMultiplier: number

  @ApiPropertyOptional({ type: [String], default: [] })
  @Transform(normalizePermissionIds)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  referencedPermissionIds?: string[]

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ConfigStatus
}

export class UpdateModificationConfigRequestDto extends ConfigPermissionIdsFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name?: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceMultiplier?: number
}

export class UpdateConfigStatusRequestDto extends ConfigStatusFieldDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  declare status: ConfigStatus
}
