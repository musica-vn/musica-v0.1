import { ApiProperty } from '@nestjs/swagger'
import { PaginationMetaDto } from '../common/pagination.swagger'
import { AdminCorePermissionsListDataDto, CorePermissionDto } from './core-permissions.dto'

export class AdminCorePermissionResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: CorePermissionDto })
  data: CorePermissionDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

export class AdminCorePermissionsListResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: AdminCorePermissionsListDataDto })
  data: AdminCorePermissionsListDataDto

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}

