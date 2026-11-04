import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JoinAnnouncer } from '../../src/features/group-chat/join-announcer.js';
import { InviteRuleError } from '../../src/features/group-invite/group-invite.js';
import { GroupInviteService } from '../../src/features/group-invite/group-invite-service.js';
import {
  GroupId,
  GroupRoster,
  NotGroupAdminError,
  type MemberJoined,
} from '../../src/features/group/group.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryFriendRepository,
  InMemoryGroupInviteRepository,
  InMemoryGroupRosterRepository,
  InMemoryUserRepository,
  RecordingSystemMessages,
} from '../helpers/in-memory-repositories.js';

const NOW = new Date('2026-11-04T10:00:00Z');
const ADMIN = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const MAYA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01');
const STRANGER = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');
const GROUP = GroupId.generate();

describe('Group invites', () => {
  let users: InMemoryUserRepository;
  let rosters: InMemoryGroupRosterRepository;
  let friends: InMemoryFriendRepository;
  let chat: RecordingSystemMessages;
  let invites: GroupInviteService;
  let joined: MemberJoined[];

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    for (const [id, username, name] of [
      [ADMIN, 'demo_reader', 'Demo Reader'],
      [MAYA, 'mayareads', 'Maya Laurent'],
      [STRANGER, 'stranger', 'Stranger'],
    ] as const) {
      await users.save(
        User.register({
          id,
          email: Email.of(`${username}@example.com`),
          username: Username.of(username),
          displayName: name,
        }),
      );
    }
    rosters = new InMemoryGroupRosterRepository();
    rosters.put(
      new GroupRoster(GROUP, 'Classics', 'book-club', ADMIN, [
        { userId: ADMIN, role: 'admin', joinedAt: NOW },
      ]),
    );
    friends = new InMemoryFriendRepository();
    friends.befriend(ADMIN, MAYA);
    chat = new RecordingSystemMessages();
    joined = [];
    invites = new GroupInviteService(
      new InMemoryGroupInviteRepository(),
      rosters,
      friends,
      users,
      [new JoinAnnouncer(chat, users), { memberJoined: async (event) => void joined.push(event) }],
      () => NOW,
    );
  });

  test('the admin invites a friend, who accepts and joins the group', async () => {
    const invite = await invites.invite(GROUP.value, ADMIN.value, MAYA.value);
    assert.strictEqual((await invites.pendingFor(MAYA.value)).length, 1);

    const accepted = await invites.accept(invite.id.value, MAYA.value);

    assert.strictEqual(accepted.status, 'accepted');
    assert.ok((await rosters.findById(GROUP))!.isMember(MAYA));
    assert.strictEqual(joined.length, 1);
    assert.ok(joined[0]!.userId.equals(MAYA));
    assert.deepStrictEqual(chat.texts, ['Maya Laurent joined the group']);
    assert.strictEqual((await invites.pendingFor(MAYA.value)).length, 0);
  });

  test('only friends, once, and only by the admin', async () => {
    await assert.rejects(invites.invite(GROUP.value, ADMIN.value, STRANGER.value), InviteRuleError);
    await assert.rejects(invites.invite(GROUP.value, MAYA.value, ADMIN.value), NotGroupAdminError);
    await assert.rejects(invites.invite(GROUP.value, ADMIN.value, ADMIN.value), InviteRuleError);

    await invites.invite(GROUP.value, ADMIN.value, MAYA.value);
    await assert.rejects(invites.invite(GROUP.value, ADMIN.value, MAYA.value), InviteRuleError);
    await assert.rejects(
      invites.invite(GroupId.generate().value, ADMIN.value, MAYA.value),
      NotFoundError,
    );
  });

  test('only the invitee answers, and only once', async () => {
    const invite = await invites.invite(GROUP.value, ADMIN.value, MAYA.value);

    await assert.rejects(invites.accept(invite.id.value, ADMIN.value), InviteRuleError);
    assert.strictEqual((await invites.decline(invite.id.value, MAYA.value)).status, 'declined');
    await assert.rejects(invites.accept(invite.id.value, MAYA.value), InviteRuleError);
    assert.ok(!(await rosters.findById(GROUP))!.isMember(MAYA));
  });
});
