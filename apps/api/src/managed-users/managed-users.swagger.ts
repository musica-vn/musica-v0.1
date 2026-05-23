import { ApiProperty } from '@nestjs/swagger'

export class ManagedUserDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  fullName: string

  @ApiProperty()
  email: string

  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  status: 'ACTIVE' | 'LOCKED' | 'DELETED'

  @ApiProperty({ type: [String], enum: ['BUYER', 'ARTIST'] })
  roleCodes: Array<'BUYER' | 'ARTIST'>

  @ApiProperty()
  createdAt: string
}

export class ManagedUserListDataDto {
  @ApiProperty({ type: [ManagedUserDto] })
  items: ManagedUserDto[]
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

export class ManagedUserListMetaDto {
  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto
}

export class ManagedUserListResponseDto {
  @ApiProperty({ example: true })
  success: true

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ type: ManagedUserListDataDto })
  data: ManagedUserListDataDto

  @ApiProperty({ type: ManagedUserListMetaDto })
  meta: ManagedUserListMetaDto

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string
}
