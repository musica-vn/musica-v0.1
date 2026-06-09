import { IsIn, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/base/pagination.dto'

/**
 * Query params cho API quản trị danh sách user (admin/users).
 */
export class ManagedUserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LOCKED', 'DELETED'])
  status?: 'ACTIVE' | 'LOCKED' | 'DELETED'

  @ApiPropertyOptional({ enum: ['Buyer', 'Artist'] })
  @IsOptional()
  @IsIn(['Buyer', 'Artist'])
  roleName?: 'Buyer' | 'Artist'
}

