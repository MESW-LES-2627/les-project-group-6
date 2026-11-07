import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
} from 'jose';
import { SupabaseAuthProvider } from '../../src/features/auth/supabase-auth-provider.js';
import { UnauthenticatedError } from '../../src/utils/errors.js';

const URL_ = 'https://project.supabase.co';
const ISSUER = `${URL_}/auth/v1`;
const SUB = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51';
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters';

describe('SupabaseAuthProvider', () => {
  let privateKey: CryptoKey;
  let otherKey: CryptoKey;
  let provider: SupabaseAuthProvider;

  before(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    otherKey = (await generateKeyPair('ES256')).privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'ES256' };
    provider = new SupabaseAuthProvider({
      url: `${URL_}/`,
      jwtSecret: SECRET,
      keys: createLocalJWKSet({ keys: [jwk] }),
    });
  });

  const sign = (
    claims: JWTPayload = { email: 'Ana@Example.com' },
    {
      issuer = ISSUER,
      audience = 'authenticated',
      expiresIn = '1h',
      sub = SUB,
      key = privateKey,
    } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key);

  test('a valid token maps to our identity', async () => {
    const identity = await provider.verify(await sign());
    assert.equal(identity.userId.value, SUB);
    assert.equal(identity.email?.value, 'ana@example.com');
    // Expiry comes from the `exp` claim (1h from now, to the second).
    const msLeft = identity.expiresAt!.getTime() - Date.now();
    assert.ok(msLeft > 3_590_000 && msLeft <= 3_600_000, `unexpected expiry in ${msLeft} ms`);
  });

  test('a token without a usable email still identifies the user', async () => {
    const identity = await provider.verify(await sign({ email: 'not-an-email' }));
    assert.equal(identity.userId.value, SUB);
    assert.equal(identity.email, null);
  });

  test('rejects a wrong issuer, wrong audience, expired token, bad signature or bad subject', async () => {
    const tokens = [
      await sign(undefined, { issuer: 'https://other.supabase.co/auth/v1' }),
      await sign(undefined, { audience: 'anon' }),
      await sign(undefined, { expiresIn: '-1m' }),
      await sign(undefined, { key: otherKey }),
      await sign(undefined, { sub: 'not-a-uuid' }),
    ];
    for (const token of tokens) {
      await assert.rejects(provider.verify(token), UnauthenticatedError);
    }
  });

  test('rejects garbage', async () => {
    for (const token of ['garbage', 'a.b.c', '']) {
      await assert.rejects(provider.verify(token), UnauthenticatedError);
    }
  });

  test('accepts HS256 tokens signed with the legacy jwtSecret', async () => {
    const token = await new SignJWT({ email: 'legacy@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(SUB)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));

    const identity = await provider.verify(token);
    assert.equal(identity.userId.value, SUB);
    assert.equal(identity.email?.value, 'legacy@example.com');
  });

  test('rejects HS256 tokens with the wrong secret or when no secret is configured', async () => {
    const hs256 = (secret: string) =>
      new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(SUB)
        .setIssuer(ISSUER)
        .setAudience('authenticated')
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(secret));

    await assert.rejects(
      provider.verify(await hs256('another-secret-with-at-least-32-characters!')),
      UnauthenticatedError,
    );

    const noSecret = new SupabaseAuthProvider({
      url: URL_,
      keys: createLocalJWKSet({ keys: [] }),
    });
    await assert.rejects(noSecret.verify(await hs256(SECRET)), UnauthenticatedError);
  });
});
