import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IBookRepository } from '../book/book-repository.js';
import { BookId } from '../book/book.js';
import { ChatMessage } from '../group-chat/chat-message.js';
import type { IChatRepository } from '../group-chat/chat-repository.js';
import { GroupId } from '../group/group.js';
import { UserId } from '../user/user.js';
import type { BookClub } from './book-club.js';
import type { IBookClubRepository } from './book-club-repository.js';
import { BookPoll, PollRuleError, ProposalId } from './book-poll.js';
import type { IBookPollRepository } from './book-poll-repository.js';

export interface OpenPollCommand {
  userId: unknown;
  closesAt: unknown;
  anonymous?: unknown;
}

// Application service: the vote on a club's next book (F-GRP-08).
export class BookPollService {
  constructor(
    private readonly polls: IBookPollRepository,
    private readonly clubs: IBookClubRepository,
    private readonly books: IBookRepository,
    private readonly chat: IChatRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  /** The admin opens a vote; an earlier vote whose time ran out is settled first. */
  async open(groupId: unknown, command: OpenPollCommand): Promise<BookPoll> {
    const club = await this.club(groupId);
    const now = this.now();
    const poll = BookPoll.open(
      club,
      UserId.of(command.userId),
      command.closesAt,
      command.anonymous,
      now,
    );

    const previous = await this.polls.findCurrent(club.id);
    if (previous?.statusAt(now) === 'open') throw new PollRuleError('A vote is already open');
    if (previous) {
      previous.close(now);
      await this.polls.save(previous);
    }
    await this.polls.save(poll);
    await this.chat.add(
      ChatMessage.system(
        club.id,
        'Voting for the next book is open. Propose a title and vote.',
        now,
      ),
    );
    return poll;
  }

  async propose(groupId: unknown, userId: unknown, bookId: unknown): Promise<BookPoll> {
    const club = await this.club(groupId);
    const poll = await this.current(club);
    const book = await this.books.findById(BookId.of(bookId));
    if (!book) throw new NotFoundError('Book');

    poll.propose(club, UserId.of(userId), book.id, this.now());
    await this.polls.save(poll);
    return poll;
  }

  async vote(groupId: unknown, userId: unknown, proposalId: unknown): Promise<BookPoll> {
    const club = await this.club(groupId);
    const poll = await this.current(club);
    poll.vote(club, UserId.of(userId), ProposalId.of(proposalId), this.now());
    await this.polls.save(poll);
    return poll;
  }

  /** The club's unsettled vote, or null when there is none. */
  async find(groupId: GroupId): Promise<BookPoll | null> {
    return this.polls.findCurrent(groupId);
  }

  private async current(club: BookClub): Promise<BookPoll> {
    const poll = await this.polls.findCurrent(club.id);
    if (!poll) throw new NotFoundError('Open vote');
    return poll;
  }

  private async club(groupId: unknown): Promise<BookClub> {
    const club = await this.clubs.findById(GroupId.of(groupId));
    if (!club) throw new NotFoundError('Book club');
    return club;
  }
}
