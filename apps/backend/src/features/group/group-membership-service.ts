import { NotFoundError } from '../../utils/errors.js';
import { UserId } from '../user/user.js';
import { GroupId } from './group.js';
import type { IGroupRosterRepository } from './group-roster-repository.js';

// Application service: membership changes that work on any group category.
export class GroupMembershipService {
  constructor(private readonly rosters: IGroupRosterRepository) {}

  /**
   * The reader leaves the group. A non-member gets 404, as if the group did not exist.
   * They can be invited again later, since the membership row is gone.
   */
  async leave(groupId: unknown, userId: unknown): Promise<void> {
    const group = await this.rosters.findById(GroupId.of(groupId));
    const reader = UserId.of(userId);
    if (!group || !group.isMember(reader)) throw new NotFoundError('Group');
    group.requireCanLeave(reader);
    await this.rosters.removeMember(group.groupId, reader);
  }
}
