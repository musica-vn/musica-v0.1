import type { Request } from 'express';

export type RequestUser = {
  userId: string;
  roleId: number | null;
  roleName: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
};
