import type { AuthIdentity, AuthProvider } from '../../src/features/auth/auth-provider.js';
import { Email, UserId } from '../../src/features/user/user.js';
import { UnauthenticatedError } from '../../src/utils/errors.js';

const PREFIX = 'test-token:';

/**
 * Token the FakeAuthProvider accepts for this user (email defaults to `<id>@example.com`).
 * Pass `expiresAt` for a token that expires; by default it never does.
 */
export const tokenFor = (
  userId: string,
  email = `${userId}@example.com`,
  expiresAt?: Date,
): string => `${PREFIX}${userId}:${email}${expiresAt ? `:${expiresAt.getTime()}` : ''}`;

/** `Authorization` header for requests made as this user. */
export const authHeader = (userId: string, email?: string): Record<string, string> => ({
  Authorization: `Bearer ${tokenFor(userId, email)}`,
});

/** Accepts `test-token:<uuid>:<email>[:<expiry ms>]` tokens instead of real Supabase JWTs. */
export class FakeAuthProvider implements AuthProvider {
  async verify(token: string): Promise<AuthIdentity> {
    if (!token.startsWith(PREFIX)) throw new UnauthenticatedError('Invalid or expired session');
    const [id, email, expiry] = token.slice(PREFIX.length).split(':');
    try {
      return {
        userId: UserId.of(id),
        email: email ? Email.of(email) : null,
        expiresAt: expiry ? new Date(Number(expiry)) : null,
      };
    } catch {
      throw new UnauthenticatedError('Invalid or expired session');
    }
  }
}
