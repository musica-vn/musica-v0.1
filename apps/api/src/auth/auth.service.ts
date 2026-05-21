import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthLoginDataDto, AuthLoginRequestDto } from './auth.dto';

type DbUserRow = {
  id: string;
  email: string;
  full_name: string;
  status: 'ACTIVE' | 'LOCKED' | 'DELETED';
  password_hash: string;
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
      throw new HttpException(userError.message, HttpStatus.INTERNAL_SERVER_ERROR);
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

    const { data: userRoles, error: rolesError } = await this.supabaseService.client
      .from('user_roles')
      .select('role:roles(code)')
      .eq('user_id', user.id);

    if (rolesError) {
      throw new HttpException(rolesError.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const roles = (userRoles ?? [])
      .map((x) => (typeof x === 'object' && x !== null ? (x as { role?: { code?: unknown } }).role : undefined))
      .map((r) => (r && typeof r.code === 'string' ? r.code : undefined))
      .filter((x): x is string => typeof x === 'string');

    if (roles.length === 0) {
      throw new HttpException('User has no roles', HttpStatus.FORBIDDEN);
    }

    const jwtSecret = this.configService.get<string>('JWT_SECRET') ?? 'dev-secret';
    const expiresInSeconds = 60 * 60 * 24 * 7;

    const accessToken = jwt.sign({ sub: user.id, roles }, jwtSecret, {
      expiresIn: expiresInSeconds,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        status: user.status,
      },
      roles,
    };
  }
}

