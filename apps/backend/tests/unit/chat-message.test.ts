import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GroupId } from '../../src/features/challenge-group/challenge-group.js';
import {
  ChatMessage,
  ClientMessageId,
  InvalidMessageBodyError,
  MAX_MESSAGE_LENGTH,
  MessageBody,
} from '../../src/features/group-chat/chat-message.js';
import { UserId } from '../../src/features/user/user.js';
import { ForbiddenError } from '../../src/utils/errors.js';

const groupId = GroupId.generate();
const author = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const other = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');
const now = new Date('2026-11-02T10:00:00Z');

const write = () =>
  ChatMessage.write(
    {
      groupId,
      authorId: author,
      clientId: ClientMessageId.of('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
      body: MessageBody.of('Hello'),
    },
    now,
  );

describe('MessageBody', () => {
  test('trims the text', () => {
    assert.equal(MessageBody.of('  hi  ').value, 'hi');
  });

  test('rejects empty, blank, too long and non-string bodies', () => {
    for (const raw of ['', '   ', 'x'.repeat(MAX_MESSAGE_LENGTH + 1), 42, undefined]) {
      assert.throws(() => MessageBody.of(raw), InvalidMessageBodyError);
    }
  });
});

describe('ChatMessage', () => {
  test('a text message has an author and a client id', () => {
    const message = write();
    assert.equal(message.kind, 'text');
    assert.ok(message.authorId?.equals(author));
    assert.equal(message.isDeleted, false);
  });

  test('a system message has no author', () => {
    const message = ChatMessage.system(groupId, MessageBody.of('Ana joined'), now);
    assert.equal(message.kind, 'system');
    assert.equal(message.authorId, null);
    assert.equal(message.clientId, null);
  });

  test('the author can delete their message, once', () => {
    const message = write();
    assert.equal(message.deleteBy(author, 'member', now), true);
    assert.equal(message.isDeleted, true);
    assert.equal(message.deleteBy(author, 'member', now), false);
  });

  test('the admin can delete anyone’s message', () => {
    assert.equal(write().deleteBy(other, 'admin', now), true);
  });

  test('another member cannot delete it', () => {
    assert.throws(() => write().deleteBy(other, 'member', now), ForbiddenError);
  });

  test('system messages cannot be deleted', () => {
    const message = ChatMessage.system(groupId, MessageBody.of('Ana joined'), now);
    assert.throws(() => message.deleteBy(other, 'admin', now), ForbiddenError);
  });
});
