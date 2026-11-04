import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IBookRepository } from '../book/book-repository.js';
import { BookId, type Book } from '../book/book.js';
import type { SystemMessages } from '../group-chat/chat-service.js';
import {
  GroupId,
  GroupName,
  type MemberJoined,
  type MemberJoinedListener,
} from '../group/group.js';
import type { IReadingStatusRepository } from '../reading-status/reading-status-repository.js';
import { ReadingStatus } from '../reading-status/reading-status.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import { BookClub, type Round, type RoundOutcome } from './book-club.js';
import type { IBookClubRepository } from './book-club-repository.js';
import type { IBookPollRepository } from './book-poll-repository.js';

export interface CreateBookClubCommand {
  userId: unknown;
  name: unknown;
  description?: unknown;
  bookId: unknown;
  deadline: unknown;
}

export interface StartRoundCommand {
  userId: unknown;
  bookId: unknown;
  deadline: unknown;
}

/** A round with its outcome at the moment it was read. */
export interface RoundView {
  round: Round;
  outcome: RoundOutcome;
  /** Expected members who finished the book in time. */
  finished: number;
  /** Members expected to finish it. */
  expected: number;
  daysLeft: number;
}

export interface BookClubView {
  club: BookClub;
  /** Every round in order; the last one is the current round. */
  rounds: RoundView[];
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Application service: one method per use case on book clubs. It also listens for
// new members, who get the round book in their library.
export class BookClubService implements MemberJoinedListener {
  constructor(
    private readonly clubs: IBookClubRepository,
    private readonly users: IUserRepository,
    private readonly books: IBookRepository,
    private readonly statuses: IReadingStatusRepository,
    private readonly polls: IBookPollRepository,
    private readonly now: Clock = () => new Date(),
    /** Posts the club's system messages in its chat (F-GRP-02 rule 5), when wired. */
    private readonly chat?: SystemMessages,
  ) {}

  /** The reader creates a club with its first book and becomes admin and first member. */
  async create(command: CreateBookClubCommand): Promise<BookClubView> {
    const adminId = UserId.of(command.userId);
    const admin = await this.users.findById(adminId);
    if (!admin) throw new NotFoundError('User');
    const book = await this.book(command.bookId);
    const now = this.now();

    const club = BookClub.create(
      {
        adminId,
        name: GroupName.of(command.name),
        description: typeof command.description === 'string' ? command.description : null,
        bookId: book.id,
        deadline: command.deadline,
      },
      now,
    );
    await this.clubs.save(club);
    await this.addToLibrary(adminId, book.id);
    await this.chat?.postSystem(
      club.id,
      `${admin.displayName} started ${club.name.value}. Round 1: ${book.title.value}, closes ${formatDay(club.currentRound.period.deadline)}.`,
    );
    return this.view(club);
  }

  async get(id: unknown): Promise<BookClubView> {
    return this.view(await this.load(id));
  }

  async forMember(userId: unknown): Promise<BookClubView[]> {
    const clubs = await this.clubs.findByMember(UserId.of(userId));
    return Promise.all(clubs.map((club) => this.view(club)));
  }

  /**
   * The admin selects the next book once the round is over. The book goes to every
   * member's library and the open vote, if any, is settled.
   */
  async startNextRound(id: unknown, command: StartRoundCommand): Promise<BookClubView> {
    const club = await this.load(id);
    const by = UserId.of(command.userId);
    const book = await this.book(command.bookId);
    const now = this.now();
    const current = await this.roundView(club, club.currentRound, now);

    const round = club.startNextRound(by, book.id, command.deadline, current.outcome, now);
    await this.clubs.save(club);

    const poll = await this.polls.findCurrent(club.id);
    if (poll) {
      poll.close(now);
      await this.polls.save(poll);
    }
    for (const m of club.members) await this.addToLibrary(m.userId, book.id);
    const admin = await this.users.findById(by);
    const who = admin ? `admin ${admin.displayName}` : 'the admin';
    await this.chat?.postSystem(
      club.id,
      `${book.title.value} was selected by ${who}. Round ${round.number} closes ${formatDay(round.period.deadline)}.`,
    );
    return this.view(club);
  }

  async memberJoined(event: MemberJoined): Promise<void> {
    const club = await this.clubs.findById(event.groupId);
    if (club) await this.addToLibrary(event.userId, club.currentRound.bookId);
  }

  private async view(club: BookClub): Promise<BookClubView> {
    const now = this.now();
    const rounds = await Promise.all(club.rounds.map((r) => this.roundView(club, r, now)));
    return { club, rounds };
  }

  private async roundView(club: BookClub, round: Round, now: Date): Promise<RoundView> {
    const finishedAt = new Map<string, Date>();
    for (const m of club.members) {
      const status = await this.statuses.findByUserAndBook(m.userId, round.bookId);
      if (status?.status === 'finished') finishedAt.set(m.userId.value, status.updatedAt);
    }
    const expected = round.expectedReaders(club.members);
    return {
      round,
      outcome: round.outcome(club.members, finishedAt, now),
      finished: expected.filter((m) => round.inTime(finishedAt.get(m.userId.value))).length,
      expected: expected.length,
      daysLeft: round.period.daysLeft(now),
    };
  }

  /** F-GRP-07 rule 2: the club book is added as "Not started" unless already there. */
  private async addToLibrary(userId: UserId, bookId: BookId): Promise<void> {
    if (await this.statuses.findByUserAndBook(userId, bookId)) return;
    await this.statuses.save(ReadingStatus.create(userId, bookId));
  }

  private async book(raw: unknown): Promise<Book> {
    const book = await this.books.findById(BookId.of(raw));
    if (!book) throw new NotFoundError('Book');
    return book;
  }

  private async load(id: unknown): Promise<BookClub> {
    const club = await this.clubs.findById(GroupId.of(id));
    if (!club) throw new NotFoundError('Book club');
    return club;
  }
}
