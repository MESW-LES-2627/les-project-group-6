import crypto from 'node:crypto';
import { InvalidValueError } from '../../utils/errors.js';
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
  profileDescription: string | null;
  timezone: string;
  profileVisibility: ProfileVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: UserId;
  readonly email: Email;
  readonly username: Username;
  private _displayName: string;
  readonly photoUrl: string | null;
  readonly profileDescription: string | null;
  readonly timezone: string;
  private _profileVisibility: ProfileVisibility;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(state: UserState) {
    this.id = state.id;
    this.email = state.email;
    this.username = state.username;
    this._displayName = state.displayName;
    this.photoUrl = state.photoUrl;
    this.profileDescription = state.profileDescription;
    this.timezone = state.timezone;
    this._profileVisibility = state.profileVisibility;
    this.createdAt = state.createdAt;
    this._updatedAt = state.updatedAt;
  }

  /** A new reader joins with a private profile. Streaks are computed from sessions. */
  static register(props: NewUserProps): User {
    const now = new Date();
    return new User({
      id: props.id,
      email: props.email,
      username: props.username,
      displayName: User.validDisplayName(props.displayName),
      photoUrl: null,
      profileDescription: null,
      timezone: props.timezone ?? 'Europe/Lisbon',
      profileVisibility: 'private',
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Rebuilds a user that already exists (used by the repository). */
  static reconstitute(state: UserState): User {
    return new User(state);
  }

  get displayName(): string {
    return this._displayName;
  }

  get profileVisibility(): ProfileVisibility {
    return this._profileVisibility;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(displayName: string): void {
    this._displayName = User.validDisplayName(displayName);
    this.touch();
  }

  makeProfilePublic(): void {
    this._profileVisibility = 'public';
    this.touch();
  }

  makeProfilePrivate(): void {
    this._profileVisibility = 'private';
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static validDisplayName(raw: string): string {
    const name = raw.trim();
    if (name === '' || name.length > 255) {
      throw new InvalidValueError('Display name must have between 1 and 255 characters');
    }
    return name;
  }
}
