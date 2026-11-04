import crypto from 'node:crypto';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import { NotGroupAdminError, type GroupId, type GroupRoster } from '../group/group.js';
import type { UserId } from '../user/user.js';

export class InviteId extends Uuid {
  declare private readonly brand: 'InviteId';

  static of(raw: unknown): InviteId {
    return new InviteId(Uuid.parse(raw, 'invite id'));
  }

  static generate(): InviteId {
    return new InviteId(crypto.randomUUID());
  }
}

export const INVITE_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export function inviteStatusOf(raw: string): InviteStatus {
  const status = INVITE_STATUSES.find((s) => s === raw);
  if (!status) throw new InvalidValueError(`Unknown invite status: ${raw}`);
  return status;
}

export class InviteRuleError extends BusinessRuleViolationError {}

export interface GroupInviteState {
  id: InviteId;
  groupId: GroupId;
  inviteeId: UserId;
  inviterId: UserId;
  status: InviteStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

// Aggregate root: the admin's invitation for a reader to join a group. It is
// answered once, by the invitee.
export class GroupInvite {
  readonly id: InviteId;
  readonly groupId: GroupId;
  readonly inviteeId: UserId;
  readonly inviterId: UserId;
  readonly createdAt: Date;
  private _status: InviteStatus;
  private _respondedAt: Date | null;

  private constructor(state: GroupInviteState) {
    this.id = state.id;
    this.groupId = state.groupId;
    this.inviteeId = state.inviteeId;
    this.inviterId = state.inviterId;
    this.createdAt = state.createdAt;
    this._status = state.status;
    this._respondedAt = state.respondedAt;
  }

  /**
   * The admin invites a reader who is not in the group yet. Friendship and
   * duplicate invites need the database, so the service checks them.
   */
  static send(group: GroupRoster, inviterId: UserId, inviteeId: UserId, now: Date): GroupInvite {
    if (!group.isAdmin(inviterId)) throw new NotGroupAdminError('invite readers');
    if (inviterId.equals(inviteeId)) throw new InviteRuleError('You cannot invite yourself');
    if (group.isMember(inviteeId)) throw new InviteRuleError('This reader is already a member');
    return new GroupInvite({
      id: InviteId.generate(),
      groupId: group.groupId,
      inviteeId,
      inviterId,
      status: 'pending',
      createdAt: now,
      respondedAt: null,
    });
  }

  static reconstitute(state: GroupInviteState): GroupInvite {
    return new GroupInvite(state);
  }

  get status(): InviteStatus {
    return this._status;
  }

  get respondedAt(): Date | null {
    return this._respondedAt;
  }

  accept(by: UserId, now: Date): void {
    this.answer(by, 'accepted', now);
  }

  decline(by: UserId, now: Date): void {
    this.answer(by, 'declined', now);
  }

  private answer(by: UserId, status: InviteStatus, now: Date): void {
    if (!by.equals(this.inviteeId)) throw new InviteRuleError('Only the invited reader can answer');
    if (this._status !== 'pending')
      throw new InviteRuleError(`This invite was already ${this._status}`);
    this._status = status;
    this._respondedAt = now;
  }
}
