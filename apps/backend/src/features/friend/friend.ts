import crypto from 'node:crypto';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  InvalidValueError,
  NotFoundError,
} from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { UserId } from '../user/user.js';

export class FriendshipId extends Uuid {
  declare private readonly brand: 'FriendshipId';

  static of(raw: unknown): FriendshipId {
    return new FriendshipId(Uuid.parse(raw, 'friendship id'));
  }

  static generate(): FriendshipId {
    return new FriendshipId(crypto.randomUUID());
  }
}

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export function friendshipStatusOf(raw: string): FriendshipStatus {
  const status = FRIENDSHIP_STATUSES.find((s) => s === raw);
  if (!status) throw new InvalidValueError(`Unknown friendship status: ${raw}`);
  return status;
}

export class CannotFriendSelfError extends InvalidValueError {
  constructor() {
    super('Cannot send a friend request to yourself');
  }
}

export class FriendshipNotFoundError extends NotFoundError {
  constructor() {
    super('Friendship');
  }
}

export class FriendshipNotPendingError extends BusinessRuleViolationError {
  constructor(status?: string) {
    super(status ? `Friendship request is already ${status}` : 'No pending friend request exists between these users');
  }
}

export class UnauthorizedFriendshipActionError extends ForbiddenError {
  constructor() {
    super('Only the requested user can respond to this friend request');
  }
}

export interface FriendshipState {
  id: FriendshipId;
  requesterId: UserId;
  addresseeId: UserId;
  status: FriendshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

/**
 * Aggregate Root: A friendship connection between two readers.
 * Starts with a request (pending), which the addressee (requested user) can accept or decline.
 */
export class Friendship {
  readonly id: FriendshipId;
  readonly requesterId: UserId;
  readonly addresseeId: UserId;
  readonly createdAt: Date;
  private _status: FriendshipStatus;
  private _respondedAt: Date | null;

  private constructor(state: FriendshipState) {
    this.id = state.id;
    this.requesterId = state.requesterId;
    this.addresseeId = state.addresseeId;
    this.createdAt = state.createdAt;
    this._status = state.status;
    this._respondedAt = state.respondedAt;
  }

  static request(requesterId: UserId, addresseeId: UserId, now: Date): Friendship {
    if (requesterId.equals(addresseeId)) {
      throw new CannotFriendSelfError();
    }
    return new Friendship({
      id: FriendshipId.generate(),
      requesterId,
      addresseeId,
      status: 'pending',
      createdAt: now,
      respondedAt: null,
    });
  }

  static reconstitute(state: FriendshipState): Friendship {
    return new Friendship(state);
  }

  get status(): FriendshipStatus {
    return this._status;
  }

  get respondedAt(): Date | null {
    return this._respondedAt;
  }

  /**
   * Accepts the friendship request. Only the addressee (the requested user) can accept.
   */
  accept(by: UserId, now: Date): void {
    if (!by.equals(this.addresseeId)) {
      throw new UnauthorizedFriendshipActionError();
    }
    if (this._status !== 'pending') {
      throw new FriendshipNotPendingError(this._status);
    }
    this._status = 'accepted';
    this._respondedAt = now;
  }

  /**
   * Declines the friendship request. Only the addressee (the requested user) can decline.
   */
  decline(by: UserId, now: Date): void {
    if (!by.equals(this.addresseeId)) {
      throw new UnauthorizedFriendshipActionError();
    }
    if (this._status !== 'pending') {
      throw new FriendshipNotPendingError(this._status);
    }
    this._status = 'declined';
    this._respondedAt = now;
  }
}
