import type { Request } from 'express';

export type AuthUserContext = {
  userId: string;
  roleId: number | null;
  roleName: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUserContext;
};

export type JwtPayload = {
  sub: string;
  roleId?: unknown;
  roleName?: unknown;
};
