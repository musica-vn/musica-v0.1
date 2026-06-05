import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'

/**
 * Payload cập nhật admin user.
 */
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
  @IsInt()
  @Min(1)
  roleId?: number
}

