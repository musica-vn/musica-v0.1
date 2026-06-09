import { Transform } from 'class-transformer'
import { IsIn } from 'class-validator'

/**
 * Payload cập nhật trạng thái admin user.
 */
export class UpdateAdminUserStatusRequestDto {
  @Transform(({ value }) => value)
  @IsIn(['ACTIVE', 'LOCKED'])
  status: 'ACTIVE' | 'LOCKED'
}

