import { createHash } from 'node:crypto';
import { eq, inArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  authors,
  bookAuthors,
  bookClubPolls,
  bookClubProposals,
  bookClubRounds,
  bookClubs,
  bookClubVotes,
  books,
  bookTags,
  challenges,
  friendships,
  groupInvites,
  groupMessages,
  groups,
  listBooks,
  lists,
  member,
  readingSessions,
  readingStatus,
  reviews,
  users,
  userTags,
} from '../schema.js';
import {
  BOOKS,
  CHALLENGE_MESSAGES,
  CHALLENGES,
  CLUBS,
  FOLDERS,
  FRIENDSHIPS,
  LIBRARY,
  PENDING_INVITES,
  READERS,
  REVIEWS,
  RUNNING_SESSION,
  SESSIONS,
  TAGS,
  type BookKey,
  type ReaderKey,
} from './seed-data.js';

type Db = NodePgDatabase;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** The seed account of each reader: its Supabase Auth id and email. */
export type SeedAccounts = Record<ReaderKey, { id: string; email: string }>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A UUID derived from a name, so each seeded row keeps the same id on every run. */
export function stableId(name: string): string {
  const hex = createHash('sha1').update(`bookmarked-seed:${name}`).digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Fails early on a typo: the API refuses to read a book whose ISBN-13 check digit is wrong. */
function assertIsbn13(isbn: string): void {
  const sum = [...isbn].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  if (!/^\d{13}$/.test(isbn) || sum % 10 !== 0) throw new Error(`Invalid seed ISBN-13: ${isbn}`);
}

/** Dates relative to `now`, in the local time zone the seed runs in. */
class Clock {
  constructor(readonly now: Date) {}

  /** `days` ago at `hour`:00, but never later than `now` minus `minutes` (for today). */
  at(days: number, hour = 20, minutes = 0): Date {
    const day = new Date(this.now.getTime() - days * DAY_MS);
    day.setHours(hour, 0, 0, 0);
    const latest = this.now.getTime() - (minutes + 5) * 60_000;
    return day.getTime() > latest ? new Date(latest) : day;
  }

  /** The calendar date `days` from today (negative = in the past), as YYYY-MM-DD. */
  date(daysFromToday: number): string {
    const day = new Date(this.now.getTime() + daysFromToday * DAY_MS);
    const month = String(day.getMonth() + 1).padStart(2, '0');
    return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, '0')}`;
  }

  iso(days: number, hour = 20): string {
    return this.at(days, hour).toISOString();
  }
}

/**
 * Writes the seed's story for these accounts. The seed accounts' previous data (their
 * rows and the groups they run) is deleted first, so dates stay relative to today.
 * Books are shared and only added when missing.
 */
export async function populate(db: Db, accounts: SeedAccounts, now = new Date()): Promise<void> {
  const clock = new Clock(now);
  const userId = (key: ReaderKey) => accounts[key].id;

  await db.transaction(async (tx) => {
    await clearSeedAccounts(tx, accounts);
    const seeded = await seedBooks(tx);
    const book = (key: BookKey) => seeded.get(key)!.id;

    await tx.insert(users).values(
      READERS.map((reader) => ({
        id: userId(reader.key),
        email: accounts[reader.key].email,
        username: reader.username,
        displayName: reader.displayName,
        bio: reader.bio,
        timezone: 'Europe/Lisbon',
        profileVisibility: reader.visibility,
        createdAt: clock.iso(180 - READERS.indexOf(reader) * 10, 10),
        currentStreak: reader.currentStreak,
        longestStreak: reader.longestStreak,
        hitStreak: reader.currentStreak > 0,
      })),
    );

    await tx.insert(readingStatus).values(
      LIBRARY.map((entry) => ({
        id: stableId(`status:${entry.reader}:${entry.book}`),
        userId: userId(entry.reader),
        bookId: book(entry.book),
        status: entry.status,
        // A finished book is at its last page; no page may pass the stored page count.
        currentPage:
          entry.status === 'finished'
            ? seeded.get(entry.book)!.pages
            : Math.min(entry.page, seeded.get(entry.book)!.pages),
        startedOn: entry.startedDaysAgo === undefined ? null : clock.date(-entry.startedDaysAgo),
        finishedOn: entry.finishedDaysAgo === undefined ? null : clock.date(-entry.finishedDaysAgo),
        createdAt: clock.iso(entry.addedDaysAgo, 9),
        updatedAt: clock.iso(entry.updatedDaysAgo, 22),
      })),
    );

    await tx.insert(readingSessions).values([
      ...SESSIONS.map(([reader, bookKey, days, minutes, pages], i) => {
        const startedAt = clock.at(days, 20, minutes);
        return {
          id: stableId(`session:${reader}:${i}`),
          userId: userId(reader),
          bookId: book(bookKey),
          startedAt: startedAt.toISOString(),
          endedAt: new Date(startedAt.getTime() + minutes * 60_000).toISOString(),
          durationSeconds: minutes * 60,
          countedMinutes: minutes,
          pagesRead: pages,
          createdAt: startedAt.toISOString(),
        };
      }),
      {
        id: stableId('session:running'),
        userId: userId(RUNNING_SESSION.reader),
        bookId: book(RUNNING_SESSION.book),
        startedAt: new Date(now.getTime() - RUNNING_SESSION.minutesAgo * 60_000).toISOString(),
        endedAt: null,
      },
    ]);

    await tx.insert(friendships).values(
      FRIENDSHIPS.map(([requester, addressee, status, days]) => ({
        id: stableId(`friendship:${requester}:${addressee}`),
        requesterId: userId(requester),
        addresseeId: userId(addressee),
        status,
        createdAt: clock.iso(days, 18),
        respondedAt: status === 'accepted' ? clock.iso(days - 0.5, 19) : null,
      })),
    );

    for (const challenge of CHALLENGES) {
      const groupId = stableId(`group:${challenge.key}`);
      const joined = clock.iso(Math.max(1, -challenge.startInDays + 5), 12);
      await tx.insert(groups).values({
        id: groupId,
        name: challenge.name,
        description: challenge.description,
        kind: 'challenge',
        adminId: userId(challenge.admin),
        createdAt: joined,
      });
      await tx.insert(member).values(
        challenge.members.map((m) => ({
          groupId,
          userId: userId(m),
          role: m === challenge.admin ? 'admin' : 'member',
          joinedAt: joined,
        })),
      );
      await tx.insert(challenges).values({
        groupId,
        startDate: clock.date(challenge.startInDays),
        endDate: clock.date(challenge.startInDays + challenge.durationDays - 1),
        winMetric: challenge.metric,
        metricGoal: 0,
      });
      await insertMessages(
        tx,
        clock,
        groupId,
        challenge.key,
        CHALLENGE_MESSAGES[challenge.key] ?? [],
        userId,
      );
    }

    for (const club of CLUBS) {
      const groupId = stableId(`group:${club.key}`);
      const firstStart = club.rounds[0]!.startInDays;
      const joined = clock.iso(-firstStart + 5, 12);
      const current = club.rounds[club.rounds.length - 1]!;
      await tx.insert(groups).values({
        id: groupId,
        name: club.name,
        description: club.description,
        kind: 'book-club',
        adminId: userId(club.admin),
        createdAt: joined,
      });
      await tx.insert(member).values(
        club.members.map((m) => ({
          groupId,
          userId: userId(m),
          role: m === club.admin ? 'admin' : 'member',
          joinedAt: joined,
        })),
      );
      await tx.insert(bookClubs).values({ groupId, currentBookId: book(current.book) });
      await tx.insert(bookClubRounds).values(
        club.rounds.map((round, i) => ({
          id: stableId(`round:${club.key}:${i + 1}`),
          bookClubId: groupId,
          roundNumber: i + 1,
          bookId: book(round.book),
          start: clock.date(round.startInDays),
          deadline: clock.date(round.deadlineInDays),
          createdAt: clock.iso(-round.startInDays, 10),
        })),
      );

      if (club.poll) {
        const pollId = stableId(`poll:${club.key}`);
        await tx.insert(bookClubPolls).values({
          id: pollId,
          groupId,
          closesAt: new Date(now.getTime() + club.poll.closesInDays * DAY_MS).toISOString(),
          anonymous: club.poll.anonymous,
          createdAt: clock.iso(2, 18),
        });
        const proposalIds = club.poll.proposals.map((_, i) =>
          stableId(`proposal:${club.key}:${i}`),
        );
        await tx.insert(bookClubProposals).values(
          club.poll.proposals.map((p, i) => ({
            id: proposalIds[i]!,
            pollId,
            bookId: book(p.book),
            proposedBy: userId(p.by),
            createdAt: clock.iso(2, 19),
          })),
        );
        await tx.insert(bookClubVotes).values(
          club.poll.votes.map(([voter, index]) => ({
            pollId,
            userId: userId(voter),
            proposalId: proposalIds[index]!,
            castAt: clock.iso(1, 21),
          })),
        );
      }

      await insertMessages(tx, clock, groupId, club.key, club.messages, userId);
    }

    await tx.insert(groupInvites).values(
      PENDING_INVITES.map(([inviter, invitee, groupKey]) => ({
        id: stableId(`invite:${groupKey}:${invitee}`),
        groupId: stableId(`group:${groupKey}`),
        inviteeId: userId(invitee),
        inviterId: userId(inviter),
        createdAt: clock.iso(1, 17),
      })),
    );

    await tx.insert(reviews).values(
      REVIEWS.map(([reader, bookKey, rating, comment, days]) => ({
        id: stableId(`review:${reader}:${bookKey}`),
        userId: userId(reader),
        bookId: book(bookKey),
        rating,
        comment,
        createdAt: clock.iso(days, 21),
        updatedAt: clock.iso(days, 21),
      })),
    );

    for (const [reader, name, bookKeys] of FOLDERS) {
      const listId = stableId(`folder:${reader}:${name}`);
      await tx
        .insert(lists)
        .values({ id: listId, userId: userId(reader), name, visibility: 'private' });
      await tx.insert(listBooks).values(bookKeys.map((key) => ({ listId, bookId: book(key) })));
    }

    for (const [reader, name, bookKeys] of TAGS) {
      const tagId = stableId(`tag:${reader}:${name}`);
      await tx.insert(userTags).values({ id: tagId, userId: userId(reader), name });
      await tx.insert(bookTags).values(bookKeys.map((key) => ({ tagId, bookId: book(key) })));
    }
  });
}

/**
 * Removes what the seed accounts own, including rows left by an earlier run whose
 * Supabase account was recreated (matched by email or username).
 */
async function clearSeedAccounts(tx: Tx, accounts: SeedAccounts): Promise<void> {
  const ids = Object.values(accounts).map((a) => a.id);
  const emails = Object.values(accounts).map((a) => a.email);
  const usernames = READERS.map((r) => r.username);
  const owners = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      or(inArray(users.id, ids), inArray(users.email, emails), inArray(users.username, usernames)),
    );
  const ownerIds = owners.map((o) => o.id);
  if (ownerIds.length === 0) return;
  // groups.admin_id does not cascade, so the groups they run go first.
  await tx.delete(groups).where(inArray(groups.adminId, ownerIds));
  await tx.delete(users).where(inArray(users.id, ownerIds));
}

/**
 * Adds the seed books that are missing, reusing a book that already has the same ISBN
 * (e.g. imported from Open Library), and links their authors. Returns each book's id.
 */
async function seedBooks(tx: Tx): Promise<Map<BookKey, { id: string; pages: number }>> {
  const ids = new Map<BookKey, { id: string; pages: number }>();
  for (const seed of BOOKS) {
    assertIsbn13(seed.isbn13);
    const coverUrl = `https://covers.openlibrary.org/b/id/${seed.coverId}-L.jpg`;
    const [existing] = await tx
      .select({ id: books.id, pageCount: books.pageCount })
      .from(books)
      .where(
        seed.id
          ? or(eq(books.id, seed.id), eq(books.isbn13, seed.isbn13))
          : eq(books.isbn13, seed.isbn13),
      )
      .limit(1);
    const id = existing?.id ?? seed.id ?? stableId(`book:${seed.key}`);
    if (!existing) {
      await tx.insert(books).values({
        id,
        title: seed.title,
        description: seed.description,
        isbn13: seed.isbn13,
        pageCount: seed.pageCount,
        coverUrl,
        isCommunityAdded: false,
      });
    } else if (existing.id === seed.id) {
      // One of the first seed's books: refresh its cover and description. The page count
      // stays, since lowering it could put a real reader past the last page.
      await tx
        .update(books)
        .set({ coverUrl, description: seed.description })
        .where(eq(books.id, id));
    }
    ids.set(seed.key, { id, pages: existing?.pageCount ?? seed.pageCount });

    const linked = await tx
      .select({ id: bookAuthors.authorId })
      .from(bookAuthors)
      .where(eq(bookAuthors.bookId, id))
      .limit(1);
    if (linked.length > 0) continue;
    for (const name of seed.authors) {
      // authors.name is not unique, so look it up first (like the book repository).
      const [found] = await tx
        .select({ id: authors.id })
        .from(authors)
        .where(eq(authors.name, name))
        .limit(1);
      const authorId =
        found?.id ??
        (await tx.insert(authors).values({ name }).returning({ id: authors.id }))[0]!.id;
      await tx.insert(bookAuthors).values({ bookId: id, authorId }).onConflictDoNothing();
    }
  }
  return ids;
}

async function insertMessages(
  tx: Tx,
  clock: Clock,
  groupId: string,
  groupKey: string,
  messages: readonly [ReaderKey | null, string, number][],
  userId: (key: ReaderKey) => string,
): Promise<void> {
  // One by one, oldest first, so `seq` (the chat order) follows the time.
  for (const [i, [author, body, hoursAgo]] of messages.entries()) {
    await tx.insert(groupMessages).values({
      id: stableId(`message:${groupKey}:${i}`),
      groupId,
      authorId: author ? userId(author) : null,
      clientId: author ? stableId(`message-client:${groupKey}:${i}`) : null,
      kind: author ? 'text' : 'system',
      body,
      createdAt: new Date(clock.now.getTime() - hoursAgo * 3_600_000).toISOString(),
    });
  }
}
