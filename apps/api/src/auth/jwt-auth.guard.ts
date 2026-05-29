import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, RequestUser } from './auth.types';

type JwtPayload = {
  sub?: unknown;
  roleId?: unknown;
  roleName?: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers.authorization;

    if (typeof authorizationHeader !== 'string') {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const [type, token] = authorizationHeader.split(' ');

    if (type !== 'Bearer' || typeof token !== 'string' || token.length === 0) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ?? 'dev-secret';

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const userId = typeof decoded.sub === 'string' ? decoded.sub : undefined;
    const roleId = typeof decoded.roleId === 'number' ? decoded.roleId : null;
    const roleName =
      typeof decoded.roleName === 'string' ? decoded.roleName : null;

    if (!userId || !roleId || !roleName) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const user: RequestUser = { userId, roleId, roleName };
    request.user = user;

    return true;
  }
}
