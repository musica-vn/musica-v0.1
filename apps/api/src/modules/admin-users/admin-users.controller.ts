import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { PaginationMeta } from '@musica/contracts'
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RequireRoles } from '../../common/auth/require-roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import {
  AdminUserListQueryDto,
  CreateAdminUserRequestDto,
  UpdateAdminUserRequestDto,
  UpdateAdminUserStatusRequestDto,
} from './admin-users.dto'
import { AdminUsersService } from './admin-users.service'
import { AdminUserListResponseDto } from './admin-users.swagger'

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

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('SUPER_ADMIN')
@Controller('admin/users/admins')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOkResponse({ type: AdminUserListResponseDto })
  async listAdmins(
    @Query() query: AdminUserListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: unknown[] }, PaginationMeta>> {
    const { items, totalItems } = await this.adminUsersService.listAdmins(query)
    return { data: { items }, meta: buildPaginationMeta(query.page, query.pageSize, totalItems) }
  }

  @Post()
  async createAdmin(@Body() body: CreateAdminUserRequestDto) {
    return this.adminUsersService.createAdmin(body)
  }

  @Patch(':adminId')
  async updateAdmin(@Param('adminId') adminId: string, @Body() body: UpdateAdminUserRequestDto) {
    return this.adminUsersService.updateAdmin(adminId, body)
  }

  @Patch(':adminId/status')
  async updateAdminStatus(@Param('adminId') adminId: string, @Body() body: UpdateAdminUserStatusRequestDto) {
    return this.adminUsersService.updateAdminStatus(adminId, body.status)
  }

  @Delete(':adminId')
  async deleteAdmin(@Param('adminId') adminId: string) {
    await this.adminUsersService.softDeleteAdmin(adminId)
    return { ok: true }
  }
}

