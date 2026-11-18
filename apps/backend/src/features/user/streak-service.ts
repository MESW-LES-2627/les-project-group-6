import type { Clock } from '../../utils/clock.js';
import { DAY_MS, isoDayInTimezone, previousIsoDay } from '../../utils/calendar.js';
import { NotFoundError } from '../../utils/errors.js';
import { sessionCountsForStreak } from './streak-rules.js';
import { UserId, type User } from './user.js';
import type { IUserRepository } from './user-repository.js';

export interface StreakRoadmapResult {
  updated: boolean;
  user: User;
}

export interface StreakStatusDto {
  currentStreak: number;
  longestStreak: number;
  /** Today already counts for the streak. */
  readToday: boolean;
  lastReadDate: string | null;
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

const asUserId = (userId: UserId | string): UserId =>
  typeof userId === 'string' ? UserId.of(userId) : userId;

// Application service for the daily reading streak (F-READ-04). The streak lives on the
// user as `currentStreak`, `longestStreak` and `lastReadDate`; callers decide what counts
// as reading (see streak-rules.ts) and then call `recordReadToday`.
export class StreakService {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions?: IStreakSessionReader,
    private readonly now: Clock = () => new Date(),
  ) {}

  /** Counts today, in the reader's timezone, as a reading day and saves the streak if it changed. */
  async recordReadToday(
    userId: UserId | string,
    referenceDate?: Date,
  ): Promise<StreakRoadmapResult> {
    const user = await this.findUser(asUserId(userId));
    const today = isoDayInTimezone(referenceDate ?? this.now(), user.timezone);

    const updated = user.recordReadingDay(today);
    if (updated) await this.users.save(user);
    return { updated, user };
  }

  /** The live streak: 0 once a whole day has passed without reading. */
  async calculateStreakStatus(
    userId: UserId | string,
    referenceDate?: Date,
  ): Promise<StreakStatusDto> {
    const user = await this.findUser(asUserId(userId));
    return StreakService.statusOf(user, referenceDate ?? this.now());
  }

  /** The live streak of a user already loaded, without another lookup. */
  static statusOf(user: User, at: Date): StreakStatusDto {
    const snapshot = user.streakOn(isoDayInTimezone(at, user.timezone));
    return {
      currentStreak: snapshot.currentStreak,
      longestStreak: snapshot.longestStreak,
      readToday: snapshot.readToday,
      lastReadDate: user.lastReadDate,
      streakType: user.streakType,
    };
  }

  /**
   * The last `daysCount` days (oldest first) for StreakCalendar.vue. A day is read when it
   * had a session of 5+ minutes or belongs to the current run of the streak, which also
   * covers days counted from page progress or finishing a book.
   */
  async getStreakCalendar(
    userId: UserId | string,
    daysCount = 28,
    referenceDate?: Date,
  ): Promise<StreakDayDto[]> {
    const user = await this.findUser(asUserId(userId));
    const currentTime = referenceDate ?? this.now();
    const today = isoDayInTimezone(currentTime, user.timezone);

    const dates: string[] = [];
    for (let day = today, i = 0; i < daysCount; i++, day = previousIsoDay(day)) {
      dates.unshift(day);
    }

    const readDates = new Set<string>();
    if (this.sessions) {
      // One extra day on each side absorbs the reader's UTC offset.
      const since = new Date(currentTime.getTime() - (daysCount + 1) * DAY_MS);
      for (const session of await this.sessions.findCompletedSessions(user.id, since)) {
        if (sessionCountsForStreak(session.countedMinutes)) {
          readDates.add(isoDayInTimezone(session.endedAt, user.timezone));
        }
      }
    }
    // The current run: `currentStreak` consecutive days ending on `lastReadDate`.
    for (
      let day = user.lastReadDate, i = 0;
      day !== null && i < Math.min(user.currentStreak, daysCount);
      i++, day = previousIsoDay(day)
    ) {
      readDates.add(day);
    }

    return dates.map((date) => ({ date, read: readDates.has(date) }));
  }

  private async findUser(id: UserId): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }
}
