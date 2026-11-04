import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GroupId } from '../../src/features/challenge-group/challenge-group.js';
import type {
  ChatMessageDto,
  MessageDeletedEvent,
} from '../../src/features/group-chat/chat-dto.js';
import type { ChatNotifier } from '../../src/features/group-chat/chat-notifier.js';
import { ChatService } from '../../src/features/group-chat/chat-service.js';
import { UserId } from '../../src/features/user/user.js';
import { ForbiddenError, InvalidValueError, NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryChatMessageRepository,
  InMemoryGroupMembership,
} from '../helpers/in-memory-repositories.js';

const groupId = GroupId.generate();
const admin = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const member = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');
const outsider = UserId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13');
const CLIENT_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';

class RecordingNotifier implements ChatNotifier {
  created: ChatMessageDto[] = [];
  deleted: MessageDeletedEvent[] = [];
  messageCreated(message: ChatMessageDto): void {
    this.created.push(message);
  }
  messageDeleted(event: MessageDeletedEvent): void {
    this.deleted.push(event);
  }
  leave(): void {}
}

describe('ChatService', () => {
  let notifier: RecordingNotifier;
  let chat: ChatService;

  beforeEach(() => {
    const members = new InMemoryGroupMembership();
    members.add(groupId, admin, 'admin');
    members.add(groupId, member);
    notifier = new RecordingNotifier();
    chat = new ChatService(new InMemoryChatMessageRepository(), members, notifier);
  });

  const send = (userId = member, clientId = CLIENT_ID, body = 'Hello') =>
    chat.send({ groupId: groupId.value, userId: userId.value, clientId, body });

  test('send stores the message, then pushes it to the group', async () => {
    const { message, created } = await send();
    assert.equal(created, true);
    assert.equal(message.seq, 1);
    assert.deepEqual(
      notifier.created.map((m) => m.body),
      ['Hello'],
    );
  });

  test('a retried send with the same client id is stored and pushed once', async () => {
    const first = await send();
    const retry = await send();
    assert.equal(retry.created, false);
    assert.ok(retry.message.id.equals(first.message.id));
    assert.equal(notifier.created.length, 1);
  });

  test('only members can send or read', async () => {
    await assert.rejects(send(outsider), ForbiddenError);
    await assert.rejects(
      chat.history({ groupId: groupId.value, userId: outsider.value }),
      ForbiddenError,
    );
  });

  test('history pages by seq: latest, after and before', async () => {
    for (let i = 1; i <= 5; i++) {
      await send(member, `d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a0${i}`, `m${i}`);
    }
    const page = (q: object) =>
      chat
        .history({ groupId: groupId.value, userId: member.value, ...q })
        .then((list) => list.map((m) => m.body.value));

    assert.deepEqual(await page({ limit: '2' }), ['m4', 'm5']);
    assert.deepEqual(await page({ after: '3' }), ['m4', 'm5']);
    assert.deepEqual(await page({ before: '3', limit: 1 }), ['m2']);
    await assert.rejects(page({ after: 1, before: 3 }), InvalidValueError);
    await assert.rejects(page({ limit: 0 }), InvalidValueError);
    await assert.rejects(page({ after: 'abc' }), InvalidValueError);
  });

  test('the author deletes their message and the group is told', async () => {
    const { message } = await send();
    await chat.delete({
      groupId: groupId.value,
      messageId: message.id.value,
      userId: member.value,
    });
    assert.deepEqual(notifier.deleted, [{ id: message.id.value, groupId: groupId.value, seq: 1 }]);

    const [stored] = await chat.history({ groupId: groupId.value, userId: member.value });
    assert.equal(stored!.isDeleted, true);
  });

  test('deleting twice notifies once', async () => {
    const { message } = await send();
    const command = { groupId: groupId.value, messageId: message.id.value, userId: admin.value };
    await chat.delete(command);
    await chat.delete(command);
    assert.equal(notifier.deleted.length, 1);
  });

  test('a member cannot delete someone else’s message', async () => {
    const { message } = await send(admin);
    await assert.rejects(
      chat.delete({ groupId: groupId.value, messageId: message.id.value, userId: member.value }),
      ForbiddenError,
    );
  });

  test('deleting an unknown message is not found', async () => {
    await assert.rejects(
      chat.delete({ groupId: groupId.value, messageId: CLIENT_ID, userId: member.value }),
      NotFoundError,
    );
  });

  test('system messages are stored and pushed without an author', async () => {
    await chat.postSystem(groupId, 'Ana created the challenge');
    assert.equal(notifier.created[0]!.kind, 'system');
    assert.equal(notifier.created[0]!.authorId, null);
  });

  test('canListen is true only for members with valid ids', async () => {
    assert.equal(await chat.canListen(groupId.value, member.value), true);
    assert.equal(await chat.canListen(groupId.value, outsider.value), false);
    assert.equal(await chat.canListen('nope', member.value), false);
  });
});
