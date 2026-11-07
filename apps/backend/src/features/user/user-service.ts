import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import type { AuthIdentity } from '../auth/auth-provider.js';
import type { IUserRepository } from './user-repository.js';
import { User, Username, UsernameTakenError } from './user.js';

export interface CreateProfileInput {
  username: unknown;
  displayName: unknown;
  timezone?: unknown;
}

export interface UpdateProfileInput {
  displayName?: unknown;
  timezone?: unknown;
}

const asText = (raw: unknown, field: string): string => {
  if (typeof raw !== 'string') throw new InvalidValueError(`${field} is required`);
  return raw;
};

// Application service for the signed-in reader's own profile (F-AUTH-01). The
// identity (id, email) comes from the verified token, everything else from the body.
export class UserService {
  constructor(private readonly users: IUserRepository) {}

  /** Creates the `users` row the first time a Supabase account is used. */
  async createProfile(identity: AuthIdentity, input: CreateProfileInput): Promise<User> {
    if (!identity.email) {
      throw new InvalidValueError('Your account has no email address');
    }
    if (await this.users.findById(identity.userId)) {
      throw new BusinessRuleViolationError('Your profile already exists');
    }
    const username = Username.of(asText(input.username, 'Username').trim().replace(/^@/, ''));
    if (await this.users.findByUsername(username)) throw new UsernameTakenError();

    const user = User.register({
      id: identity.userId,
      email: identity.email,
      username,
      displayName: asText(input.displayName, 'Display name'),
      timezone: input.timezone === undefined ? undefined : asText(input.timezone, 'Timezone'),
    });
    // Insert-only: a concurrent request for the same account or username fails with 409.
    await this.users.add(user);
    return user;
  }

  async updateProfile(user: User, input: UpdateProfileInput): Promise<User> {
    if (input.displayName !== undefined) user.rename(asText(input.displayName, 'Display name'));
    if (input.timezone !== undefined) user.moveTo(asText(input.timezone, 'Timezone'));
    await this.users.save(user);
    return user;
  }

  /** Public check used by the sign-up form before the account is created. */
  async isUsernameAvailable(raw: unknown): Promise<boolean> {
    const username = Username.of(typeof raw === 'string' ? raw.trim().replace(/^@/, '') : raw);
    return (await this.users.findByUsername(username)) === null;
  }
}
