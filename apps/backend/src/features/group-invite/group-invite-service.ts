import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IFriendRepository } from '../friend/friend-repository.js';
import type { IGroupRosterRepository } from '../group/group-roster-repository.js';
import { GroupId, NotGroupAdminError, type MemberJoinedListener } from '../group/group.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import { GroupInvite, InviteId, InviteRuleError } from './group-invite.js';
import type { IGroupInviteRepository, PendingInvite } from './group-invite-repository.js';

// Application service: the admin of any group invites friends; invitees answer.
export class GroupInviteService {
  constructor(
    private readonly invites: IGroupInviteRepository,
    private readonly rosters: IGroupRosterRepository,
    private readonly friends: IFriendRepository,
    private readonly users: IUserRepository,
    private readonly listeners: MemberJoinedListener[] = [],
    private readonly now: Clock = () => new Date(),
  ) {}

  async invite(groupId: unknown, userId: unknown, inviteeId: unknown): Promise<GroupInvite> {
    const group = await this.rosters.findById(GroupId.of(groupId));
    if (!group) throw new NotFoundError('Group');
    const inviter = UserId.of(userId);
    const invitee = UserId.of(inviteeId);
    if (!(await this.users.findById(invitee))) throw new NotFoundError('User');

    const invite = GroupInvite.send(group, inviter, invitee, this.now());
    if (!(await this.friends.areFriends(inviter, invitee))) {
      throw new InviteRuleError('You can only invite your friends');
    }
    if (await this.invites.hasPending(group.groupId, invitee)) {
      throw new InviteRuleError('This reader already has a pending invite');
    }
    await this.invites.save(invite);
    return invite;
  }

  async pendingFor(userId: unknown): Promise<PendingInvite[]> {
    return this.invites.pendingFor(UserId.of(userId));
  }

  /** The admin's unanswered invites for one group, so the invite list can mark them. */
  async pendingForGroup(groupId: unknown, userId: unknown): Promise<GroupInvite[]> {
    const group = await this.rosters.findById(GroupId.of(groupId));
    if (!group) throw new NotFoundError('Group');
    if (!group.isAdmin(UserId.of(userId))) throw new NotGroupAdminError('see pending invites');
    return this.invites.pendingForGroup(group.groupId);
  }

  /** The invitee joins the group; the listeners react (library, chat). */
  async accept(inviteId: unknown, userId: unknown): Promise<GroupInvite> {
    const invite = await this.load(inviteId);
    const now = this.now();
    invite.accept(UserId.of(userId), now);
    await this.invites.save(invite);
    await this.rosters.addMember(invite.groupId, {
      userId: invite.inviteeId,
      role: 'member',
      joinedAt: now,
    });
    const event = { groupId: invite.groupId, userId: invite.inviteeId, at: now };
    for (const listener of this.listeners) await listener.memberJoined(event);
    return invite;
  }

  async decline(inviteId: unknown, userId: unknown): Promise<GroupInvite> {
    const invite = await this.load(inviteId);
    invite.decline(UserId.of(userId), this.now());
    await this.invites.save(invite);
    return invite;
  }

  private async load(inviteId: unknown): Promise<GroupInvite> {
    const invite = await this.invites.findById(InviteId.of(inviteId));
    if (!invite) throw new NotFoundError('Invite');
    return invite;
  }
}
