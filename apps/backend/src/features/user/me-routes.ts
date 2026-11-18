import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { currentIdentity, currentUser, currentUserId } from '../../middleware/auth.js';
import { StreakService } from './streak-service.js';
import type { User } from './user.js';
import type { UserService } from './user-service.js';

export interface MeDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  timezone: string;
  photoUrl: string | null;
  profileVisibility: string;
  createdAt: string;
  streakType: string;
  /** Live streak: 0 once a whole day was missed (F-READ-04). */
  currentStreak: number;
  longestStreak: number;
  /** Today already counts for the streak. */
  readToday: boolean;
}

export const toMeDto = (user: User, at: Date = new Date()): MeDto => {
  const streak = StreakService.statusOf(user, at);
  return {
    id: user.id.value,
    email: user.email.value,
    username: user.username.value,
    displayName: user.displayName,
    bio: user.bio,
    timezone: user.timezone,
    photoUrl: user.photoUrl,
    profileVisibility: user.profileVisibility,
    createdAt: user.createdAt.toISOString(),
    streakType: user.streakType,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    readToday: streak.readToday,
  };
};

/**
 * The signed-in reader's own profile (F-AUTH-01). `POST /me` only needs a valid
 * token (the row does not exist yet); `GET`/`PATCH` need the row.
 */
export function meRoutes(
  users: UserService,
  authenticated: RequestHandler,
  withUser: RequestHandler,
  streaks?: StreakService,
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

  router.get('/me', authenticated, withUser, async (_req, res) => {
    res.status(200).json(toMeDto(currentUser(res)));
  });

  router.get('/me/streak', authenticated, withUser, async (_req, res) => {
    const user = currentUser(res);
    const status = StreakService.statusOf(user, new Date());
    const days = streaks ? await streaks.getStreakCalendar(user.id) : [];
    res.status(200).json({
      current: status.currentStreak,
      longest: status.longestStreak,
      readToday: status.readToday,
      lastReadDate: status.lastReadDate,
      streakType: status.streakType,
      freezesLeft: 0,
      days,
    });
  });

  router.patch('/me', authenticated, withUser, async (req, res) => {
    const { displayName, timezone } = req.body ?? {};
    const updated = await users.updateProfile(currentUser(res), { displayName, timezone });
    res.status(200).json(toMeDto(updated));
  });

  router.get('/users', authenticated, withUser, async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await users.searchUsers(query);
    res.status(200).json(results);
  });

  router.get('/users/:username', authenticated, withUser, async (req, res) => {
    const profile = await users.getProfileByUsername(req.params.username, currentUserId(res));
    res.status(200).json(profile);
  });

  return router;
}
