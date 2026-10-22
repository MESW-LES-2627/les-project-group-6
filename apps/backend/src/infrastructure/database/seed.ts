import process from 'node:process';
import { createPool, createDb } from './pool.js';
import { users, books, readingStatus } from './schema.js';

const pool = createPool();
const db = createDb(pool);

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...');

  // 1. Seed demo user
  const demoUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  await db
    .insert(users)
    .values([
      {
        id: demoUserId,
        email: 'demo@bookmarked.app',
        username: 'demo_reader',
        displayName: 'Demo Reader',
        timezone: 'Europe/Lisbon',
      },
    ])
    .onConflictDoNothing();

  // 2. Seed books
  const seedBooks = [
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      title: 'Emma',
      description: 'A classic novel of youthful hubris and romantic entanglements by Jane Austen.',
      pageCount: 474,
      isbn13: '9780141439587',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL50293425M-L.jpg',
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
      title: 'The Midnight Library',
      description:
        'Between life and death there is a library with infinite books of infinite lives.',
      pageCount: 304,
      isbn13: '9780525559474',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL61174737M-L.jpg',
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
      title: 'Circe',
      description:
        'In the house of Helios, god of the sun, a daughter is born with strange powers.',
      pageCount: 393,
      isbn13: '9780316556347',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL61375842M-L.jpg',
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
      title: 'The Secret History',
      description:
        'A group of clever, eccentric misfits at an elite New England college discover a dark obsession.',
      pageCount: 559,
      isbn13: '9781400031702',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL38246222M-L.jpg',
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
      title: "A Room of One's Own",
      description:
        "An extended essay on women's education, freedom, and space to write by Virginia Woolf.",
      pageCount: 112,
      isbn13: '9780156787338',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL58393454M-L.jpg',
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
      title: 'Piranesi',
      description:
        'Piranesi lives in the House with infinite rooms and ocean tides surging through corridors.',
      pageCount: 272,
      isbn13: '9781635575637',
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL36128954M-L.jpg',
    },
  ];

  await db.insert(books).values(seedBooks).onConflictDoNothing();

  // 3. Link demo user to all books with status 'not-started'
  const statuses = seedBooks.map((book, index) => ({
    id: `d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a0${index + 1}`,
    userId: demoUserId,
    bookId: book.id,
    status: 'not-started',
    currentPage: 0,
  }));

  await db.insert(readingStatus).values(statuses).onConflictDoNothing();

  console.log('✅ Seeding completed successfully!');
  await pool.end();
}

seed().catch(async (error) => {
  console.error('❌ Seeding failed:', error);
  await pool.end();
  process.exit(1);
});
