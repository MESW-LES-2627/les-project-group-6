import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { RoundStillActiveError } from '../../src/features/book-club/book-club.js';
import { BookClubService } from '../../src/features/book-club/book-club-service.js';
import { PollRuleError } from '../../src/features/book-club/book-poll.js';
import { BookPollService } from '../../src/features/book-club/book-poll-service.js';
import { InvalidGroupNameError } from '../../src/features/group/group.js';
import { PageProgress, ReadingState } from '../../src/features/reading-status/reading-state.js';
import {
  ReadingStatus,
  ReadingStatusId,
} from '../../src/features/reading-status/reading-status.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookClubRepository,
  InMemoryBookPollRepository,
  InMemoryBookRepository,
  InMemoryReadingStatusRepository,
  InMemoryUserRepository,
  RecordingSystemMessages,
} from '../helpers/in-memory-repositories.js';

const ADMIN = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const MAYA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01');

describe('BookClubService and BookPollService', () => {
  let now: Date;
  let books: InMemoryBookRepository;
  let statuses: InMemoryReadingStatusRepository;
  let chat: RecordingSystemMessages;
  let clubs: BookClubService;
  let polls: BookPollService;
  let emma: Book;
  let piranesi: Book;

  const form = () => ({
    userId: ADMIN.value,
    name: 'Classics',
    bookId: emma.id.value,
    deadline: '2026-11-30',
  });

  /** The reader marked the book as finished at the current time. */
  const finish = (userId: UserId, book: Book) =>
    statuses.save(
      ReadingStatus.reconstitute({
        id: ReadingStatusId.generate(),
        userId,
        bookId: book.id,
        state: ReadingState.of('finished'),
        progress: PageProgress.zero(),
        updatedAt: now,
      }),
    );

  beforeEach(async () => {
    now = new Date('2026-11-04T10:00:00Z');
    const clock = () => now;
    const users = new InMemoryUserRepository();
    await users.save(
      User.register({
        id: ADMIN,
        email: Email.of('demo@bookmarked.app'),
        username: Username.of('demo_reader'),
        displayName: 'Demo Reader',
      }),
    );
    books = new InMemoryBookRepository();
    emma = Book.create({ title: 'Emma', pageCount: 474 });
    piranesi = Book.create({ title: 'Piranesi', pageCount: 272 });
    await books.save(emma);
    await books.save(piranesi);
    statuses = new InMemoryReadingStatusRepository();
    chat = new RecordingSystemMessages();
    const clubRepo = new InMemoryBookClubRepository();
    const pollRepo = new InMemoryBookPollRepository();
    clubs = new BookClubService(clubRepo, users, books, statuses, pollRepo, clock, chat);
    polls = new BookPollService(pollRepo, clubRepo, books, clock, chat);
  });

  test('creating a club adds the book to the library and announces round 1', async () => {
    const { club, rounds } = await clubs.create(form());

    assert.strictEqual(club.name.value, 'Classics');
    assert.strictEqual(rounds[0]!.outcome, 'active');
    assert.strictEqual(rounds[0]!.daysLeft, 27);
    const status = await statuses.findByUserAndBook(ADMIN, emma.id);
    assert.strictEqual(status?.status, 'not-started');
    assert.match(chat.texts[0]!, /Demo Reader started Classics\. Round 1: Emma/);
    assert.strictEqual((await clubs.forMember(ADMIN.value)).length, 1);
  });

  test('a book already in the library keeps its status', async () => {
    await finish(ADMIN, emma);
    const { rounds } = await clubs.create(form());

    assert.strictEqual((await statuses.findByUserAndBook(ADMIN, emma.id))?.status, 'finished');
    assert.strictEqual(rounds[0]!.outcome, 'completed');
  });

  test('rejects an unknown book or reader, and a bad name', async () => {
    await assert.rejects(
      clubs.create({ ...form(), bookId: Book.create({ title: 'X' }).id.value }),
      NotFoundError,
    );
    await assert.rejects(clubs.create({ ...form(), userId: MAYA.value }), NotFoundError);
    await assert.rejects(clubs.create({ ...form(), name: ' ' }), InvalidGroupNameError);
  });

  test('the next round starts once everyone finished, and settles the vote', async () => {
    const { club } = await clubs.create(form());
    await polls.open(club.id.value, { userId: ADMIN.value, closesAt: '2026-11-25T18:00:00Z' });
    await polls.propose(club.id.value, ADMIN.value, piranesi.id.value);

    const next = { userId: ADMIN.value, bookId: piranesi.id.value, deadline: '2026-12-31' };
    await assert.rejects(clubs.startNextRound(club.id.value, next), RoundStillActiveError);

    await finish(ADMIN, emma);
    const { rounds } = await clubs.startNextRound(club.id.value, next);

    assert.deepStrictEqual(
      rounds.map((r) => [r.round.number, r.outcome]),
      [
        [1, 'completed'],
        [2, 'active'],
      ],
    );
    assert.strictEqual(await polls.find(club.id), null);
    assert.ok(await statuses.findByUserAndBook(ADMIN, piranesi.id));
    assert.match(chat.texts.at(-1)!, /Piranesi was selected by admin Demo Reader/);
  });

  test('the round is not completed after the deadline, and the admin can move on', async () => {
    const { club } = await clubs.create(form());
    now = new Date('2026-12-01T00:00:00Z');

    const view = await clubs.get(club.id.value, ADMIN.value);
    assert.strictEqual(view.rounds[0]!.outcome, 'not-completed');

    const next = { userId: ADMIN.value, bookId: piranesi.id.value, deadline: '2026-12-31' };
    assert.strictEqual((await clubs.startNextRound(club.id.value, next)).rounds.length, 2);
  });

  test('a reader who is not a member gets the club as not found', async () => {
    const { club } = await clubs.create(form());
    await assert.rejects(clubs.get(club.id.value, MAYA.value), NotFoundError);
  });

  test('a new member gets the round book in their library', async () => {
    const { club } = await clubs.create(form());
    await clubs.memberJoined({ groupId: club.id, userId: MAYA, at: now });

    assert.strictEqual((await statuses.findByUserAndBook(MAYA, emma.id))?.status, 'not-started');
  });

  test('only one vote is open at a time; an expired one is replaced', async () => {
    const { club } = await clubs.create(form());
    const first = await polls.open(club.id.value, {
      userId: ADMIN.value,
      closesAt: '2026-11-10T00:00:00Z',
    });

    await assert.rejects(
      polls.open(club.id.value, { userId: ADMIN.value, closesAt: '2026-11-20T00:00:00Z' }),
      PollRuleError,
    );

    now = new Date('2026-11-11T00:00:00Z');
    const second = await polls.open(club.id.value, {
      userId: ADMIN.value,
      closesAt: '2026-11-20T00:00:00Z',
    });
    assert.ok(first.closedAt);
    assert.ok((await polls.find(club.id))!.id.equals(second.id));
  });

  test('voting needs an open vote', async () => {
    const { club } = await clubs.create(form());
    await assert.rejects(
      polls.propose(club.id.value, ADMIN.value, piranesi.id.value),
      NotFoundError,
    );
  });
});
