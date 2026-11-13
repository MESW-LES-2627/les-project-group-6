import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CircleQuery } from '../../src/features/circle/circle-query.js';
import {
  CIRCLE_COMMENT_LIMIT,
  CircleService,
  MAX_CIRCLE_COMMENT_LIMIT,
} from '../../src/features/circle/circle-service.js';
import type { FriendView } from '../../src/features/friend/friend-repository.js';
import { UserId } from '../../src/features/user/user.js';

const ME = UserId.of('11111111-1111-4111-8111-111111111111');

const friends: FriendView[] = [
  { userId: '22222222-2222-4222-8222-222222222222', displayName: 'Maya', username: 'maya' },
  { userId: '33333333-3333-4333-8333-333333333333', displayName: 'Jonah', username: 'jonah' },
];

function setup() {
  const calls = {
    reading: [] as FriendView[][],
    comments: [] as { userId: UserId; limit: number }[],
  };
  const circle: CircleQuery = {
    friendsReading: async (list) => {
      calls.reading.push([...list]);
      return [];
    },
    comments: async (userId, limit) => {
      calls.comments.push({ userId, limit });
      return [];
    },
  };
  const friendRepository = {
    areFriends: async () => false,
    friendsOf: async () => friends,
    findById: async () => null,
    findBetween: async () => null,
    pendingFor: async () => [],
    save: async () => {},
    delete: async () => {},
  };
  const service = new CircleService(circle, friendRepository);
  return { service, calls };
}

describe('CircleService', () => {
  it('asks the query for the books of the reader friends', async () => {
    const { service, calls } = setup();
    await service.friendsReading(ME);

    assert.deepEqual(calls.reading, [friends]);
  });

  it('caps the comment page at the maximum and defaults when the limit is not a number', async () => {
    const { service, calls } = setup();

    await service.comments(ME);
    await service.comments(ME, 100);
    await service.comments(ME, 0);
    await service.comments(ME, Number.NaN);

    assert.deepEqual(
      calls.comments.map((call) => call.limit),
      [CIRCLE_COMMENT_LIMIT, MAX_CIRCLE_COMMENT_LIMIT, 1, CIRCLE_COMMENT_LIMIT],
    );
  });
});
