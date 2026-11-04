import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MessageText,
  InvalidMessageTextError,
} from '../../src/features/group-chat/chat-message.js';
import { ChatService } from '../../src/features/group-chat/chat-service.js';
import { InviteRuleError } from '../../src/features/group-invite/group-invite.js';
import { GroupInviteService } from '../../src/features/group-invite/group-invite-service.js';
import {
  GroupId,
  GroupRoster,
  NotGroupAdminError,
  NotGroupMemberError,
  type MemberJoined,
} from '../../src/features/group/group.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryChatRepository,
  InMemoryFriendRepository,
  InMemoryGroupInviteRepository,
  InMemoryGroupRosterRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const NOW = new Date('2026-11-04T10:00:00Z');
const ADMIN = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const MAYA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01');
const STRANGER = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');
const GROUP = GroupId.generate();

describe('Group invites and chat', () => {
  let users: InMemoryUserRepository;
  let rosters: InMemoryGroupRosterRepository;
  let friends: InMemoryFriendRepository;
  let chatMessages: InMemoryChatRepository;
  let chat: ChatService;
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
    chatMessages = new InMemoryChatRepository(users);
    chat = new ChatService(chatMessages, rosters, users, () => NOW);
    joined = [];
    invites = new GroupInviteService(
      new InMemoryGroupInviteRepository(),
      rosters,
      friends,
      users,
      [chat, { memberJoined: async (event) => void joined.push(event) }],
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
    const history = await chat.history(GROUP.value, MAYA.value);
    assert.strictEqual(history.at(-1)!.message.text.value, 'Maya Laurent joined the group.');
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

  test('members post trimmed messages; others cannot read or write', async () => {
    const entry = await chat.post(GROUP.value, ADMIN.value, '  Chapter 27!  ');

    assert.strictEqual(entry.message.text.value, 'Chapter 27!');
    assert.strictEqual(entry.author?.displayName, 'Demo Reader');
    await assert.rejects(chat.post(GROUP.value, MAYA.value, 'hi'), NotGroupMemberError);
    await assert.rejects(chat.history(GROUP.value, MAYA.value), NotGroupMemberError);
    assert.strictEqual((await chat.history(GROUP.value, ADMIN.value)).length, 1);
  });

  test('message text is 1 to 2000 characters', () => {
    assert.throws(() => MessageText.of('   '), InvalidMessageTextError);
    assert.throws(() => MessageText.of('x'.repeat(2001)), InvalidMessageTextError);
    assert.throws(() => MessageText.of(42), InvalidMessageTextError);
    assert.strictEqual(MessageText.of('x'.repeat(2000)).value.length, 2000);
  });
});
