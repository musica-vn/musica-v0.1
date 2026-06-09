import { HttpStatus, Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { ApiHttpException } from '../../common/errors/api-http.exception'
import { SupabaseService } from '../../database/supabase.service'
import { isUniqueViolation } from '../../common/database/postgres-errors'
import { throwSupabaseError } from '../../common/database/supabase-errors'
import { normalizeRoles } from '../../common/users/normalize-roles'
import type { AdminUserListQueryDto, CreateAdminUserRequestDto, UpdateAdminUserRequestDto } from './dto'

type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'

type DbRoleRow = { id: number; name: string }

type DbUserRoleRow = {
  role_id: number
  role?: { id?: unknown; name?: unknown } | null
}

type DbAdminUserRow = {
  id: string
  email: string
  full_name: string
  status: UserStatus
  created_at: string
  user_roles: DbUserRoleRow[]
}

type AdminUserItem = {
  id: string
  email: string
  fullName: string
  status: UserStatus
  roles: Array<{ roleId: number; roleName: string }>
  createdAt: string
}

/**
 * Service quản lý Admin users (list/get/create/update/status/delete) và mapping roles từ DB.
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getRolesByNames(names: string[]): Promise<DbRoleRow[]> {
    const { data, error } = await this.supabaseService.client
      .from('roles')
      .select('id,name')
      .in('name', names)
      .returns<DbRoleRow[]>()

    if (error) {
      throwSupabaseError('ADMIN_USERS_ROLES_LOOKUP_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
    }

    return data ?? []
  }

  private async getRoleById(roleId: number): Promise<DbRoleRow | null> {
    const { data, error } = await this.supabaseService.client
      .from('roles')
      .select('id,name')
      .eq('id', roleId)
      .maybeSingle<DbRoleRow>()

    if (error) {
      throwSupabaseError('ADMIN_USERS_ROLE_LOOKUP_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
    }

    return data ?? null
  }

  private buildAdminUserItem(row: DbAdminUserRow): AdminUserItem {
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      status: row.status,
      roles: normalizeRoles(row.user_roles),
      createdAt: row.created_at,
    }
  }

  async listAdmins(query: AdminUserListQueryDto): Promise<{ items: AdminUserItem[]; totalItems: number }> {
    const roleIds = (await this.getRolesByNames(['Admin'])).map((role) => role.id)
    if (roleIds.length === 0) return { items: [], totalItems: 0 }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    let sb = this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,created_at,user_roles!inner(role_id,role:roles(id,name))', {
        count: 'exact',
      })
      .in('user_roles.role_id', roleIds)

    if (query.status) {
      sb = sb.eq('status', query.status)
    } else {
      sb = sb.neq('status', 'DELETED')
    }

    if (query.q && query.q.trim().length > 0) {
      const q = query.q.trim().replaceAll('%', '')
      sb = sb.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    }

    const { data, error, count } = await sb
      .order('created_at', { ascending: true })
      .range(from, to)
      .returns<DbAdminUserRow[]>()

    if (error) {
      throwSupabaseError('ADMIN_USERS_LIST_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
    }

    const items = (data ?? []).map((x) => this.buildAdminUserItem(x))
    return { items, totalItems: typeof count === 'number' ? count : items.length }
  }

  async getAdminById(adminId: string): Promise<AdminUserItem | null> {
    const roleIds = (await this.getRolesByNames(['Admin', 'Super Admin'])).map(
      (role) => role.id,
    )
    if (roleIds.length === 0) return null

    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,created_at,user_roles!inner(role_id,role:roles(id,name))')
      .eq('id', adminId)
      .in('user_roles.role_id', roleIds)
      .maybeSingle<DbAdminUserRow>()

    if (error) {
      throwSupabaseError('ADMIN_USERS_GET_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
    }

    if (!data) return null
    return this.buildAdminUserItem(data)
  }

  async createAdmin(payload: CreateAdminUserRequestDto): Promise<AdminUserItem> {
    const defaultAdminRole = (await this.getRolesByNames(['Admin']))[0]
    const role =
      typeof payload.roleId === 'number'
        ? await this.getRoleById(payload.roleId)
        : defaultAdminRole

    if (!role) throw new ApiHttpException({ code: 'ADMIN_USERS_INVALID_ROLE' }, HttpStatus.BAD_REQUEST)
    if (role.name === 'Super Admin') {
      throw new ApiHttpException({ code: 'ADMIN_USERS_SUPER_ADMIN_ROLE_FORBIDDEN' }, HttpStatus.FORBIDDEN)
    }

    const passwordHash = await hash(payload.password, 10)

    const { data: insertedUsers, error: insertUserError } = await this.supabaseService.client
      .from('users')
      .insert({
        email: payload.email,
        password_hash: passwordHash,
        full_name: payload.fullName,
        status: 'ACTIVE',
      })
      .select('id,email,full_name,status,created_at')
      .returns<Array<Omit<DbAdminUserRow, 'user_roles'>>>()

    if (insertUserError) {
      if (isUniqueViolation(insertUserError)) {
        throw new ApiHttpException(
          { code: 'ADMIN_USERS_EMAIL_ALREADY_EXISTS' },
          HttpStatus.CONFLICT,
        )
      }
      throwSupabaseError(
        'ADMIN_USERS_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        insertUserError,
      )
    }

    const inserted = insertedUsers?.[0]
    if (!inserted) {
      throw new ApiHttpException(
        { code: 'ADMIN_USERS_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    const { error: insertRoleError } = await this.supabaseService.client.from('user_roles').insert({
      user_id: inserted.id,
      role_id: role.id,
    })

    if (insertRoleError) {
      throwSupabaseError(
        'ADMIN_USERS_ROLE_ASSIGN_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        insertRoleError,
      )
    }

    const admin = await this.getAdminById(inserted.id)
    if (!admin) {
      throw new ApiHttpException(
        { code: 'ADMIN_USERS_LOAD_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    return admin
  }

  private isSuperAdmin(roles: Array<{ roleId: number; roleName: string }>): boolean {
    return roles.some((role) => role.roleName === 'Super Admin')
  }

  async updateAdmin(adminId: string, payload: UpdateAdminUserRequestDto): Promise<AdminUserItem> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new ApiHttpException({ code: 'ADMIN_USER_NOT_FOUND' }, HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roles)) {
      throw new ApiHttpException({ code: 'ADMIN_USERS_SUPER_ADMIN_PROTECTED' }, HttpStatus.FORBIDDEN)
    }

    const updates: Record<string, unknown> = {}
    if (typeof payload.email === 'string') updates.email = payload.email
    if (typeof payload.fullName === 'string') updates.full_name = payload.fullName
    if (typeof payload.password === 'string') updates.password_hash = await hash(payload.password, 10)

    if (Object.keys(updates).length > 0) {
      const { error } = await this.supabaseService.client.from('users').update(updates).eq('id', adminId)
      if (error) {
        if (isUniqueViolation(error)) {
          throw new ApiHttpException(
            { code: 'ADMIN_USERS_EMAIL_ALREADY_EXISTS' },
            HttpStatus.CONFLICT,
          )
        }
        throwSupabaseError('ADMIN_USERS_UPDATE_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
      }
    }

    if (typeof payload.roleId === 'number') {
      const role = await this.getRoleById(payload.roleId)
      if (!role) throw new ApiHttpException({ code: 'ADMIN_USERS_INVALID_ROLE' }, HttpStatus.BAD_REQUEST)
      if (role.name === 'Super Admin') {
        throw new ApiHttpException({ code: 'ADMIN_USERS_SUPER_ADMIN_ROLE_FORBIDDEN' }, HttpStatus.FORBIDDEN)
      }

      const adminRoleIds = (await this.getRolesByNames(['Admin', 'Super Admin'])).map(
        (item) => item.id,
      )
      if (adminRoleIds.length > 0) {
        const { error: deleteError } = await this.supabaseService.client
          .from('user_roles')
          .delete()
          .eq('user_id', adminId)
          .in('role_id', adminRoleIds)

        if (deleteError) {
          throwSupabaseError(
            'ADMIN_USERS_ROLE_UNASSIGN_FAILED',
            HttpStatus.INTERNAL_SERVER_ERROR,
            deleteError,
          )
        }
      }

      const { error: insertError } = await this.supabaseService.client.from('user_roles').insert({
        user_id: adminId,
        role_id: role.id,
      })
      if (insertError) {
        throwSupabaseError(
          'ADMIN_USERS_ROLE_ASSIGN_FAILED',
          HttpStatus.INTERNAL_SERVER_ERROR,
          insertError,
        )
      }
    }

    const updated = await this.getAdminById(adminId)
    if (!updated) throw new ApiHttpException({ code: 'ADMIN_USER_NOT_FOUND' }, HttpStatus.NOT_FOUND)
    return updated
  }

  async updateAdminStatus(adminId: string, status: 'ACTIVE' | 'LOCKED'): Promise<AdminUserItem> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new ApiHttpException({ code: 'ADMIN_USER_NOT_FOUND' }, HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roles)) {
      throw new ApiHttpException({ code: 'ADMIN_USERS_SUPER_ADMIN_PROTECTED' }, HttpStatus.FORBIDDEN)
    }

    const { error } = await this.supabaseService.client.from('users').update({ status }).eq('id', adminId)
    if (error) throwSupabaseError('ADMIN_USERS_UPDATE_STATUS_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)

    const updated = await this.getAdminById(adminId)
    if (!updated) throw new ApiHttpException({ code: 'ADMIN_USER_NOT_FOUND' }, HttpStatus.NOT_FOUND)
    return updated
  }

  async softDeleteAdmin(adminId: string): Promise<void> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new ApiHttpException({ code: 'ADMIN_USER_NOT_FOUND' }, HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roles)) {
      throw new ApiHttpException({ code: 'ADMIN_USERS_SUPER_ADMIN_PROTECTED' }, HttpStatus.FORBIDDEN)
    }

    const { error } = await this.supabaseService.client
      .from('users')
      .update({ status: 'DELETED' })
      .eq('id', adminId)

    if (error) throwSupabaseError('ADMIN_USERS_DELETE_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error)
  }
}
