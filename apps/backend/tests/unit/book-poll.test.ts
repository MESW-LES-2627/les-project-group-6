import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BookId } from '../../src/features/book/book.js';
import { BookClub } from '../../src/features/book-club/book-club.js';
import { BookPoll, PollRuleError, ProposalId } from '../../src/features/book-club/book-poll.js';
import {
  GroupName,
  NotGroupAdminError,
  NotGroupMemberError,
} from '../../src/features/group/group.js';
import { UserId } from '../../src/features/user/user.js';
import { InvalidValueError, NotFoundError } from '../../src/utils/errors.js';

const NOW = new Date('2026-11-04T10:00:00Z');
const CLOSES = '2026-11-25T18:00:00Z';
const EMMA = BookId.generate();
const PIRANESI = BookId.generate();
const JANE_EYRE = BookId.generate();
const ADMIN = UserId.generate();
const FRIEND = UserId.generate();

const created = BookClub.create(
  { adminId: ADMIN, name: GroupName.of('Classics'), bookId: EMMA, deadline: '2026-11-30' },
  NOW,
);
const club = BookClub.reconstitute({
  id: created.id,
  name: created.name,
  description: '',
  adminId: ADMIN,
  members: [...created.members, { userId: FRIEND, role: 'member', joinedAt: NOW }],
  rounds: [...created.rounds],
  createdAt: NOW,
});

const openPoll = () => BookPoll.open(club, ADMIN, CLOSES, false, NOW);

describe('BookPoll', () => {
  test('only the admin opens a vote, and it must close in the future', () => {
    assert.throws(() => BookPoll.open(club, FRIEND, CLOSES, true, NOW), NotGroupAdminError);
    assert.throws(
      () => BookPoll.open(club, ADMIN, '2026-11-01T00:00:00Z', true, NOW),
      InvalidValueError,
    );
    assert.throws(() => BookPoll.open(club, ADMIN, 'soon', true, NOW), InvalidValueError);
    assert.strictEqual(BookPoll.open(club, ADMIN, CLOSES, undefined, NOW).anonymous, true);
    assert.strictEqual(openPoll().statusAt(NOW), 'open');
  });

  test('each member proposes one book, never the current one and never twice', () => {
    const poll = openPoll();
    poll.propose(club, FRIEND, PIRANESI, NOW);

    assert.throws(() => poll.propose(club, FRIEND, JANE_EYRE, NOW), PollRuleError);
    assert.throws(() => poll.propose(club, ADMIN, PIRANESI, NOW), PollRuleError);
    assert.throws(() => poll.propose(club, ADMIN, EMMA, NOW), PollRuleError);
    assert.throws(() => poll.propose(club, UserId.generate(), JANE_EYRE, NOW), NotGroupMemberError);
    assert.strictEqual(poll.proposals.length, 1);
  });

  test('one vote per member; voting again moves it', () => {
    const poll = openPoll();
    const piranesi = poll.propose(club, FRIEND, PIRANESI, NOW);
    const eyre = poll.propose(club, ADMIN, JANE_EYRE, NOW);

    poll.vote(club, ADMIN, piranesi.id, NOW);
    poll.vote(club, ADMIN, eyre.id, NOW);
    poll.vote(club, FRIEND, eyre.id, NOW);

    assert.strictEqual(poll.votesFor(piranesi.id), 0);
    assert.strictEqual(poll.votesFor(eyre.id), 2);
    assert.ok(poll.voteOf(ADMIN)?.equals(eyre.id));
    assert.throws(() => poll.vote(club, ADMIN, ProposalId.generate(), NOW), NotFoundError);
  });

  test('nothing changes after the closing time or once the admin settled it', () => {
    const poll = openPoll();
    const proposal = poll.propose(club, FRIEND, PIRANESI, NOW);
    const after = new Date('2026-11-26T00:00:00Z');

    assert.strictEqual(poll.statusAt(after), 'closed');
    assert.throws(() => poll.vote(club, ADMIN, proposal.id, after), PollRuleError);

    poll.close(NOW);
    assert.strictEqual(poll.statusAt(NOW), 'closed');
    assert.throws(() => poll.propose(club, ADMIN, JANE_EYRE, NOW), PollRuleError);
  });
});
