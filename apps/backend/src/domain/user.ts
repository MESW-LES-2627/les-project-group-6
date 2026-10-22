export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface UserProps {
  id: string;
  email: string;
  username: string;
  displayName: string;
  photoUrl?: string | null;
  bio?: string | null;
  timezone?: string;
  profileVisibility?: 'private' | 'public';
  streakType?: string;
  currentStreak?: number;
  longestStreak?: number;
  hitStreak?: boolean;
  createdAt?: Date;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly displayName: string;
  readonly photoUrl: string | null;
  readonly bio: string | null;
  readonly timezone: string;
  readonly profileVisibility: 'private' | 'public';
  readonly streakType: string;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly hitStreak: boolean;
  readonly createdAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.username = props.username;
    this.displayName = props.displayName;
    this.photoUrl = props.photoUrl ?? null;
    this.bio = props.bio ?? null;
    this.timezone = props.timezone ?? 'Europe/Lisbon';
    this.profileVisibility = props.profileVisibility ?? 'private';
    this.streakType = props.streakType ?? 'daily';
    this.currentStreak = props.currentStreak ?? 0;
    this.longestStreak = props.longestStreak ?? 0;
    this.hitStreak = props.hitStreak ?? false;
    this.createdAt = props.createdAt ?? new Date();
  }
}
