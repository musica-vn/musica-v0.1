import {
  CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, JwtPayload } from './auth.types';

const readBearerToken = (request: AuthenticatedRequest): string | null => {
  const raw = request.headers.authorization;
  if (typeof raw !== 'string') return null;
  const [type, token] = raw.split(' ');
  if (type !== 'Bearer' || typeof token !== 'string' || token.length === 0)
    return null;
  return token;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();

    const token = readBearerToken(request);
    if (!token) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    let jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      const nodeEnv =
        this.configService.get<string>('NODE_ENV') ??
        process.env.NODE_ENV ??
        'development';
      if (nodeEnv === 'development' || nodeEnv === 'test') {
        jwtSecret = 'dev-secret';
      } else {
        throw new HttpException(
          'Server misconfigured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      const userId = typeof decoded?.sub === 'string' ? decoded.sub : null;
      const roleId =
        typeof decoded?.roleId === 'number' ? decoded.roleId : null;
      const roleName =
        typeof decoded?.roleName === 'string' ? decoded.roleName : null;
      if (!userId || !roleId || !roleName)
        throw new Error('Invalid token payload');
      request.user = { userId, roleId, roleName };
      return true;
    } catch {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }
}
