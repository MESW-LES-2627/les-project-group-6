import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { currentIdentity, currentUser } from '../../middleware/auth.js';
import type { User } from './user.js';
import type { UserService } from './user-service.js';

export interface MeDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  timezone: string;
  photoUrl: string | null;
  profileVisibility: string;
  createdAt: string;
}

export const toMeDto = (user: User): MeDto => ({
  id: user.id.value,
  email: user.email.value,
  username: user.username.value,
  displayName: user.displayName,
  timezone: user.timezone,
  photoUrl: user.photoUrl,
  profileVisibility: user.profileVisibility,
  createdAt: user.createdAt.toISOString(),
});

/**
 * The signed-in reader's own profile (F-AUTH-01). `POST /me` only needs a valid
 * token (the row does not exist yet); `GET`/`PATCH` need the row.
 */
export function meRoutes(
  users: UserService,
  authenticated: RequestHandler,
  withUser: RequestHandler,
): Router {
  const router = Router();

  // Public: the sign-up form checks the username before creating the account.
  // Limited per IP so the route cannot be used to list which usernames exist.
  const usernameChecks = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Too many username checks, try again in a minute',
      code: 'TOO_MANY_REQUESTS',
    },
  });
  router.get('/usernames/:username/availability', usernameChecks, async (req, res) => {
    res.status(200).json({ available: await users.isUsernameAvailable(req.params.username) });
  });

  router.post('/me', authenticated, async (req, res) => {
    const { username, displayName, timezone } = req.body ?? {};
    const user = await users.createProfile(currentIdentity(res), {
      username,
      displayName,
      timezone,
    });
    res.status(201).json(toMeDto(user));
  });

  router.get('/me', authenticated, withUser, (_req, res) => {
    res.status(200).json(toMeDto(currentUser(res)));
  });

  router.patch('/me', authenticated, withUser, async (req, res) => {
    const { displayName, timezone } = req.body ?? {};
    res
      .status(200)
      .json(toMeDto(await users.updateProfile(currentUser(res), { displayName, timezone })));
  });

  return router;
}
