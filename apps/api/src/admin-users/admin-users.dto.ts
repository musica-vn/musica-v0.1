import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../common/pagination.dto'

export class AdminUserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LOCKED', 'DELETED'])
  status?: 'ACTIVE' | 'LOCKED' | 'DELETED'
}

export class CreateAdminUserRequestDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  fullName: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsString()
  roleCode?: string
}

export class UpdateAdminUserRequestDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string

  @IsOptional()
  @IsString()
  roleCode?: string
}

export class UpdateAdminUserStatusRequestDto {
  @Transform(({ value }) => value)
  @IsIn(['ACTIVE', 'LOCKED'])
  status: 'ACTIVE' | 'LOCKED'
}

