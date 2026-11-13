import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleCircleQuery } from '../../src/features/circle/circle-query.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ME = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const MAYA = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const JONAH = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03';
const SOFIA = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04';
const DUNE = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const EMMA = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const CIRCE = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03';
const SPRINT = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const CLASSICS = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const OUTSIDERS = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03';

const TABLES = [
  'group_messages',
  'member',
  'groups',
  'reading_sessions',
  'reading_status',
  'friendships',
  'books',
  'users',
];

describe('Circle API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    friendRepository: new DrizzleFriendRepository(db),
    circleQuery: new DrizzleCircleQuery(db),
  });

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    for (const [id, username, displayName] of [
      [ME, 'eleanor', 'Eleanor Reader'],
      [MAYA, 'maya', 'Maya Laurent'],
      [JONAH, 'jonah', 'Jonah Ellis'],
      [SOFIA, 'sofia', 'Sofia Chen'],
    ] as const) {
      await userRepository.save(
        User.register({
          id: UserId.of(id),
          email: Email.of(`${username}@example.com`),
          username: Username.of(username),
          displayName,
        }),
      );
    }

    await pool.query(
      `INSERT INTO books (id, title, page_count) VALUES ($1, 'Dune', 500), ($2, 'Emma', 474), ($3, 'Circe', 350)`,
      [DUNE, EMMA, CIRCE],
    );
    await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'accepted'), ($1, $3, 'accepted'), ($1, $4, 'pending')`,
      [ME, MAYA, JONAH, SOFIA],
    );

    // Maya has two books in progress; the running session makes Emma the current one.
    await pool.query(
      `INSERT INTO reading_status (user_id, book_id, status, current_page, created_at, updated_at)
       VALUES
         ($1, $2, 'in-progress', 120, now() - interval '2 days', now() - interval '1 hour'),
         ($1, $3, 'in-progress', 40, now() - interval '10 days', now() - interval '3 days'),
         ($4, $5, 'in-progress', 10, now() - interval '20 days', now() - interval '2 hours')`,
      [MAYA, DUNE, EMMA, JONAH, CIRCE],
    );
    await pool.query(
      `INSERT INTO reading_sessions (user_id, book_id, started_at)
       VALUES ($1, $2, now() - interval '10 minutes')`,
      [MAYA, EMMA],
    );

    await pool.query(
      `INSERT INTO groups (id, name, description, kind, admin_id)
       VALUES ($1, 'Sprint', '', 'challenge', $2),
              ($3, 'Classics', '', 'book-club', $4),
              ($5, 'Outsiders', '', 'book-club', $6)`,
      [SPRINT, MAYA, CLASSICS, JONAH, OUTSIDERS, SOFIA],
    );
    await pool.query(
      `INSERT INTO member (group_id, user_id, role)
       VALUES ($1, $2, 'member'), ($1, $3, 'admin'), ($4, $2, 'member'), ($4, $5, 'admin'),
              ($6, $7, 'admin')`,
      [SPRINT, ME, MAYA, CLASSICS, JONAH, OUTSIDERS, SOFIA],
    );
    await pool.query(
      `INSERT INTO group_messages (id, group_id, author_id, client_id, kind, body, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, gen_random_uuid(), 'text', 'Chapter 4 is wild', now() - interval '5 minutes'),
         (gen_random_uuid(), $1, $2, gen_random_uuid(), 'text', 'Deleted already', now() - interval '8 minutes'),
         (gen_random_uuid(), $1, NULL, NULL, 'system', 'Maya created the challenge', now() - interval '15 minutes'),
         (gen_random_uuid(), $3, $4, gen_random_uuid(), 'text', 'Emma is lovely', now() - interval '20 minutes'),
         (gen_random_uuid(), $5, $6, gen_random_uuid(), 'text', 'Not my group', now() - interval '1 minute')`,
      [SPRINT, MAYA, CLASSICS, JONAH, OUTSIDERS, SOFIA],
    );
    await pool.query(`UPDATE group_messages SET deleted_at = now() WHERE body = 'Deleted already'`);
  });

  after(async () => {
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('the three circle routes need a session', async () => {
    await withApp(app, async (baseUrl) => {
      for (const path of ['/me/friends/reading', '/me/circle/comments']) {
        assert.equal((await fetch(`${baseUrl}${path}`)).status, 401);
      }
    });
  });

  test('GET /me/friends/reading shows one book per friend, reading now first', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/me/friends/reading`, { headers: authHeader(ME) });
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        userId: string;
        displayName: string;
        book: { id: string; title: string };
        currentPage: number;
        readingNow: boolean;
      }[];

      assert.deepEqual(
        body.map((friend) => [friend.displayName, friend.book.title, friend.readingNow]),
        [
          ['Maya Laurent', 'Emma', true],
          ['Jonah Ellis', 'Circe', false],
        ],
      );
      assert.equal(body[0]!.currentPage, 40);
      // The pending request and the reader are not friends of themselves.
      assert.deepEqual(
        body.map((friend) => friend.userId),
        [MAYA, JONAH],
      );
    });
  });

  test('GET /me/circle/comments returns the latest text comments of my groups', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/me/circle/comments`, { headers: authHeader(ME) });
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        groupName: string;
        authorName: string;
        body: string;
      }[];

      assert.deepEqual(
        body.map((comment) => [comment.groupName, comment.authorName, comment.body]),
        [
          ['Sprint', 'Maya Laurent', 'Chapter 4 is wild'],
          ['Classics', 'Jonah Ellis', 'Emma is lovely'],
        ],
      );
    });
  });

  test('GET /me/circle/comments respects the limit', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/me/circle/comments?limit=1`, {
        headers: authHeader(ME),
      });
      assert.equal(response.status, 200);
      const body = (await response.json()) as { body: string }[];
      assert.deepEqual(
        body.map((comment) => comment.body),
        ['Chapter 4 is wild'],
      );
    });
  });

  test('a reader with no friends gets empty lists, not errors', async () => {
    await withApp(app, async (baseUrl) => {
      const headers = authHeader(SOFIA);
      for (const path of ['/me/friends/reading', '/me/circle/comments']) {
        const response = await fetch(`${baseUrl}${path}`, { headers });
        assert.equal(response.status, 200);
        // Sofia only sees the Outside group comment she wrote herself.
        if (path === '/me/circle/comments') {
          assert.deepEqual(
            ((await response.json()) as { body: string }[]).map((comment) => comment.body),
            ['Not my group'],
          );
        } else {
          assert.deepEqual(await response.json(), []);
        }
      }
    });
  });
});
