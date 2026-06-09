import { Transform } from 'class-transformer'
import { IsIn } from 'class-validator'

/**
 * Payload cập nhật trạng thái user (admin/users/:id/status).
 */
export class UpdateManagedUserStatusRequestDto {
  @Transform(({ value }) => value)
  @IsIn(['ACTIVE', 'LOCKED'])
  status: 'ACTIVE' | 'LOCKED'
}

