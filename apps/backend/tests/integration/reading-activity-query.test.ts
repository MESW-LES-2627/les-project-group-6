// @req F-GRP-03 F-EXP-04
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book } from '../../src/features/book/book.js';
import {
  ChallengeGroup,
  ChallengePeriod,
  WinMetric,
} from '../../src/features/challenge-group/challenge-group.js';
import { CountedMinutesScore } from '../../src/features/challenge-group/standings-query.js';
import { GroupName } from '../../src/features/group/group.js';
import { DrizzleReadingActivityQuery } from '../../src/features/reading-session/reading-activity-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ANA = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BEN = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const FROM = new Date('2026-11-01T00:00:00Z');
const TO = new Date('2026-11-08T00:00:00Z');

describe('DrizzleReadingActivityQuery Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const activity = new DrizzleReadingActivityQuery(db);
  let dune: Book;
  let emma: Book;

  const session = async (
    userId: string,
    book: Book,
    endedAt: string | null,
    minutes: number,
  ): Promise<void> => {
    await pool.query(
      `INSERT INTO reading_sessions (user_id, book_id, started_at, ended_at, duration_seconds, counted_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, book.id.value, endedAt ?? '2026-11-03T10:00:00Z', endedAt, minutes * 60, minutes],
    );
  };

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_sessions']);
    const users = new DrizzleUserRepository(db);
    const readers: [string, string][] = [
      [ANA, 'ana'],
      [BEN, 'ben'],
    ];
    for (const [id, name] of readers) {
      await users.save(
        User.register({
          id: UserId.of(id),
          email: Email.of(`${name}@example.com`),
          username: Username.of(name),
          displayName: name,
        }),
      );
    }
    dune = Book.create({ title: 'Dune', pageCount: 688 });
    emma = Book.create({ title: 'Emma', pageCount: 474 });
    const books = new DrizzleBookRepository(db);
    await books.save(dune);
    await books.save(emma);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_sessions']);
    await pool.end();
  });

  test('sums counted minutes per reader and book for sessions that ended in the window', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 30);
    await session(ANA, dune, '2026-11-03T10:00:00Z', 15);
    await session(ANA, emma, '2026-11-04T10:00:00Z', 10);
    await session(BEN, dune, '2026-11-05T10:00:00Z', 20);

    const read = await activity.countedMinutes({ userIds: [ANA, BEN], from: FROM, to: TO });
    const minutes = (userId: string, book: Book) =>
      read.find((r) => r.userId === userId && r.bookId === book.id.value)?.minutes;

    assert.equal(read.length, 3);
    assert.equal(minutes(ANA, dune), 45);
    assert.equal(minutes(ANA, emma), 10);
    assert.equal(minutes(BEN, dune), 20);
  });

  test('leaves out running sessions and sessions that ended outside the window', async () => {
    await session(ANA, dune, null, 50);
    await session(ANA, dune, '2026-10-31T23:59:59Z', 40);
    await session(ANA, dune, '2026-11-08T00:00:00Z', 30);
    await session(ANA, dune, '2026-11-01T00:00:00Z', 5);

    const read = await activity.countedMinutes({ userIds: [ANA], from: FROM, to: TO });

    assert.deepEqual(read, [{ userId: ANA, bookId: dune.id.value, minutes: 5 }]);
  });

  test('filters by book and by reader', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 30);
    await session(ANA, emma, '2026-11-02T11:00:00Z', 10);
    await session(BEN, emma, '2026-11-02T12:00:00Z', 20);

    const read = await activity.countedMinutes({
      userIds: [ANA],
      from: FROM,
      to: TO,
      bookId: emma.id.value,
    });

    assert.deepEqual(read, [{ userId: ANA, bookId: emma.id.value, minutes: 10 }]);
    assert.deepEqual(await activity.countedMinutes({ userIds: [], from: FROM, to: TO }), []);
  });

  test('challenge standings score members through the activity query, per book', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 30);
    await session(ANA, emma, '2026-11-03T10:00:00Z', 45);
    await session(ANA, emma, '2026-11-09T10:00:00Z', 99);
    const challenge = ChallengeGroup.create({
      adminId: UserId.of(ANA),
      name: GroupName.of('November'),
      period: ChallengePeriod.of('2026-11-01', '2026-11-07'),
      winMetric: WinMetric.of('minutes'),
    });

    const byUser = await new CountedMinutesScore(db).byBook(challenge, [ANA, BEN]);

    assert.deepEqual(byUser.get(ANA), [
      { bookId: emma.id.value, title: 'Emma', minutes: 45 },
      { bookId: dune.id.value, title: 'Dune', minutes: 30 },
    ]);
    assert.equal(byUser.get(BEN), undefined);
  });
  test('ranks books by counted minutes of all readers in the window', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 30);
    await session(BEN, dune, '2026-11-03T10:00:00Z', 20);
    await session(ANA, emma, '2026-11-04T10:00:00Z', 40);
    await session(BEN, emma, null, 90);
    await session(BEN, emma, '2026-10-31T10:00:00Z', 90);

    const top = await activity.topBooks({ from: FROM, to: TO, limit: 10 });

    assert.deepEqual(top, [
      { bookId: dune.id.value, minutes: 50 },
      { bookId: emma.id.value, minutes: 40 },
    ]);
  });

  test('topBooks keeps only books with minutes and caps the list', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 0);
    await session(ANA, emma, '2026-11-02T11:00:00Z', 5);

    assert.deepEqual(await activity.topBooks({ from: FROM, to: TO, limit: 10 }), [
      { bookId: emma.id.value, minutes: 5 },
    ]);
    assert.equal((await activity.topBooks({ from: FROM, to: TO, limit: 0 })).length, 0);
  });
});
