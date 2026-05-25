import type { Request } from 'express';

export type RequestUser = {
  userId: string;
  roles: string[];
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
};
