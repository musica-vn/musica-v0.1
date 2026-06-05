import { IsEmail, IsIn, IsString, MinLength } from 'class-validator'

/**
 * Payload tạo user trong phạm vi quản trị (Buyer/Artist).
 */
export class CreateManagedUserRequestDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  fullName: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @IsIn(['Buyer', 'Artist'])
  roleName: 'Buyer' | 'Artist'
}

