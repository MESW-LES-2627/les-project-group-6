import type { User } from './user.js';
import type { UserId } from './user-id.js';
import type { Username } from './username.js';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  save(user: User): Promise<void>;
}
