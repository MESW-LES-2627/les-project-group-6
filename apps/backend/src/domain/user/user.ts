import { InvalidValueError } from '../shared/domain-error.js';
import type { Email } from './email.js';
import type { UserId } from './user-id.js';
import type { Username } from './username.js';

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
  hitStreak: boolean;
  createdAt: Date;
}

export class User {
  readonly id: UserId;
  readonly email: Email;
  readonly username: Username;
  private _displayName: string;
  readonly photoUrl: string | null;
  readonly bio: string | null;
  readonly timezone: string;
  private _profileVisibility: ProfileVisibility;
  readonly streakType: string;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly hitStreak: boolean;
  readonly createdAt: Date;

  private constructor(state: UserState) {
    this.id = state.id;
    this.email = state.email;
    this.username = state.username;
    this._displayName = state.displayName;
    this.photoUrl = state.photoUrl;
    this.bio = state.bio;
    this.timezone = state.timezone;
    this._profileVisibility = state.profileVisibility;
    this.streakType = state.streakType;
    this.currentStreak = state.currentStreak;
    this.longestStreak = state.longestStreak;
    this.hitStreak = state.hitStreak;
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
      timezone: props.timezone ?? 'Europe/Lisbon',
      profileVisibility: 'private',
      streakType: 'daily',
      currentStreak: 0,
      longestStreak: 0,
      hitStreak: false,
      createdAt: new Date(),
    });
  }

  /** Rebuilds a user that already exists (used by the persistence mapper). */
  static reconstitute(state: UserState): User {
    return new User(state);
  }

  get displayName(): string {
    return this._displayName;
  }

  get profileVisibility(): ProfileVisibility {
    return this._profileVisibility;
  }

  rename(displayName: string): void {
    this._displayName = User.validDisplayName(displayName);
  }

  makeProfilePublic(): void {
    this._profileVisibility = 'public';
  }

  makeProfilePrivate(): void {
    this._profileVisibility = 'private';
  }

  private static validDisplayName(raw: string): string {
    const name = raw.trim();
    if (name === '' || name.length > 255) {
      throw new InvalidValueError('Display name must have between 1 and 255 characters');
    }
    return name;
  }
}
