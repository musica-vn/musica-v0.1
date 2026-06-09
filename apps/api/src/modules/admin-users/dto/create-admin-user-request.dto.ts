import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'

/**
 * Payload tạo admin user.
 */
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
  @IsInt()
  @Min(1)
  roleId?: number
}

