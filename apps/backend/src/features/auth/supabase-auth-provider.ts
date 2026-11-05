import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { UnauthenticatedError } from '../../utils/errors.js';
import { Email, UserId } from '../user/user.js';
import type { AuthIdentity, AuthProvider } from './auth-provider.js';

export interface SupabaseAuthOptions {
  /** The project URL, e.g. https://abcd.supabase.co */
  url: string;
  /** Legacy shared secret, only for projects that still sign tokens with HS256. */
  jwtSecret?: string;
  /** Overrides the remote key set (tests). */
  keys?: JWTVerifyGetKey;
}

// Adapter (ADR-0002): verifies Supabase access tokens with the project's JWKS and
// maps the claims to our AuthIdentity. Nothing Supabase-shaped leaves this class.
export class SupabaseAuthProvider implements AuthProvider {
  private readonly issuer: string;
  private readonly keys: JWTVerifyGetKey;
  private readonly secret: Uint8Array | null;

  constructor({ url, jwtSecret, keys }: SupabaseAuthOptions) {
    this.issuer = `${url.replace(/\/+$/, '')}/auth/v1`;
    this.keys = keys ?? createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    this.secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  }

  async verify(token: string): Promise<AuthIdentity> {
    const payload = await this.verifiedPayload(token);
    let userId: UserId;
    try {
      userId = UserId.of(payload.sub);
    } catch {
      throw new UnauthenticatedError('Invalid session');
    }
    let email: Email | null = null;
    try {
      email = payload.email ? Email.of(payload.email) : null;
    } catch {
      email = null;
    }
    return { userId, email };
  }

  private async verifiedPayload(token: string): Promise<JWTPayload & { email?: unknown }> {
    const options = { issuer: this.issuer, audience: 'authenticated' };
    try {
      const { alg } = decodeProtectedHeader(token);
      const { payload } =
        alg === 'HS256' && this.secret
          ? await jwtVerify(token, this.secret, options)
          : await jwtVerify(token, this.keys, options);
      return payload;
    } catch (error) {
      // A JWKS outage is our problem, not the user's: let it surface as a 500.
      if (error instanceof errors.JWKSTimeout) throw error;
      if (error instanceof errors.JOSEError || error instanceof TypeError) {
        throw new UnauthenticatedError('Invalid or expired session');
      }
      throw error;
    }
  }
}
