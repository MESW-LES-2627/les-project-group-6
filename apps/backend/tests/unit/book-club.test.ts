// @req F-GRP-07
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BookId } from '../../src/features/book/book.js';
import {
  BookClub,
  InvalidRoundPeriodError,
  RoundPeriod,
  RoundStillActiveError,
} from '../../src/features/book-club/book-club.js';
import { GroupName, NotGroupAdminError } from '../../src/features/group/group.js';
import { UserId } from '../../src/features/user/user.js';

const NOW = new Date('2026-11-04T10:00:00Z');
const EMMA = BookId.generate();
const PIRANESI = BookId.generate();

const newClub = (adminId = UserId.generate()) =>
  BookClub.create(
    { adminId, name: GroupName.of('Classics'), bookId: EMMA, deadline: '2026-11-30' },
    NOW,
  );

/** The club with `extra` members who joined at `joinedAt`. */
const withMembers = (club: BookClub, extra: UserId[], joinedAt = NOW) =>
  BookClub.reconstitute({
    id: club.id,
    name: club.name,
    description: club.description,
    adminId: club.adminId,
    members: [
      ...club.members,
      ...extra.map((userId) => ({ userId, role: 'member' as const, joinedAt })),
    ],
    rounds: [...club.rounds],
    createdAt: club.createdAt,
  });

describe('RoundPeriod', () => {
  test('ends at the start of the day after the deadline', () => {
    const period = RoundPeriod.of('2026-11-04', '2026-11-30');
    assert.strictEqual(period.endsAt.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.strictEqual(period.daysLeft(NOW), 27);
  });

  test('a deadline on the start day is a one-day round', () => {
    assert.strictEqual(RoundPeriod.of('2026-11-04', '2026-11-04').deadline, '2026-11-04');
  });

  test('rejects invalid dates, a deadline before the start and rounds over a year', () => {
    assert.throws(() => RoundPeriod.of('2026-11-04', '2026-02-30'), InvalidRoundPeriodError);
    assert.throws(() => RoundPeriod.of('2026-11-04', '2026-11-03'), InvalidRoundPeriodError);
    assert.throws(() => RoundPeriod.of('2026-11-04', '2027-11-04'), InvalidRoundPeriodError);
    assert.throws(() => RoundPeriod.of('2026-11-04', undefined), InvalidRoundPeriodError);
  });
});

describe('BookClub', () => {
  test('the creator is admin and only member, and round 1 starts today', () => {
    const adminId = UserId.generate();
    const club = newClub(adminId);

    assert.ok(club.isAdmin(adminId));
    assert.deepStrictEqual(
      club.members.map((m) => m.role),
      ['admin'],
    );
    assert.strictEqual(club.currentRound.number, 1);
    assert.ok(club.currentRound.bookId.equals(EMMA));
    assert.strictEqual(club.currentRound.period.startDate, '2026-11-04');
  });

  test('a round is completed when every member finished before the deadline', () => {
    const friend = UserId.generate();
    const club = withMembers(newClub(), [friend]);
    const round = club.currentRound;
    const finished = new Map([[club.adminId.value, new Date('2026-11-10T00:00:00Z')]]);

    assert.strictEqual(round.outcome(club.members, finished, NOW), 'active');

    finished.set(friend.value, new Date('2026-11-20T00:00:00Z'));
    assert.strictEqual(round.outcome(club.members, finished, NOW), 'completed');
  });

  test('a round is not completed once the deadline passes without everyone', () => {
    const friend = UserId.generate();
    const club = withMembers(newClub(), [friend]);
    const finished = new Map([
      [club.adminId.value, new Date('2026-11-10T00:00:00Z')],
      // Finished one day too late
      [friend.value, new Date('2026-12-01T09:00:00Z')],
    ]);

    assert.strictEqual(
      club.currentRound.outcome(club.members, finished, new Date('2026-12-01T00:00:00Z')),
      'not-completed',
    );
  });

  test('members who joined after the round ended are not expected to read it', () => {
    const late = UserId.generate();
    const club = withMembers(newClub(), [late], new Date('2026-12-05T00:00:00Z'));
    const finished = new Map([[club.adminId.value, new Date('2026-11-10T00:00:00Z')]]);

    assert.strictEqual(club.currentRound.expectedReaders(club.members).length, 1);
    assert.strictEqual(
      club.currentRound.outcome(club.members, finished, new Date('2026-12-06T00:00:00Z')),
      'completed',
    );
  });

  test('the admin starts the next round once the current one is over', () => {
    const club = newClub();
    const later = new Date('2026-12-02T08:00:00Z');

    const round = club.startNextRound(club.adminId, PIRANESI, '2026-12-31', 'not-completed', later);

    assert.strictEqual(round.number, 2);
    assert.strictEqual(round.period.startDate, '2026-12-02');
    assert.ok(club.currentRound.bookId.equals(PIRANESI));
    assert.strictEqual(club.rounds.length, 2);
  });

  test('only the admin starts a round, and not while it is active', () => {
    const club = newClub();

    assert.throws(
      () => club.startNextRound(UserId.generate(), PIRANESI, '2026-12-31', 'completed', NOW),
      NotGroupAdminError,
    );
    assert.throws(
      () => club.startNextRound(club.adminId, PIRANESI, '2026-12-31', 'active', NOW),
      RoundStillActiveError,
    );
  });
});
