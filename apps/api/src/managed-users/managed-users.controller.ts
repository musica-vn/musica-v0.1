import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { PaginationMeta } from '@musica/contracts'
import type { ApiEnvelopePayload } from '../common/api-response.interceptor'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RequireRoles } from '../common/auth/require-roles.decorator'
import { RolesGuard } from '../common/auth/roles.guard'
import {
  CreateManagedUserRequestDto,
  ManagedUserListQueryDto,
  UpdateManagedUserRequestDto,
  UpdateManagedUserStatusRequestDto,
} from './managed-users.dto'
import { ManagedUsersService } from './managed-users.service'
import { ManagedUserListResponseDto } from './managed-users.swagger'

const buildPaginationMeta = (page: number, pageSize: number, totalItems: number): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  return {
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}

@ApiTags('managed-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/users')
export class ManagedUsersController {
  constructor(private readonly managedUsersService: ManagedUsersService) {}

  @Get()
  @ApiOkResponse({ type: ManagedUserListResponseDto })
  async listUsers(
    @Query() query: ManagedUserListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: unknown[] }, PaginationMeta>> {
    const { items, totalItems } = await this.managedUsersService.listUsers(query)
    return { data: { items }, meta: buildPaginationMeta(query.page, query.pageSize, totalItems) }
  }

  @Post()
  async createUser(@Body() body: CreateManagedUserRequestDto) {
    return this.managedUsersService.createUser(body)
  }

  @Patch(':userId')
  async updateUser(@Param('userId') userId: string, @Body() body: UpdateManagedUserRequestDto) {
    return this.managedUsersService.updateUser(userId, body)
  }

  @Patch(':userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: UpdateManagedUserStatusRequestDto,
  ) {
    return this.managedUsersService.updateUserStatus(userId, body.status)
  }

  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string) {
    await this.managedUsersService.softDeleteUser(userId)
    return { ok: true }
  }
}
