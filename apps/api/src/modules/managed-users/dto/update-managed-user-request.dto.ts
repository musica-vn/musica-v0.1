import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

/**
 * Payload cập nhật thông tin user trong phạm vi quản trị.
 */
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

