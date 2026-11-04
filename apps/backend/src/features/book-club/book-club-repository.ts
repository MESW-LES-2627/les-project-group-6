import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bookClubRounds, bookClubs, groups, member } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { GroupId, GroupName, memberRoleOf } from '../group/group.js';
import { UserId } from '../user/user.js';
import { BookClub, Round, RoundId, RoundPeriod } from './book-club.js';

export interface IBookClubRepository {
  findById(id: GroupId): Promise<BookClub | null>;
  findByMember(userId: UserId): Promise<BookClub[]>;
  /** Stores a new club or its new rounds, all or nothing. Members join through the roster. */
  save(club: BookClub): Promise<void>;
}

type GroupRow = typeof groups.$inferSelect;
type MemberRow = typeof member.$inferSelect;
type RoundRow = typeof bookClubRounds.$inferSelect;

// Data Mapper: the aggregate spans the groups, member, book_clubs and book_club_rounds tables.
function toDomain(row: GroupRow, members: MemberRow[], rounds: RoundRow[]): BookClub {
  return BookClub.reconstitute({
    id: GroupId.of(row.id),
    name: GroupName.of(row.name),
    description: row.description,
    adminId: UserId.of(row.adminId),
    members: members.map((m) => ({
      userId: UserId.of(m.userId),
      role: memberRoleOf(m.role),
      joinedAt: new Date(m.joinedAt),
    })),
    rounds: rounds.map((r) =>
      Round.reconstitute({
        id: RoundId.of(r.id),
        number: r.roundNumber,
        bookId: BookId.of(r.bookId),
        period: RoundPeriod.of(r.start, r.deadline),
        createdAt: new Date(r.createdAt),
      }),
    ),
    createdAt: new Date(row.createdAt),
  });
}

export class DrizzleBookClubRepository implements IBookClubRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: GroupId): Promise<BookClub | null> {
    const found = await this.load([id.value]);
    return found[0] ?? null;
  }

  async findByMember(userId: UserId): Promise<BookClub[]> {
    const rows = await this.db
      .select({ groupId: member.groupId })
      .from(member)
      .innerJoin(bookClubs, eq(bookClubs.groupId, member.groupId))
      .where(eq(member.userId, userId.value));
    return this.load(rows.map((r) => r.groupId));
  }

  async save(club: BookClub): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(groups)
        .values({
          id: club.id.value,
          name: club.name.value,
          description: club.description,
          adminId: club.adminId.value,
          createdAt: club.createdAt.toISOString(),
        })
        .onConflictDoUpdate({
          target: groups.id,
          set: { name: club.name.value, description: club.description },
        });
      await tx
        .insert(member)
        .values(
          club.members.map((m) => ({
            groupId: club.id.value,
            userId: m.userId.value,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
          })),
        )
        .onConflictDoNothing();
      await tx
        .insert(bookClubs)
        .values({ groupId: club.id.value, currentBookId: club.currentRound.bookId.value })
        .onConflictDoUpdate({
          target: bookClubs.groupId,
          set: { currentBookId: club.currentRound.bookId.value },
        });
      // Rounds are never edited, so only the new ones are inserted.
      await tx
        .insert(bookClubRounds)
        .values(
          club.rounds.map((r) => ({
            id: r.id.value,
            bookClubId: club.id.value,
            roundNumber: r.number,
            bookId: r.bookId.value,
            start: r.period.startDate,
            deadline: r.period.deadline,
            createdAt: r.createdAt.toISOString(),
          })),
        )
        .onConflictDoNothing();
    });
  }

  private async load(ids: string[]): Promise<BookClub[]> {
    if (ids.length === 0) return [];

    const [groupRows, memberRows, roundRows] = await Promise.all([
      this.db
        .select({ group: groups })
        .from(groups)
        .innerJoin(bookClubs, eq(bookClubs.groupId, groups.id))
        .where(inArray(groups.id, ids))
        .orderBy(desc(groups.createdAt)),
      this.db
        .select()
        .from(member)
        .where(inArray(member.groupId, ids))
        .orderBy(asc(member.joinedAt)),
      this.db
        .select()
        .from(bookClubRounds)
        .where(inArray(bookClubRounds.bookClubId, ids))
        .orderBy(asc(bookClubRounds.roundNumber)),
    ]);

    return groupRows.map(({ group }) =>
      toDomain(
        group,
        memberRows.filter((m) => m.groupId === group.id),
        roundRows.filter((r) => r.bookClubId === group.id),
      ),
    );
  }
}
