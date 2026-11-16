// @req F-GRP-07 F-GRP-08
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { BookClub } from '../../src/features/book-club/book-club.js';
import { DrizzleBookClubRepository } from '../../src/features/book-club/book-club-repository.js';
import { BookPoll } from '../../src/features/book-club/book-poll.js';
import { DrizzleBookPollRepository } from '../../src/features/book-club/book-poll-repository.js';
import { ClubProgressQuery } from '../../src/features/book-club/club-progress-query.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { GroupInvite } from '../../src/features/group-invite/group-invite.js';
import { DrizzleGroupInviteRepository } from '../../src/features/group-invite/group-invite-repository.js';
import { DrizzleGroupRosterRepository } from '../../src/features/group/group-roster-repository.js';
import { GroupName } from '../../src/features/group/group.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ADMIN = UserId.of('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a71');
const MAYA = UserId.of('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a72');
const TABLES = ['users', 'books', 'reading_sessions', 'reading_status', 'friendships'];

describe('Book club repositories Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const clubs = new DrizzleBookClubRepository(db);
  const rosters = new DrizzleGroupRosterRepository(db);
  let emma: Book;
  let piranesi: Book;
  let club: BookClub;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const deadline = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    const users = new DrizzleUserRepository(db);
    for (const [id, name] of [
      [ADMIN, 'admin_reader'],
      [MAYA, 'maya_reader'],
    ] as const) {
      await users.save(
        User.register({
          id,
          email: Email.of(`${name}@example.com`),
          username: Username.of(name),
          displayName: name,
        }),
      );
    }
    const books = new DrizzleBookRepository(db);
    emma = Book.create({ title: 'Emma', pageCount: 400 });
    piranesi = Book.create({ title: 'Piranesi', pageCount: 272 });
    await books.save(emma);
    await books.save(piranesi);
    club = BookClub.create(
      { adminId: ADMIN, name: GroupName.of('Classics'), bookId: emma.id, deadline },
      now,
    );
    await clubs.save(club);
  });

  after(async () => {
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('saves a club with its rounds and loads it back', async () => {
    club.startNextRound(ADMIN, piranesi.id, deadline, 'completed', now);
    await clubs.save(club);

    const loaded = (await clubs.findById(club.id))!;
    assert.strictEqual(loaded.name.value, 'Classics');
    assert.deepStrictEqual(
      loaded.rounds.map((r) => [r.number, r.bookId.value, r.period.startDate]),
      [
        [1, emma.id.value, today],
        [2, piranesi.id.value, today],
      ],
    );
    assert.strictEqual((await clubs.findByMember(ADMIN)).length, 1);
    const roster = (await rosters.findById(club.id))!;
    assert.strictEqual(roster.kind, 'book-club');
    assert.ok(roster.isAdmin(ADMIN));
  });

  test('progress counts only finished sessions on the round book inside the round', async () => {
    await rosters.addMember(club.id, { userId: MAYA, role: 'member', joinedAt: now });
    const insert = (user: UserId, book: Book, endedAt: Date | null, minutes: number) =>
      pool.query(
        `INSERT INTO reading_sessions (user_id, book_id, started_at, ended_at, counted_minutes)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.value, book.id.value, now.toISOString(), endedAt?.toISOString() ?? null, minutes],
      );
    const inRound = new Date(now.getTime() + 60_000);
    await insert(ADMIN, emma, inRound, 30);
    await insert(ADMIN, emma, inRound, 12);
    await insert(ADMIN, piranesi, inRound, 50); // another book
    await insert(ADMIN, emma, new Date(now.getTime() - 3 * 86_400_000), 99); // before the round
    await insert(MAYA, emma, null, 0); // still running
    await pool.query(
      `INSERT INTO reading_status (user_id, book_id, status, current_page) VALUES
       ($1, $3, 'in-progress', 100), ($2, $3, 'finished', 400)`,
      [ADMIN.value, MAYA.value, emma.id.value],
    );

    const loaded = (await clubs.findById(club.id))!;
    const standings = await new ClubProgressQuery(db).standings(loaded, loaded.currentRound);

    assert.deepStrictEqual(
      standings.map((s) => [s.username, s.minutes, s.percent, s.finished]),
      [
        ['admin_reader', 42, 25, false],
        ['maya_reader', 0, 100, true],
      ],
    );
  });

  test('stores votes, invites and reads friends', async () => {
    const polls = new DrizzleBookPollRepository(db);
    const poll = BookPoll.open(
      club,
      ADMIN,
      new Date(now.getTime() + 86_400_000).toISOString(),
      true,
      now,
    );
    const proposal = poll.propose(club, ADMIN, piranesi.id, now);
    poll.vote(club, ADMIN, proposal.id, now);
    await polls.save(poll);
    const loadedPoll = (await polls.findCurrent(club.id))!;
    assert.strictEqual(loadedPoll.votesFor(proposal.id), 1);
    loadedPoll.close(now);
    await polls.save(loadedPoll);
    assert.strictEqual(await polls.findCurrent(club.id), null);

    await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')`,
      [MAYA.value, ADMIN.value],
    );
    const friends = new DrizzleFriendRepository(db);
    assert.ok(await friends.areFriends(ADMIN, MAYA));
    assert.deepStrictEqual(
      (await friends.friendsOf(ADMIN)).map((f) => f.username),
      ['maya_reader'],
    );

    const invites = new DrizzleGroupInviteRepository(db);
    const roster = (await rosters.findById(club.id))!;
    const invite = GroupInvite.send(roster, ADMIN, MAYA, now);
    await invites.save(invite);
    assert.ok(await invites.hasPending(club.id, MAYA));
    const [pending] = await invites.pendingFor(MAYA);
    assert.strictEqual(pending!.groupName, 'Classics');
    assert.strictEqual(pending!.inviterName, 'admin_reader');
    invite.accept(MAYA, now);
    await invites.save(invite);
    assert.strictEqual((await invites.pendingFor(MAYA)).length, 0);
  });
});
