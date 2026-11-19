import crypto from 'node:crypto';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  InvalidValueError,
} from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { UserId } from '../user/user.js';

// Shared kernel of the group categories (challenge and book club): identity, name
// and membership are the same for both.

export class GroupId extends Uuid {
  declare private readonly brand: 'GroupId';

  static of(raw: unknown): GroupId {
    return new GroupId(Uuid.parse(raw, 'group id'));
  }

  static generate(): GroupId {
    return new GroupId(crypto.randomUUID());
  }
}

export class InvalidGroupNameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Group name must be 1-100 characters, got ${String(raw)}`);
  }
}

export class GroupName {
  private constructor(readonly value: string) {}

  static of(raw: unknown): GroupName {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length === 0 || name.length > 100) throw new InvalidGroupNameError(raw);
    return new GroupName(name);
  }
}

export const MEMBER_ROLES = ['admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

function isMemberRole(raw: string): raw is MemberRole {
  return MEMBER_ROLES.some((role) => role === raw);
}

/** Parses the role stored for a member; a value outside the known roles is corrupt data. */
export function memberRoleOf(raw: string): MemberRole {
  if (!isMemberRole(raw)) throw new InvalidValueError(`Unknown member role: ${raw}`);
  return raw;
}

export interface Membership {
  userId: UserId;
  role: MemberRole;
  joinedAt: Date;
}

export const GROUP_KINDS = ['challenge', 'book-club'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

function isGroupKind(raw: string): raw is GroupKind {
  return (GROUP_KINDS as readonly string[]).includes(raw);
}

export function groupKindOf(raw: string): GroupKind {
  if (!isGroupKind(raw)) throw new InvalidValueError(`Unknown group kind: ${raw}`);
  return raw;
}

export class NotGroupAdminError extends ForbiddenError {
  constructor(action: string) {
    super(`Only the group admin can ${action}`);
  }
}

export class NotGroupMemberError extends ForbiddenError {
  constructor(action: string) {
    super(`Only group members can ${action}`);
  }
}

export class AdminCannotLeaveError extends BusinessRuleViolationError {
  constructor() {
    super('The admin cannot leave while other members are in the group');
  }
}

// Who belongs to a group, whatever its category. Used by the features that work
// on any group (invites, chat) without loading the category's aggregate.
export class GroupRoster {
  constructor(
    readonly groupId: GroupId,
    readonly name: string,
    readonly kind: GroupKind,
    readonly adminId: UserId,
    readonly members: readonly Membership[],
  ) {}

  isMember(userId: UserId): boolean {
    return this.members.some((m) => m.userId.equals(userId));
  }

  isAdmin(userId: UserId): boolean {
    return this.adminId.equals(userId);
  }

  /**
   * Throws unless the reader may leave (F-GRP-01): the admin stays while anyone else is
   * still in the group, so it never ends up without an admin.
   */
  requireCanLeave(userId: UserId): void {
    if (this.isAdmin(userId) && this.members.some((m) => !m.userId.equals(userId))) {
      throw new AdminCannotLeaveError();
    }
  }

  /** Throws unless the reader is a member, so they can `action`. */
  requireMember(userId: UserId, action: string): void {
    if (!this.isMember(userId)) throw new NotGroupMemberError(action);
  }
}

/** Domain event: a reader became a member of a group. */
export interface MemberJoined {
  groupId: GroupId;
  userId: UserId;
  at: Date;
}

// Observer: features that react when someone joins a group (the book club adds the
// round book to their library, the chat announces them) without the invite knowing them.
export interface MemberJoinedListener {
  memberJoined(event: MemberJoined): Promise<void>;
}
