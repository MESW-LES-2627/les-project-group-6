import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bookClubPolls, bookClubProposals, bookClubVotes } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { GroupId } from '../group/group.js';
import { UserId } from '../user/user.js';
import { BookPoll, PollId, ProposalId } from './book-poll.js';

export interface IBookPollRepository {
  /** The latest poll the admin has not settled by starting a round, if any. */
  findCurrent(groupId: GroupId): Promise<BookPoll | null>;
  save(poll: BookPoll): Promise<void>;
}

export class DrizzleBookPollRepository implements IBookPollRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findCurrent(groupId: GroupId): Promise<BookPoll | null> {
    const polls = await this.db
      .select()
      .from(bookClubPolls)
      .where(and(eq(bookClubPolls.groupId, groupId.value), isNull(bookClubPolls.closedAt)))
      .orderBy(desc(bookClubPolls.createdAt))
      .limit(1);
    const poll = polls[0];
    if (!poll) return null;

    const proposals = await this.db
      .select()
      .from(bookClubProposals)
      .where(eq(bookClubProposals.pollId, poll.id))
      .orderBy(bookClubProposals.createdAt);
    const votes =
      proposals.length === 0
        ? []
        : await this.db
            .select()
            .from(bookClubVotes)
            .where(
              inArray(
                bookClubVotes.proposalId,
                proposals.map((p) => p.id),
              ),
            );

    return BookPoll.reconstitute({
      id: PollId.of(poll.id),
      groupId,
      closesAt: new Date(poll.closesAt),
      anonymous: poll.anonymous,
      proposals: proposals.map((p) => ({
        id: ProposalId.of(p.id),
        bookId: BookId.of(p.bookId),
        proposedBy: UserId.of(p.proposedBy),
        createdAt: new Date(p.createdAt),
      })),
      votes: votes.map((v) => ({
        userId: UserId.of(v.userId),
        proposalId: ProposalId.of(v.proposalId),
        castAt: new Date(v.castAt),
      })),
      createdAt: new Date(poll.createdAt),
      closedAt: poll.closedAt ? new Date(poll.closedAt) : null,
    });
  }

  async save(poll: BookPoll): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(bookClubPolls)
        .values({
          id: poll.id.value,
          groupId: poll.groupId.value,
          closesAt: poll.closesAt.toISOString(),
          anonymous: poll.anonymous,
          createdAt: poll.createdAt.toISOString(),
          closedAt: poll.closedAt?.toISOString() ?? null,
        })
        .onConflictDoUpdate({
          target: bookClubPolls.id,
          set: { closedAt: poll.closedAt?.toISOString() ?? null },
        });
      if (poll.proposals.length > 0) {
        await tx
          .insert(bookClubProposals)
          .values(
            poll.proposals.map((p) => ({
              id: p.id.value,
              pollId: poll.id.value,
              bookId: p.bookId.value,
              proposedBy: p.proposedBy.value,
              createdAt: p.createdAt.toISOString(),
            })),
          )
          .onConflictDoNothing();
      }
      // A member's vote can move, so the poll's votes are replaced as a whole.
      await tx.delete(bookClubVotes).where(eq(bookClubVotes.pollId, poll.id.value));
      if (poll.votes.length > 0) {
        await tx.insert(bookClubVotes).values(
          poll.votes.map((v) => ({
            pollId: poll.id.value,
            userId: v.userId.value,
            proposalId: v.proposalId.value,
            castAt: v.castAt.toISOString(),
          })),
        );
      }
    });
  }
}
