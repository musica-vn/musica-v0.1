import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { SupabaseService } from '../supabase/supabase.service'
import type { CreateManagedUserRequestDto, ManagedUserListQueryDto, UpdateManagedUserRequestDto } from './managed-users.dto'

type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'

type DbRoleRow = { id: number; name: string }

type DbUserRoleRow = {
  role_id: number
  role?: { id?: unknown; name?: unknown } | null
}

type DbManagedUserRow = {
  id: string
  email: string
  full_name: string
  status: UserStatus
  created_at: string
  user_roles: DbUserRoleRow[]
}

export type ManagedUserItem = {
  id: string
  email: string
  fullName: string
  status: UserStatus
  roles: Array<{ roleId: number; roleName: string }>
  createdAt: string
}

const normalizeRoles = (
  userRoles: DbUserRoleRow[],
): Array<{ roleId: number; roleName: string }> =>
  (userRoles ?? [])
    .map((x) => {
      const roleId = typeof x.role_id === 'number' ? x.role_id : null
      const roleName =
        x?.role && typeof x.role.name === 'string' ? x.role.name : null
      if (!roleId || !roleName) return null
      return { roleId, roleName }
    })
    .filter(
      (
        value,
      ): value is {
        roleId: number
        roleName: string
      } => value !== null,
    )

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  return (error as any).code === '23505'
}

@Injectable()
export class ManagedUsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private resolveCreatedAtAscending(sort: unknown): boolean {
    if (typeof sort !== 'string') return true
    const normalized = sort.trim().toLowerCase()
    if (normalized === 'createdat:desc' || normalized === 'created_at:desc') return false
    if (normalized === 'createdat:asc' || normalized === 'created_at:asc') return true
    return true
  }

  private async getRolesByNames(names: string[]): Promise<DbRoleRow[]> {
    const { data, error } = await this.supabaseService.client
      .from('roles')
      .select('id,name')
      .in('name', names)
      .returns<DbRoleRow[]>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
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
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return data ?? null
  }

  private buildManagedUserItem(row: DbManagedUserRow): ManagedUserItem {
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      status: row.status,
      roles: normalizeRoles(row.user_roles),
      createdAt: row.created_at,
    }
  }

  private async getManagedScopeRoleIds(): Promise<number[]> {
    return (await this.getRolesByNames(['Buyer', 'Artist'])).map((role) => role.id)
  }

  private async getManagedUserById(userId: string): Promise<ManagedUserItem | null> {
    const scopeRoleIds = await this.getManagedScopeRoleIds()
    if (scopeRoleIds.length === 0) return null

    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,created_at,user_roles!inner(role_id,role:roles(id,name))')
      .eq('id', userId)
      .in('user_roles.role_id', scopeRoleIds)
      .maybeSingle<DbManagedUserRow>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    if (!data) return null
    return this.buildManagedUserItem(data)
  }

  async listUsers(query: ManagedUserListQueryDto): Promise<{ items: ManagedUserItem[]; totalItems: number }> {
    const roleIds =
      typeof query.roleName === 'string'
        ? (await this.getRolesByNames([query.roleName])).map((role) => role.id)
        : await this.getManagedScopeRoleIds()
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
      .order('created_at', { ascending: this.resolveCreatedAtAscending(query.sort) })
      .range(from, to)
      .returns<DbManagedUserRow[]>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const items = (data ?? []).map((x) => this.buildManagedUserItem(x))
    return { items, totalItems: typeof count === 'number' ? count : items.length }
  }

  async createUser(payload: CreateManagedUserRequestDto): Promise<ManagedUserItem> {
    const role = (await this.getRolesByNames([payload.roleName]))[0] ?? null
    if (!role || !['Buyer', 'Artist'].includes(role.name)) {
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
      .returns<Array<Omit<DbManagedUserRow, 'user_roles'>>>()

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
      role_id: role.id,
    })

    if (insertRoleError) {
      throw new HttpException(insertRoleError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const user = await this.getManagedUserById(inserted.id)
    if (!user) {
      throw new HttpException('Failed to load created user', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return user
  }

  async updateUser(userId: string, payload: UpdateManagedUserRequestDto): Promise<ManagedUserItem> {
    const existing = await this.getManagedUserById(userId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)

    const updates: Record<string, unknown> = {}
    if (typeof payload.email === 'string') updates.email = payload.email
    if (typeof payload.fullName === 'string') updates.full_name = payload.fullName
    if (typeof payload.password === 'string') updates.password_hash = await hash(payload.password, 10)

    if (Object.keys(updates).length > 0) {
      const { error } = await this.supabaseService.client.from('users').update(updates).eq('id', userId)
      if (error) {
        if (isUniqueViolation(error)) {
          throw new HttpException('Email already exists', HttpStatus.CONFLICT)
        }
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }
    }

    const updated = await this.getManagedUserById(userId)
    if (!updated) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    return updated
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'LOCKED'): Promise<ManagedUserItem> {
    const existing = await this.getManagedUserById(userId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)

    const { error } = await this.supabaseService.client.from('users').update({ status }).eq('id', userId)
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)

    const updated = await this.getManagedUserById(userId)
    if (!updated) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    return updated
  }

  async softDeleteUser(userId: string): Promise<void> {
    const existing = await this.getManagedUserById(userId)
    if (!existing) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)

    const { error } = await this.supabaseService.client.from('users').update({ status: 'DELETED' }).eq('id', userId)
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
