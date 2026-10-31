import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChallengeGroup,
  ChallengePeriod,
  GroupName,
  InvalidChallengePeriodError,
  InvalidGroupNameError,
  InvalidWinMetricError,
  WinMetric,
  memberRoleOf,
} from '../../src/features/challenge-group/challenge-group.js';
import { UserId } from '../../src/features/user/user.js';
import { InvalidValueError } from '../../src/utils/errors.js';

const newGroup = (adminId = UserId.generate()) =>
  ChallengeGroup.create({
    adminId,
    name: GroupName.of('November Pages'),
    period: ChallengePeriod.lasting('2026-11-01', 30),
    winMetric: WinMetric.of('minutes'),
  });

describe('ChallengeGroup', () => {
  test('the creator is the admin and the only member', () => {
    const admin = UserId.generate();
    const group = newGroup(admin);
    assert.ok(group.adminId.equals(admin));
    assert.strictEqual(group.members.length, 1);
    assert.strictEqual(group.members[0]!.role, 'admin');
    assert.ok(group.isMember(admin));
    assert.strictEqual(group.challenge.metricGoal, 0);
  });

  test('a negative or fractional metric goal is rejected', () => {
    for (const metricGoal of [-1, 1.5]) {
      assert.throws(
        () =>
          ChallengeGroup.create({
            adminId: UserId.generate(),
            name: GroupName.of('Sprint'),
            period: ChallengePeriod.lasting('2026-11-01', 7),
            winMetric: WinMetric.of('pages'),
            metricGoal,
          }),
        InvalidValueError,
      );
    }
  });

  test('the status follows the challenge period', () => {
    const group = newGroup();
    assert.strictEqual(group.statusAt(new Date('2026-10-31T23:59:59Z')), 'scheduled');
    assert.strictEqual(group.statusAt(new Date('2026-11-01T00:00:00Z')), 'active');
    assert.strictEqual(group.statusAt(new Date('2026-11-30T23:59:59Z')), 'active');
    assert.strictEqual(group.statusAt(new Date('2026-12-01T00:00:00Z')), 'completed');
  });
});

describe('Challenge value objects', () => {
  test('group names are trimmed and must not be empty', () => {
    assert.strictEqual(GroupName.of('  Sprint ').value, 'Sprint');
    assert.throws(() => GroupName.of('   '), InvalidGroupNameError);
    assert.throws(() => GroupName.of('x'.repeat(101)), InvalidGroupNameError);
  });

  test('only the four win metrics are allowed', () => {
    assert.strictEqual(WinMetric.of('streak').value, 'streak');
    assert.throws(() => WinMetric.of('likes'), InvalidWinMetricError);
  });

  test('a period lasting N days ends on the Nth day', () => {
    const period = ChallengePeriod.lasting('2026-11-01', 30);
    assert.strictEqual(period.endDate, '2026-11-30');
    assert.strictEqual(ChallengePeriod.lasting('2026-12-20', 14).endDate, '2027-01-02');
  });

  test('invalid periods are rejected', () => {
    assert.throws(() => ChallengePeriod.lasting('2026-02-30', 7), InvalidChallengePeriodError);
    assert.throws(() => ChallengePeriod.lasting('2026-11-01', 0), InvalidChallengePeriodError);
    assert.throws(() => ChallengePeriod.lasting('2026-11-01', 400), InvalidChallengePeriodError);
    assert.throws(
      () => ChallengePeriod.of('2026-11-10', '2026-11-01'),
      InvalidChallengePeriodError,
    );
  });

  test('member roles are parsed, and an unknown stored role is rejected', () => {
    assert.strictEqual(memberRoleOf('admin'), 'admin');
    assert.strictEqual(memberRoleOf('member'), 'member');
    assert.throws(() => memberRoleOf('owner'), InvalidValueError);
  });
});
