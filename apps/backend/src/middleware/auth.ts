import type { RequestHandler, Response } from 'express';
import type { AuthIdentity, AuthProvider } from '../features/auth/auth-provider.js';
import type { IUserRepository } from '../features/user/user-repository.js';
import type { User } from '../features/user/user.js';
import { ForbiddenError, UnauthenticatedError } from '../utils/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      identity?: AuthIdentity;
      user?: User;
    }
  }
}

/** The signed-in Supabase account has no `users` row yet (interrupted sign-up). */
export class ProfileRequiredError extends ForbiddenError {
  constructor() {
    super('Complete your profile to continue', 'PROFILE_REQUIRED');
  }
}

/** Reads `Authorization: Bearer <token>` and returns the raw token. */
export function bearerToken(header: string | undefined): string {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  if (!match?.[1]) throw new UnauthenticatedError();
  return match[1];
}

/** Verifies the token and stores the identity; no database access. */
export function authenticate(auth: AuthProvider): RequestHandler {
  return async (req, res, next) => {
    res.locals.identity = await auth.verify(bearerToken(req.headers.authorization));
    next();
  };
}

/** Loads our User for the verified identity; `403 PROFILE_REQUIRED` when there is none. */
export function requireUser(users: IUserRepository | undefined): RequestHandler {
  return async (_req, res, next) => {
    const identity = currentIdentity(res);
    const user = users ? await users.findById(identity.userId) : null;
    if (!user) throw new ProfileRequiredError();
    res.locals.user = user;
    next();
  };
}

export function currentIdentity(res: Response): AuthIdentity {
  if (!res.locals.identity) throw new UnauthenticatedError();
  return res.locals.identity;
}

/** The signed-in reader. Only valid on routes behind `requireUser`. */
export function currentUser(res: Response): User {
  if (!res.locals.user) throw new ProfileRequiredError();
  return res.locals.user;
}

/** The signed-in reader's id as a string, the shape the services accept. */
export const currentUserId = (res: Response): string => currentUser(res).id.value;
