import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import { isoDayInTimezone, previousIsoDay } from '../../utils/calendar.js';
import { UserId, type User } from './user.js';
import type { IUserRepository } from './user-repository.js';

export interface StreakRoadmapResult {
  updated: boolean;
  user: User;
}

export interface StreakStatusDto {
  currentStreak: number;
  longestStreak: number;
  hitStreak: boolean;
  streakType: string;
}

export interface StreakDayDto {
  date: string;
  read: boolean;
}

export interface IStreakSessionReader {
  findCompletedSessions(
    userId: UserId,
    since?: Date,
  ): Promise<{ endedAt: Date; countedMinutes: number }[]>;
}

export class StreakService {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions?: IStreakSessionReader,
    private readonly now: Clock = () => new Date(),
  ) {}

  /**
   * Evaluates and updates the streak when a user reads today, following the roadmap:
   * 1. Check if hitStreak is true
   *    - If it is, then the streak doesn't need update
   *    - If it is not, continue to 2
   * 2. Check if he read the day before
   *    - If not, set the hit streak and current streak to 1
   *    - If yes, then update hit streak and increment on the current streak
   *
   * PS: When incrementing currentStreak, checks against longestStreak to see if it needs updating.
   */
  async recordReadToday(
    userId: UserId | string,
    options?: { readDayBefore?: boolean; referenceDate?: Date },
  ): Promise<StreakRoadmapResult> {
    const id = typeof userId === 'string' ? UserId.of(userId) : userId;
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');

    const currentTime = options?.referenceDate ?? this.now();
    const todayStr = isoDayInTimezone(currentTime, user.timezone);
    const yesterdayStr = previousIsoDay(todayStr);

    let alreadyHitToday = user.hitStreak;
    let readDayBefore = options?.readDayBefore;

    if (this.sessions) {
      // Look back 3 days to safely capture sessions across timezone boundaries
      const windowStart = new Date(currentTime.getTime() - 3 * 24 * 60 * 60 * 1000);
      const recentSessions = await this.sessions.findCompletedSessions(user.id, windowStart);
      const datesRead = new Set(
        recentSessions.map((s) => isoDayInTimezone(s.endedAt, user.timezone)),
      );

      // Check if user already completed a session today in their timezone
      alreadyHitToday = alreadyHitToday || datesRead.has(todayStr);

      if (readDayBefore === undefined) {
        readDayBefore = datesRead.has(yesterdayStr);
      }
    }

    // 1. Check if hitStreak is true
    if (alreadyHitToday) {
      return { updated: false, user };
    }

    // 2. Check if he read the day before
    const didReadDayBefore = Boolean(readDayBefore);

    // Domain update (increments or resets to 1, sets hitStreak, and updates longestStreak)
    user.recordReadingDay(didReadDayBefore);

    // Database update
    await this.users.save(user);

    return { updated: true, user };
  }

  /**
   * Calculates the current live streak status for a user.
   * If today has not been read yet, checks if yesterday was read to determine if the streak is still alive.
   */
  async calculateStreakStatus(
    userId: UserId | string,
    referenceDate?: Date,
  ): Promise<StreakStatusDto> {
    const id = typeof userId === 'string' ? UserId.of(userId) : userId;
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');

    const currentTime = referenceDate ?? this.now();
    const todayStr = isoDayInTimezone(currentTime, user.timezone);
    const yesterdayStr = previousIsoDay(todayStr);

    let hitToday = user.hitStreak;
    let readYesterday = false;

    if (this.sessions) {
      const windowStart = new Date(currentTime.getTime() - 3 * 24 * 60 * 60 * 1000);
      const recentSessions = await this.sessions.findCompletedSessions(user.id, windowStart);
      const datesRead = new Set(
        recentSessions.map((s) => isoDayInTimezone(s.endedAt, user.timezone)),
      );

      hitToday = hitToday || datesRead.has(todayStr);
      readYesterday = datesRead.has(yesterdayStr);
    } else {
      readYesterday = user.currentStreak > 0;
    }

    let activeStreak = user.currentStreak;
    if (!hitToday && !readYesterday) {
      // Both today and yesterday were missed: streak has lapsed
      activeStreak = 0;
    }

    return {
      currentStreak: activeStreak,
      longestStreak: user.longestStreak,
      hitStreak: hitToday,
      streakType: user.streakType,
    };
  }

  /**
   * Calculates the 28-day reading activity calendar grid for StreakCalendar.vue.
   */
  async getStreakCalendar(
    userId: UserId | string,
    daysCount = 28,
    referenceDate?: Date,
  ): Promise<StreakDayDto[]> {
    const id = typeof userId === 'string' ? UserId.of(userId) : userId;
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');

    const currentTime = referenceDate ?? this.now();
    const todayStr = isoDayInTimezone(currentTime, user.timezone);

    // Collect all dates from (today - (daysCount - 1)) to today
    const dates: string[] = [];
    let curr = todayStr;
    for (let i = 0; i < daysCount; i++) {
      dates.unshift(curr);
      curr = previousIsoDay(curr);
    }

    let readDates = new Set<string>();
    if (this.sessions) {
      const windowStart = new Date(currentTime.getTime() - (daysCount + 3) * 24 * 60 * 60 * 1000);
      const completedSessions = await this.sessions.findCompletedSessions(user.id, windowStart);
      readDates = new Set(completedSessions.map((s) => isoDayInTimezone(s.endedAt, user.timezone)));
    }
    if (user.hitStreak) {
      readDates.add(todayStr);
    }

    return dates.map((date) => ({
      date,
      read: readDates.has(date),
    }));
  }
}
