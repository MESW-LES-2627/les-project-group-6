import { UnauthenticatedError } from '../../utils/errors.js';
import type { Email, UserId } from '../user/user.js';

/**
 * Who a valid session token belongs to, in our own types. Supabase claims never
 * leave the adapter (ADR-0002).
 */
export interface AuthIdentity {
  userId: UserId;
  email: Email | null;
  /** When the token stops being valid; null when it has no expiry. */
  expiresAt: Date | null;
}

/**
 * Port for the identity service. Verifies a bearer token and returns its identity,
 * or throws `UnauthenticatedError` when the token is invalid or expired.
 */
export interface AuthProvider {
  verify(token: string): Promise<AuthIdentity>;
}

/** Used when no identity service is configured: every request is rejected. */
export class DenyAllAuthProvider implements AuthProvider {
  async verify(): Promise<AuthIdentity> {
    throw new UnauthenticatedError('Authentication is not configured');
  }
}
