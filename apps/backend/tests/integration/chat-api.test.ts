import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Server as SocketServer } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleChallengeGroupRepository } from '../../src/features/challenge-group/challenge-group-repository.js';
import { StandingsQuery } from '../../src/features/challenge-group/standings-query.js';
import { DrizzleChatMessageRepository } from '../../src/features/group-chat/chat-message-repository.js';
import type { ChatMessageDto } from '../../src/features/group-chat/chat-dto.js';
import {
  registerChatSocket,
  SocketIoChatNotifier,
} from '../../src/features/group-chat/chat-socket.js';
import { DrizzleGroupMembership } from '../../src/features/group-chat/group-membership-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider, tokenFor } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ADMIN = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OUTSIDER = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const TABLES = ['users', 'groups', 'group_messages'];

describe('Group chat API and socket', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const users = new DrizzleUserRepository(db);
  const io = new SocketServer();
  const authProvider = new FakeAuthProvider();
  const app = createApp({
    authProvider,
    userRepository: users,
    challengeGroupRepository: new DrizzleChallengeGroupRepository(db),
    standingsQuery: new StandingsQuery(db),
    chatMessageRepository: new DrizzleChatMessageRepository(db),
    groupMembership: new DrizzleGroupMembership(db),
    chatNotifier: new SocketIoChatNotifier(io),
    onChatService: (chat) => registerChatSocket(io, authProvider, (g, u) => chat.canListen(g, u)),
  });
  const server = app.listen(0);
  io.attach(server);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sockets: Socket[] = [];
  let groupId: string;

  // Sends a request as `userId` (the signed-in reader comes from the token).
  const request = (userId: string, method: string, path: string, body?: object) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...authHeader(userId), 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });

  const listen = async (userId: string): Promise<Socket> => {
    const socket = connect(baseUrl, {
      auth: { token: tokenFor(userId) },
      transports: ['websocket'],
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  };

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    for (const [id, name] of [
      [ADMIN, 'ana'],
      [OUTSIDER, 'bob'],
    ] as const) {
      await users.save(
        User.register({
          id: UserId.of(id),
          email: Email.of(`${name}@example.com`),
          username: Username.of(name),
          displayName: name === 'ana' ? 'Ana' : 'Bob',
        }),
      );
    }
    const res = await request(ADMIN, 'POST', '/groups/challenges', {
      name: 'Sprint',
      startDate: '2026-11-01',
      durationDays: 7,
      winMetric: 'minutes',
    });
    groupId = ((await res.json()) as { id: string }).id;
  });

  after(async () => {
    for (const s of sockets) s.disconnect();
    await new Promise((resolve) => io.close(resolve));
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('creating a challenge posts a system message', async () => {
    const res = await request(ADMIN, 'GET', `/groups/${groupId}/messages`);
    const list = (await res.json()) as ChatMessageDto[];
    assert.equal(res.status, 200);
    assert.deepEqual(
      list.map((m) => [m.kind, m.body]),
      [['system', 'Ana created the challenge']],
    );
  });

  test('send is idempotent per client id and history catches up with after', async () => {
    const payload = { clientId: crypto.randomUUID(), body: ' Hi all ' };
    const first = await request(ADMIN, 'POST', `/groups/${groupId}/messages`, payload);
    const retry = await request(ADMIN, 'POST', `/groups/${groupId}/messages`, payload);
    const sent = (await first.json()) as ChatMessageDto;
    assert.equal(first.status, 201);
    assert.equal(retry.status, 200);
    assert.equal(((await retry.json()) as ChatMessageDto).id, sent.id);
    assert.equal(sent.body, 'Hi all');

    const res = await request(ADMIN, 'GET', `/groups/${groupId}/messages?after=${sent.seq - 1}`);
    assert.deepEqual(
      ((await res.json()) as ChatMessageDto[]).map((m) => m.id),
      [sent.id],
    );
  });

  test('outsiders get 403 and bad input gets 400', async () => {
    const outsider = await request(OUTSIDER, 'POST', `/groups/${groupId}/messages`, {
      clientId: crypto.randomUUID(),
      body: 'hey',
    });
    assert.equal(outsider.status, 403);

    const empty = await request(ADMIN, 'POST', `/groups/${groupId}/messages`, {
      clientId: crypto.randomUUID(),
      body: '   ',
    });
    assert.equal(empty.status, 400);
  });

  test('delete hides the body and is pushed to listening members', async () => {
    const socket = await listen(ADMIN);
    const joined = await socket.emitWithAck('group:join', groupId);
    assert.deepEqual(joined, { ok: true });

    const pushed = new Promise<ChatMessageDto>((resolve) => socket.once('message:new', resolve));
    const res = await request(ADMIN, 'POST', `/groups/${groupId}/messages`, {
      clientId: crypto.randomUUID(),
      body: 'Live!',
    });
    const sent = (await res.json()) as ChatMessageDto;
    assert.equal((await pushed).id, sent.id);

    const deletedEvent = new Promise((resolve) => socket.once('message:deleted', resolve));
    const del = await request(ADMIN, 'DELETE', `/groups/${groupId}/messages/${sent.id}`);
    assert.equal(del.status, 204);
    assert.deepEqual(await deletedEvent, { id: sent.id, groupId, seq: sent.seq });

    const history = await request(ADMIN, 'GET', `/groups/${groupId}/messages`);
    const stored = ((await history.json()) as ChatMessageDto[]).find((m) => m.id === sent.id)!;
    assert.equal(stored.body, null);
    assert.ok(stored.deletedAt);
  });

  test('sockets cannot join groups the user is not in, or connect without a valid token', async () => {
    const socket = await listen(OUTSIDER);
    assert.deepEqual(await socket.emitWithAck('group:join', groupId), {
      ok: false,
      error: 'forbidden',
    });

    const anonymous = connect(baseUrl, { auth: {}, transports: ['websocket'] });
    sockets.push(anonymous);
    const error = await new Promise<Error>((resolve) => anonymous.once('connect_error', resolve));
    assert.equal(error.message, 'unauthorized');

    const forged = connect(baseUrl, { auth: { token: 'not-a-token' }, transports: ['websocket'] });
    sockets.push(forged);
    const rejected = await new Promise<Error>((resolve) => forged.once('connect_error', resolve));
    assert.equal(rejected.message, 'unauthorized');
  });
});
