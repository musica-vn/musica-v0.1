import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SupabaseService } from '../../database/supabase.service';
import { AuthLoginDataDto, AuthLoginRequestDto } from './auth.dto';

type DbUserRow = {
  id: string;
  email: string;
  full_name: string;
  status: 'ACTIVE' | 'LOCKED' | 'DELETED';
  password_hash: string;
};

type DbUserRoleRow = {
  role_id: number;
  role?: {
    id?: unknown;
    name?: unknown;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: AuthLoginRequestDto): Promise<AuthLoginDataDto> {
    const { data: user, error: userError } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status,password_hash')
      .eq('email', payload.email)
      .maybeSingle<DbUserRow>();

    if (userError) {
      throw new HttpException(
        userError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException('User is not active', HttpStatus.FORBIDDEN);
    }

    const isPasswordValid = await compare(payload.password, user.password_hash);

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const { data: userRoles, error: rolesError } =
      await this.supabaseService.client
        .from('user_roles')
        .select('role_id,role:roles(id,name)')
        .eq('user_id', user.id)
        .returns<DbUserRoleRow[]>();

    if (rolesError) {
      throw new HttpException(
        rolesError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const roles = (userRoles ?? [])
      .map((row) => {
        const roleId = typeof row.role_id === 'number' ? row.role_id : null;
        const roleName =
          row.role && typeof row.role.name === 'string' ? row.role.name : null;

        if (!roleId || !roleName) return null;
        return { roleId, roleName };
      })
      .filter(
        (
          value,
        ): value is {
          roleId: number;
          roleName: string;
        } => value !== null,
      );

    if (roles.length === 0) {
      throw new HttpException('User has no roles', HttpStatus.FORBIDDEN);
    }

    const primaryRole = roles[0];

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ?? 'dev-secret';
    const expiresInSeconds = 60 * 60 * 24 * 7;

    const accessToken = jwt.sign(
      {
        sub: user.id,
        roleId: primaryRole.roleId,
        roleName: primaryRole.roleName,
      },
      jwtSecret,
      {
      expiresIn: expiresInSeconds,
      },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        status: user.status,
        roleId: primaryRole.roleId,
        roleName: primaryRole.roleName,
      },
    };
  }
}
