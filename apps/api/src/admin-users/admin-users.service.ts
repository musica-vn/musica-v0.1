import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { SupabaseService } from '../supabase/supabase.service'
import type { AdminUserListQueryDto, CreateAdminUserRequestDto, UpdateAdminUserRequestDto } from './admin-users.dto'

type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'

type DbRoleRow = { id: number; code: string }

type DbUserRoleRow = {
  role_id: number
  role?: { code?: unknown }
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
  roleCodes: string[]
  createdAt: string
}

const normalizeRoleCodes = (userRoles: DbUserRoleRow[]): string[] =>
  (userRoles ?? [])
    .map((x) => x?.role?.code)
    .filter((x): x is string => typeof x === 'string')

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  return (error as any).code === '23505'
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getRoleIdsByCodes(codes: string[]): Promise<number[]> {
    const { data, error } = await this.supabaseService.client
      .from('roles')
      .select('id,code')
      .in('code', codes)
      .returns<DbRoleRow[]>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return (data ?? []).map((x) => x.id)
  }

  private buildAdminUserItem(row: DbAdminUserRow): AdminUserItem {
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      status: row.status,
      roleCodes: normalizeRoleCodes(row.user_roles),
      createdAt: row.created_at,
    }
  }

  async listAdmins(query: AdminUserListQueryDto): Promise<{ items: AdminUserItem[]; totalItems: number }> {
    const roleIds = await this.getRoleIdsByCodes(['ADMIN'])
    if (roleIds.length === 0) return { items: [], totalItems: 0 }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    let sb = this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,created_at,user_roles!inner(role_id,role:roles(code))', {
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
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const items = (data ?? []).map((x) => this.buildAdminUserItem(x))
    return { items, totalItems: typeof count === 'number' ? count : items.length }
  }

  async getAdminById(adminId: string): Promise<AdminUserItem | null> {
    const roleIds = await this.getRoleIdsByCodes(['ADMIN', 'SUPER_ADMIN'])
    if (roleIds.length === 0) return null

    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,created_at,user_roles!inner(role_id,role:roles(code))')
      .eq('id', adminId)
      .in('user_roles.role_id', roleIds)
      .maybeSingle<DbAdminUserRow>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    if (!data) return null
    return this.buildAdminUserItem(data)
  }

  async createAdmin(payload: CreateAdminUserRequestDto): Promise<AdminUserItem> {
    const roleCode = payload.roleCode && payload.roleCode.length > 0 ? payload.roleCode : 'ADMIN'
    if (roleCode === 'SUPER_ADMIN') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
    }

    const roleIds = await this.getRoleIdsByCodes([roleCode])
    const roleId = roleIds[0]
    if (!roleId) {
      throw new HttpException('Invalid role', HttpStatus.BAD_REQUEST)
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
        throw new HttpException('Email already exists', HttpStatus.CONFLICT)
      }
      throw new HttpException(insertUserError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const inserted = insertedUsers?.[0]
    if (!inserted) {
      throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const { error: insertRoleError } = await this.supabaseService.client.from('user_roles').insert({
      user_id: inserted.id,
      role_id: roleId,
    })

    if (insertRoleError) {
      throw new HttpException(insertRoleError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const admin = await this.getAdminById(inserted.id)
    if (!admin) {
      throw new HttpException('Failed to load created user', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return admin
  }

  private isSuperAdmin(roleCodes: string[]): boolean {
    return roleCodes.includes('SUPER_ADMIN')
  }

  async updateAdmin(adminId: string, payload: UpdateAdminUserRequestDto): Promise<AdminUserItem> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roleCodes)) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)

    const updates: Record<string, unknown> = {}
    if (typeof payload.email === 'string') updates.email = payload.email
    if (typeof payload.fullName === 'string') updates.full_name = payload.fullName
    if (typeof payload.password === 'string') updates.password_hash = await hash(payload.password, 10)

    if (Object.keys(updates).length > 0) {
      const { error } = await this.supabaseService.client.from('users').update(updates).eq('id', adminId)
      if (error) {
        if (isUniqueViolation(error)) {
          throw new HttpException('Email already exists', HttpStatus.CONFLICT)
        }
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }
    }

    if (typeof payload.roleCode === 'string' && payload.roleCode.length > 0) {
      if (payload.roleCode === 'SUPER_ADMIN') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
      }

      const roleIds = await this.getRoleIdsByCodes([payload.roleCode])
      const roleId = roleIds[0]
      if (!roleId) throw new HttpException('Invalid role', HttpStatus.BAD_REQUEST)

      const adminRoleIds = await this.getRoleIdsByCodes(['ADMIN', 'SUPER_ADMIN'])
      if (adminRoleIds.length > 0) {
        const { error: deleteError } = await this.supabaseService.client
          .from('user_roles')
          .delete()
          .eq('user_id', adminId)
          .in('role_id', adminRoleIds)

        if (deleteError) throw new HttpException(deleteError.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }

      const { error: insertError } = await this.supabaseService.client.from('user_roles').insert({
        user_id: adminId,
        role_id: roleId,
      })
      if (insertError) throw new HttpException(insertError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const updated = await this.getAdminById(adminId)
    if (!updated) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    return updated
  }

  async updateAdminStatus(adminId: string, status: 'ACTIVE' | 'LOCKED'): Promise<AdminUserItem> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roleCodes)) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)

    const { error } = await this.supabaseService.client.from('users').update({ status }).eq('id', adminId)
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)

    const updated = await this.getAdminById(adminId)
    if (!updated) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    return updated
  }

  async softDeleteAdmin(adminId: string): Promise<void> {
    const existing = await this.getAdminById(adminId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    if (this.isSuperAdmin(existing.roleCodes)) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)

    const { error } = await this.supabaseService.client
      .from('users')
      .update({ status: 'DELETED' })
      .eq('id', adminId)

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

