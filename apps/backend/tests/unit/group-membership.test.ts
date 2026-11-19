// @req F-GRP-01
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GroupMembershipService } from '../../src/features/group/group-membership-service.js';
import { AdminCannotLeaveError, GroupId, GroupRoster } from '../../src/features/group/group.js';
import { UserId } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import { InMemoryGroupRosterRepository } from '../helpers/in-memory-repositories.js';

const NOW = new Date('2026-11-04T10:00:00Z');
const ADMIN = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const MAYA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01');
const STRANGER = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');
const GROUP = GroupId.generate();

describe('Leaving a group', () => {
  let rosters: InMemoryGroupRosterRepository;
  let memberships: GroupMembershipService;

  beforeEach(() => {
    rosters = new InMemoryGroupRosterRepository();
    rosters.put(
      new GroupRoster(GROUP, 'Sprint', 'challenge', ADMIN, [
        { userId: ADMIN, role: 'admin', joinedAt: NOW },
        { userId: MAYA, role: 'member', joinedAt: NOW },
      ]),
    );
    memberships = new GroupMembershipService(rosters);
  });

  test('a member leaves and is no longer in the group', async () => {
    await memberships.leave(GROUP.value, MAYA.value);

    assert.equal((await rosters.findById(GROUP))!.isMember(MAYA), false);
  });

  test('the admin cannot leave while other members remain', async () => {
    await assert.rejects(memberships.leave(GROUP.value, ADMIN.value), AdminCannotLeaveError);
    assert.ok((await rosters.findById(GROUP))!.isMember(ADMIN));
  });

  test('the admin can leave once they are the last member', async () => {
    await memberships.leave(GROUP.value, MAYA.value);
    await memberships.leave(GROUP.value, ADMIN.value);

    assert.equal((await rosters.findById(GROUP))!.members.length, 0);
  });

  test('someone outside the group, or an unknown group, gets not found', async () => {
    await assert.rejects(memberships.leave(GROUP.value, STRANGER.value), NotFoundError);
    await assert.rejects(memberships.leave(GroupId.generate().value, MAYA.value), NotFoundError);
  });
});
