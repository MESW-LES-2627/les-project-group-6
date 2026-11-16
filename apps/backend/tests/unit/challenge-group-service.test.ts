// @req F-GRP-01 F-GRP-04 F-GRP-03
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChallengeGroupService } from '../../src/features/challenge-group/challenge-group-service.js';
import { InvalidWinMetricError } from '../../src/features/challenge-group/challenge-group.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryChallengeGroupRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('ChallengeGroupService', () => {
  let service: ChallengeGroupService;

  const form = {
    userId: USER_ID,
    name: 'November Pages',
    startDate: '2026-11-01',
    durationDays: 30,
    winMetric: 'minutes',
  };

  beforeEach(async () => {
    const users = new InMemoryUserRepository();
    await users.save(
      User.register({
        id: UserId.of(USER_ID),
        email: Email.of('demo@bookmarked.app'),
        username: Username.of('demo_reader'),
        displayName: 'Demo Reader',
      }),
    );
    service = new ChallengeGroupService(
      new InMemoryChallengeGroupRepository(),
      users,
      () => new Date('2026-10-31T12:00:00Z'),
    );
  });

  test('creates the group with the reader as admin and lists it for them', async () => {
    const { group, status } = await service.create(form);

    assert.strictEqual(group.name.value, 'November Pages');
    assert.strictEqual(group.challenge.period.endDate, '2026-11-30');
    assert.strictEqual(status, 'scheduled');

    const mine = await service.forMember(USER_ID);
    assert.deepStrictEqual(
      mine.map((v) => v.group.id.value),
      [group.id.value],
    );
    assert.ok((await service.get(group.id.value, USER_ID)).group.id.equals(group.id));
  });

  test('an unknown reader cannot create a group', async () => {
    await assert.rejects(
      service.create({ ...form, userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' }),
      NotFoundError,
    );
  });

  test('an invalid metric is rejected', async () => {
    await assert.rejects(service.create({ ...form, winMetric: 'likes' }), InvalidWinMetricError);
  });

  test('getting an unknown group fails', async () => {
    await assert.rejects(
      service.get('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', USER_ID),
      NotFoundError,
    );
  });

  test('a reader who is not a member gets the group as not found', async () => {
    const { group } = await service.create(form);
    await assert.rejects(
      service.get(group.id.value, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
      NotFoundError,
    );
  });
});
