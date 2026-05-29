import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../common/pagination.dto'

export class ManagedUserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LOCKED', 'DELETED'])
  status?: 'ACTIVE' | 'LOCKED' | 'DELETED'

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number
}

export class CreateManagedUserRequestDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  fullName: string

  @IsString()
  @MinLength(8)
  password: string

  @IsInt()
  @Min(1)
  roleId: number
}

export class UpdateManagedUserRequestDto {
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
}

export class UpdateManagedUserStatusRequestDto {
  @Transform(({ value }) => value)
  @IsIn(['ACTIVE', 'LOCKED'])
  status: 'ACTIVE' | 'LOCKED'
}
