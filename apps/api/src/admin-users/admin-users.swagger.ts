import { ApiProperty } from '@nestjs/swagger'

export class AdminUserRoleDto {
  @ApiProperty()
  roleId: number

  @ApiProperty()
  roleName: string
}

export class AdminUserDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  fullName: string

  @ApiProperty()
  email: string

  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  status: 'ACTIVE' | 'LOCKED' | 'DELETED'

  @ApiProperty({ type: [AdminUserRoleDto] })
  roles: AdminUserRoleDto[]

  @ApiProperty()
  createdAt: string
}

export class AdminUserListDataDto {
  @ApiProperty({ type: [AdminUserDto] })
  items: AdminUserDto[]
}

export class PaginationDto {
  @ApiProperty()
  page: number

  @ApiProperty()
  pageSize: number

  @ApiProperty()
  totalItems: number

  @ApiProperty()
  totalPages: number

  @ApiProperty()
  hasNextPage: boolean

  @ApiProperty()
  hasPrevPage: boolean
}

export class AdminUserListMetaDto {
  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto
}

export class AdminUserListResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: AdminUserListDataDto })
  data: AdminUserListDataDto

  @ApiProperty({ type: AdminUserListMetaDto })
  meta: AdminUserListMetaDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}
