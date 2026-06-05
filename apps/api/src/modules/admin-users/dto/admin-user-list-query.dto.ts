import { IsIn, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/base/pagination.dto'

/**
 * Query params cho API danh sách admin users.
 */
export class AdminUserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LOCKED', 'DELETED'])
  status?: 'ACTIVE' | 'LOCKED' | 'DELETED'
}

