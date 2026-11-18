import crypto from 'node:crypto';
import { parseIsoDay, previousIsoDay } from '../../utils/calendar.js';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';

export class UserId extends Uuid {
  declare private readonly brand: 'UserId';

  static of(raw: unknown): UserId {
    return new UserId(Uuid.parse(raw, 'user id'));
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }
}

export class InvalidEmailError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Invalid email: ${String(raw)}`);
  }
}

export class Email {
  private constructor(readonly value: string) {}

  static of(raw: unknown): Email {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class InvalidUsernameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Username must be 3-50 letters, digits, '_' or '.', got ${String(raw)}`);
  }
}

export class Username {
  private constructor(readonly value: string) {}

  static of(raw: unknown): Username {
    if (typeof raw !== 'string' || !/^[A-Za-z0-9_.]{3,50}$/.test(raw)) {
      throw new InvalidUsernameError(raw);
    }
    return new Username(raw);
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}

/** Usernames are unique ignoring case (`Ana_Reads` and `ana_reads` are the same). */
export class UsernameTakenError extends BusinessRuleViolationError {
  constructor() {
    super('This username is already taken', 'USERNAME_TAKEN');
  }
}

export const DEFAULT_TIMEZONE = 'Europe/Lisbon';

/** An IANA time zone name such as `Europe/Lisbon`, as reported by the browser. */
export function validTimezone(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '' || raw.length > 100) {
    throw new InvalidValueError(`Invalid timezone: ${String(raw)}`);
  }
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: raw.trim() }).resolvedOptions().timeZone;
  } catch {
    throw new InvalidValueError(`Invalid timezone: ${raw}`);
  }
}

export type ProfileVisibility = 'private' | 'public';

export interface NewUserProps {
  // The identity is issued by Supabase Auth, so registration receives it.
  id: UserId;
  email: Email;
  username: Username;
  displayName: string;
  timezone?: string;
}

export interface UserState {
  id: UserId;
  email: Email;
  username: Username;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  timezone: string;
  profileVisibility: ProfileVisibility;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  /** Last calendar day (`YYYY-MM-DD`, in the reader's timezone) that counted for the streak. */
  lastReadDate: string | null;
  createdAt: Date;
}

/** The streak as seen on a given day: a streak is alive while the reader read today or yesterday. */
export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  readToday: boolean;
}

export class User {
  readonly id: UserId;
  readonly email: Email;
  readonly username: Username;
  private _displayName: string;
  readonly photoUrl: string | null;
  readonly bio: string | null;
  private _timezone: string;
  private _profileVisibility: ProfileVisibility;
  private _streakType: string;
  private _currentStreak: number;
  private _longestStreak: number;
  private _lastReadDate: string | null;
  readonly createdAt: Date;

  private constructor(state: UserState) {
    this.id = state.id;
    this.email = state.email;
    this.username = state.username;
    this._displayName = state.displayName;
    this.photoUrl = state.photoUrl;
    this.bio = state.bio;
    this._timezone = state.timezone;
    this._profileVisibility = state.profileVisibility;
    this._streakType = state.streakType;
    this._currentStreak = state.currentStreak;
    this._longestStreak = state.longestStreak;
    this._lastReadDate = state.lastReadDate;
    this.createdAt = state.createdAt;
  }

  /** A new reader joins: private profile and no streak yet. */
  static register(props: NewUserProps): User {
    return new User({
      id: props.id,
      email: props.email,
      username: props.username,
      displayName: User.validDisplayName(props.displayName),
      photoUrl: null,
      bio: null,
      timezone: props.timezone === undefined ? DEFAULT_TIMEZONE : validTimezone(props.timezone),
      profileVisibility: 'private',
      streakType: 'daily',
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      createdAt: new Date(),
    });
  }

  /** Rebuilds a user that already exists (used by the repository). */
  static reconstitute(state: UserState): User {
    return new User(state);
  }

  get displayName(): string {
    return this._displayName;
  }

  get timezone(): string {
    return this._timezone;
  }

  get profileVisibility(): ProfileVisibility {
    return this._profileVisibility;
  }

  get streakType(): string {
    return this._streakType;
  }

  get currentStreak(): number {
    return this._currentStreak;
  }

  get longestStreak(): number {
    return this._longestStreak;
  }

  get lastReadDate(): string | null {
    return this._lastReadDate;
  }

  rename(displayName: string): void {
    this._displayName = User.validDisplayName(displayName);
  }

  moveTo(timezone: string): void {
    this._timezone = validTimezone(timezone);
  }

  makeProfilePublic(): void {
    this._profileVisibility = 'public';
  }

  makeProfilePrivate(): void {
    this._profileVisibility = 'private';
  }

  /**
   * Counts `today` (`YYYY-MM-DD` in the reader's timezone) as a reading day (F-READ-04):
   * - already counted today: nothing changes;
   * - last counted yesterday: the streak grows by one;
   * - otherwise (first read, or a day was missed): the streak restarts at 1.
   * The longest streak keeps its best value. Returns whether anything changed.
   */
  recordReadingDay(today: string): boolean {
    if (!parseIsoDay(today)) throw new InvalidValueError(`Invalid reading day: ${today}`);
    if (this._lastReadDate === today) return false;

    this._currentStreak =
      this._lastReadDate === previousIsoDay(today) ? this._currentStreak + 1 : 1;
    this._longestStreak = Math.max(this._longestStreak, this._currentStreak);
    this._lastReadDate = today;
    return true;
  }

  /**
   * The streak as it stands on `today`: the stored streak is still alive when the last
   * reading day is today or yesterday, and is 0 once a whole day has been missed.
   */
  streakOn(today: string): StreakSnapshot {
    const readToday = this._lastReadDate === today;
    const alive = readToday || this._lastReadDate === previousIsoDay(today);
    return {
      currentStreak: alive ? this._currentStreak : 0,
      longestStreak: this._longestStreak,
      readToday,
    };
  }

  private static validDisplayName(raw: string): string {
    const name = raw.trim();
    if (name === '' || name.length > 255) {
      throw new InvalidValueError('Display name must have between 1 and 255 characters');
    }
    return name;
  }
}
