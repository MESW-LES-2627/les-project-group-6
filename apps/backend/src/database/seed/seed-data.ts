// The seed's story, in plain data. Dates are days relative to the day the seed runs,
// so streaks, the active challenge and the "this week" lists always look current.
// Readers are keys (e.g. 'ana'); the seed maps them to their Supabase Auth ids.

export type ReaderKey =
  'ana' | 'bruno' | 'carla' | 'diogo' | 'eva' | 'filipe' | 'gabriela' | 'hugo';

export interface SeedReader {
  key: ReaderKey;
  username: string;
  displayName: string;
  bio: string | null;
  visibility: 'public' | 'private';
  /** What this account is good for when testing; written to the credentials file. */
  role: string;
  currentStreak: number;
  longestStreak: number;
}

export const READERS: SeedReader[] = [
  {
    key: 'ana',
    username: 'ana.silva',
    displayName: 'Ana Silva',
    bio: 'Classics in the morning, sci-fi at night.',
    visibility: 'public',
    role: 'Main account: full library, folders and tags, reviews, admin of the active challenge, member of a book club with an open vote, one pending friend request and one pending club invite',
    currentStreak: 12,
    longestStreak: 21,
  },
  {
    key: 'bruno',
    username: 'bruno.costa',
    displayName: 'Bruno Costa',
    bio: 'Fantasy first, questions later.',
    visibility: 'public',
    role: "Friend of Ana; finished the club's current book; admin of a completed challenge",
    currentStreak: 3,
    longestStreak: 9,
  },
  {
    key: 'carla',
    username: 'carla.mendes',
    displayName: 'Carla Mendes',
    bio: null,
    visibility: 'private',
    role: 'Private profile; admin of the Sunday Classics book club (can open votes and start rounds)',
    currentStreak: 0,
    longestStreak: 6,
  },
  {
    key: 'diogo',
    username: 'diogo.ferreira',
    displayName: 'Diogo Ferreira',
    bio: 'Always one chapter behind.',
    visibility: 'public',
    role: 'Has a reading session running now; admin of the Sci-fi Saturdays club that invited Ana',
    currentStreak: 5,
    longestStreak: 5,
  },
  {
    key: 'eva',
    username: 'eva.santos',
    displayName: 'Eva Santos',
    bio: 'Short books, long walks.',
    visibility: 'public',
    role: 'Admin of a challenge that has not started yet',
    currentStreak: 1,
    longestStreak: 4,
  },
  {
    key: 'filipe',
    username: 'filipe.rocha',
    displayName: 'Filipe Rocha',
    bio: null,
    visibility: 'private',
    role: 'New reader: empty library and no groups (every empty state); sent Bruno a friend request',
    currentStreak: 0,
    longestStreak: 0,
  },
  {
    key: 'gabriela',
    username: 'gabriela.lopes',
    displayName: 'Gabriela Lopes',
    bio: 'Reviews everything.',
    visibility: 'private',
    role: 'Stranger to everyone with a private profile (its details are hidden from others)',
    currentStreak: 2,
    longestStreak: 15,
  },
  {
    key: 'hugo',
    username: 'hugo.martins',
    displayName: 'Hugo Martins',
    bio: null,
    visibility: 'public',
    role: 'Sent Ana a friend request that is still pending',
    currentStreak: 0,
    longestStreak: 2,
  },
];

export type BookKey =
  | 'emma'
  | 'midnight'
  | 'circe'
  | 'secret'
  | 'room'
  | 'piranesi'
  | 'pride'
  | 'dune'
  | 'nineteen'
  | 'hobbit'
  | 'eyre'
  | 'middlemarch'
  | 'mockingbird'
  | 'gatsby'
  | 'hailmary'
  | 'klara';

/**
 * Every value below comes from Open Library (looked up once by ISBN on 2026-11-17):
 * title and authors from `search.json?q=isbn:<isbn>`, page count and cover from the
 * edition (`/isbn/<isbn>.json`, the work's median when the edition has none), and the
 * description's first paragraph from the work (`/works/<id>.json`).
 */
export interface SeedBook {
  key: BookKey;
  /** Fixed for the six books the first seed already created, so existing rows are reused. */
  id?: string;
  title: string;
  authors: string[];
  isbn13: string;
  pageCount: number;
  /** Open Library cover id: `https://covers.openlibrary.org/b/id/<id>-L.jpg` (not rate limited). */
  coverId: number;
  description: string;
}

export const BOOKS: SeedBook[] = [
  {
    key: 'emma',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    title: 'Emma',
    authors: ['Jane Austen'],
    isbn13: '9780141439587',
    pageCount: 512,
    coverId: 15265916,
    description:
      'Emma, by Jane Austen, is a novel about youthful hubris and the perils of misconstrued romance. The novel was first published in December 1815. As in her other novels, Austen explores the concerns and difficulties of genteel women living in Georgian-Regency England; she also creates a lively comedy of manners among her characters. Before she began the novel, Austen wrote, "I am going to take a heroine whom no one but myself will much like." In the very first sentence she introduces the title character as "Emma Woodhouse, handsome, clever, and rich." Emma, however, is also rather spoiled, headstrong, and self-satisfied; she greatly overestimates her own matchmaking abilities; she is blind to the dangers of meddling in other people\'s lives; and her imagination and perceptions often lead her astray.',
  },
  {
    key: 'midnight',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    title: 'The Midnight Library',
    authors: ['Matt Haig'],
    isbn13: '9780525559474',
    pageCount: 288,
    coverId: 15164860,
    description:
      'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices . . . Would you have done anything different, if you had the chance to undo your regrets?',
  },
  {
    key: 'circe',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    title: 'Circe',
    authors: ['Madeline Miller'],
    isbn13: '9780316556347',
    pageCount: 393,
    coverId: 8283869,
    description:
      'In the house of Helios, god of the sun and mightiest of the Titans, a daughter is born. But Circe is a strange child–not powerful, like her father, nor viciously alluring like her mother. Turning to the world of mortals for companionship, she discovers that she does possess power–the power of witchcraft, which can transform rivals into monsters and menace the gods themselves.',
  },
  {
    key: 'secret',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
    title: 'The Secret History',
    authors: ['Donna Tartt'],
    isbn13: '9781400031702',
    pageCount: 559,
    coverId: 744854,
    description:
      'Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries. But when they go beyond the boundaries of normal morality they slip gradually from obsession to corruption and betrayal, and at last - inexorably - into evil.',
  },
  {
    key: 'room',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
    title: "A Room of One's Own",
    authors: ['Virginia Woolf'],
    isbn13: '9780156787338',
    pageCount: 114,
    coverId: 116492,
    description:
      'A Room of One\'s Own is an extended essay by Virginia Woolf. First published on 24 October 1929, the essay was based on a series of lectures she delivered at Newnham College and Girton College, two women\'s colleges at Cambridge University in October 1928. While this extended essay in fact employs a fictional narrator and narrative to explore women both as writers of and characters in fiction, the manuscript for the delivery of the series of lectures, titled "Women and Fiction", and hence the essay, are considered non-fiction. The essay is generally seen as a feminist text, and is noted in its argument for both a literal and figural space for women writers within a literary tradition dominated by patriarchy.',
  },
  {
    key: 'piranesi',
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
    title: 'Piranesi',
    authors: ['Susanna Clarke'],
    isbn13: '9781635575637',
    pageCount: 272,
    coverId: 10226290,
    description:
      "Piranesi's house is no ordinary building; its rooms are infinite, its corridors endless, its walls are lined with thousands upon thousands of statues, each one different from all the others. Within the labyrinth of halls an ocean is imprisoned; waves thunder up staircases, rooms are flooded in an instant. But Piranesi is not afraid; he understands the tides as he understands the pattern of the labyrinth itself. He lives to explore the house.",
  },
  {
    key: 'pride',
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    isbn13: '9780141439518',
    pageCount: 435,
    coverId: 12645114,
    description:
      'Pride and Prejudice is an 1813 novel of manners written by Jane Austen. The novel follows the character development of Elizabeth Bennet, the dynamic protagonist of the book who learns about the repercussions of hasty judgments and comes to appreciate the difference between superficial goodness and actual goodness.',
  },
  {
    key: 'dune',
    title: 'Dune',
    authors: ['Frank Herbert'],
    isbn13: '9780441172719',
    pageCount: 535,
    coverId: 15166231,
    description:
      'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange, a drug capable of extending life and enhancing consciousness. Coveted across the known universe, melange is a prize worth killing for...',
  },
  {
    key: 'nineteen',
    title: 'Nineteen Eighty-Four',
    authors: ['George Orwell'],
    isbn13: '9780451524935',
    pageCount: 318,
    coverId: 15257377,
    description:
      "Nineteen Eighty-Four: A Novel, often referred to as 1984, is a dystopian social science fiction novel by the English novelist George Orwell (the pen name of Eric Arthur Blair). It was published on 8 June 1949 by Secker & Warburg as Orwell's ninth and final book completed in his lifetime. Thematically, Nineteen Eighty-Four centres on the consequences of totalitarianism, mass surveillance, and repressive regimentation of persons and behaviours within society. Orwell, himself a democratic socialist, modelled the authoritarian government in the novel after Stalinist Russia. More broadly, the novel examines the role of truth and facts within politics and the ways in which they are manipulated.",
  },
  {
    key: 'hobbit',
    title: 'The Hobbit',
    authors: ['J.R.R. Tolkien'],
    isbn13: '9780547928227',
    pageCount: 300,
    coverId: 12003329,
    description:
      'The Hobbit is a tale of high adventure, undertaken by a company of dwarves in search of dragon-guarded gold. A reluctant partner in this perilous quest is Bilbo Baggins, a comfort-loving unambitious hobbit, who surprises even himself by his resourcefulness and skill as a burglar.',
  },
  {
    key: 'eyre',
    title: 'Jane Eyre',
    authors: ['Charlotte Brontë'],
    isbn13: '9780141441146',
    pageCount: 578,
    coverId: 109090,
    description:
      "The novel is set somewhere in the north of England. Jane's childhood at Gateshead Hall, where she is emotionally and physically abused by her aunt and cousins; her education at Lowood School, where she acquires friends and role models but also suffers privations and oppression; her time as the governess of Thornfield Hall, where she falls in love with her Byronic employer, Edward Rochester; her time with the Rivers family, during which her earnest but cold clergyman cousin, St John Rivers, proposes to her. Will she or will she not marry him?",
  },
  {
    key: 'middlemarch',
    title: 'Middlemarch',
    authors: ['George Eliot'],
    isbn13: '9780141439549',
    pageCount: 896,
    coverId: 109037,
    description:
      'Eliot’s epic of 19th century provincial social life, set in a fictitious Midlands town in the years 1830-32, has several interlocking storylines blended effortlessly together to form a fully coherent narrative. Its main themes are the status of women, social expectations and hypocrisy, religion, political reform and education. It has often been called the greatest novel in the English language.',
  },
  {
    key: 'mockingbird',
    title: 'To Kill a Mockingbird',
    authors: ['Harper Lee'],
    isbn13: '9780061120084',
    pageCount: 323,
    coverId: 15162569,
    description:
      'One of the best-loved stories of all time, To Kill a Mockingbird has been translated into more than 40 languages, sold more than 30 million copies worldwide, served as the basis for an enormously popular motion picture, and voted one of the best novels of the 20th century by librarians across the United States. A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice, it views a world of great beauty and savage inequities through the eyes of a young girl, as her father – a crusading local lawyer – risks everything to defend a black man unjustly accused of a terrible crime.',
  },
  {
    key: 'gatsby',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    isbn13: '9780743273565',
    pageCount: 180,
    coverId: 13028546,
    description:
      'Here is a novel, glamorous, ironical, compassionate – a marvelous fusion into unity of the curious incongruities of the life of the period – which reveals a hero like no other – one who could live at no other time and in no other place. But he will live as a character, we surmise, as long as the memory of any reader lasts.',
  },
  {
    key: 'hailmary',
    title: 'Project Hail Mary',
    authors: ['Andy Weir'],
    isbn13: '9780593135204',
    pageCount: 496,
    coverId: 12455001,
    description:
      'Ryland Grace is the sole survivor on a desperate, last-chance mission–and if he fails, humanity and the earth itself will perish. Except that right now, he doesn’t know that. He can’t even remember his own name, let alone the nature of his assignment or how to complete it. All he knows is that he’s been asleep for a very, very long time. And he’s just been awakened to find himself millions of miles from home, with nothing but two corpses for company.',
  },
  {
    key: 'klara',
    title: 'Klara and the Sun',
    authors: ['Kazuo Ishiguro'],
    isbn13: '9780593318171',
    pageCount: 304,
    coverId: 10673548,
    description:
      'Klara and the Sun, the first novel by Kazuo Ishiguro since he was awarded the Nobel Prize in Literature, tells the story of Klara, an Artificial Friend with outstanding observational qualities, who, from her place in the store, watches carefully the behavior of those who come in to browse, and of those who pass on the street outside. She remains hopeful that a customer will soon choose her.',
  },
];

export type Status = 'not-started' | 'in-progress' | 'finished' | 'did-not-finish';

/** A library entry. Days are "days ago" (negative = in the future). */
export interface SeedShelfEntry {
  reader: ReaderKey;
  book: BookKey;
  status: Status;
  /** The page reached; ignored for a finished book, which is at its last page. */
  page: number;
  /** When it was added; within the last 7 days it counts as trending. */
  addedDaysAgo: number;
  /** When it was last changed (for a finished book: when it was finished). */
  updatedDaysAgo: number;
  startedDaysAgo?: number;
  finishedDaysAgo?: number;
}

const shelf = (
  reader: ReaderKey,
  book: BookKey,
  status: Status,
  page: number,
  addedDaysAgo: number,
  updatedDaysAgo: number,
  dates: { started?: number; finished?: number } = {},
): SeedShelfEntry => ({
  reader,
  book,
  status,
  page,
  addedDaysAgo,
  updatedDaysAgo,
  startedDaysAgo: dates.started,
  finishedDaysAgo: dates.finished,
});

export const LIBRARY: SeedShelfEntry[] = [
  // Ana: a bit of everything
  shelf('ana', 'emma', 'in-progress', 294, 12, 0, { started: 10 }),
  shelf('ana', 'piranesi', 'in-progress', 120, 40, 3, { started: 30 }),
  shelf('ana', 'circe', 'finished', 393, 70, 50, { started: 65, finished: 50 }),
  shelf('ana', 'pride', 'finished', 480, 35, 18, { started: 30, finished: 18 }),
  shelf('ana', 'room', 'finished', 112, 90, 80, { started: 85, finished: 80 }),
  shelf('ana', 'secret', 'did-not-finish', 156, 60, 45, { started: 55 }),
  shelf('ana', 'midnight', 'not-started', 0, 20, 20),
  shelf('ana', 'dune', 'not-started', 0, 1, 1),
  // Bruno
  shelf('bruno', 'emma', 'finished', 474, 12, 2, { started: 10, finished: 2 }),
  shelf('bruno', 'pride', 'finished', 480, 35, 22, { started: 30, finished: 22 }),
  shelf('bruno', 'dune', 'in-progress', 210, 4, 1, { started: 4 }),
  shelf('bruno', 'hobbit', 'finished', 300, 50, 40, { started: 48, finished: 40 }),
  // Carla
  shelf('carla', 'emma', 'in-progress', 100, 12, 1, { started: 9 }),
  shelf('carla', 'pride', 'finished', 480, 35, 15, { started: 30, finished: 15 }),
  shelf('carla', 'circe', 'finished', 393, 80, 60, { started: 75, finished: 60 }),
  shelf('carla', 'eyre', 'in-progress', 64, 5, 2, { started: 5 }),
  // Diogo
  shelf('diogo', 'hailmary', 'in-progress', 140, 3, 0, { started: 3 }),
  shelf('diogo', 'nineteen', 'finished', 328, 60, 30, { started: 45, finished: 30 }),
  shelf('diogo', 'dune', 'finished', 688, 100, 70, { started: 95, finished: 70 }),
  // Eva
  shelf('eva', 'klara', 'in-progress', 88, 2, 0, { started: 2 }),
  shelf('eva', 'hailmary', 'not-started', 0, 6, 6),
  shelf('eva', 'middlemarch', 'not-started', 0, 30, 30),
  shelf('eva', 'gatsby', 'finished', 180, 25, 20, { started: 23, finished: 20 }),
  // Gabriela (private profile)
  shelf('gabriela', 'mockingbird', 'finished', 336, 40, 30, { started: 38, finished: 30 }),
  shelf('gabriela', 'piranesi', 'in-progress', 30, 3, 1, { started: 3 }),
  shelf('gabriela', 'klara', 'not-started', 0, 1, 1),
  // Hugo
  shelf('hugo', 'hobbit', 'in-progress', 75, 6, 1, { started: 6 }),
  // Filipe: nothing, on purpose
];

/** Finished reading sessions: [reader, book, days ago, minutes, pages read]. */
export type SeedSession = [ReaderKey, BookKey, number, number, number];

export const SESSIONS: SeedSession[] = [
  // Ana reads every day for the last 12 days (her streak), plus older sessions that
  // count in the completed October challenge.
  ...Array.from({ length: 12 }, (_, i): SeedSession => [
    'ana',
    i % 3 === 0 ? 'piranesi' : 'emma',
    i,
    25 + ((i * 7) % 20),
    18 + (i % 5) * 3,
  ]),
  ['ana', 'pride', 20, 40, 35],
  ['ana', 'pride', 24, 35, 30],
  ['ana', 'pride', 28, 50, 42],
  ['ana', 'circe', 52, 45, 40],
  // Bruno
  ['bruno', 'emma', 2, 55, 60],
  ['bruno', 'emma', 4, 40, 45],
  ['bruno', 'emma', 7, 60, 70],
  ['bruno', 'dune', 1, 35, 30],
  ['bruno', 'pride', 25, 45, 50],
  ['bruno', 'pride', 30, 30, 30],
  // Carla
  ['carla', 'emma', 1, 20, 15],
  ['carla', 'emma', 6, 30, 25],
  ['carla', 'eyre', 2, 25, 20],
  ['carla', 'pride', 17, 60, 70],
  // Diogo (his running session is separate)
  ['diogo', 'hailmary', 1, 45, 50],
  ['diogo', 'hailmary', 2, 50, 55],
  ['diogo', 'hailmary', 3, 30, 35],
  // Eva
  ['eva', 'klara', 0, 30, 40],
  ['eva', 'klara', 1, 35, 48],
  ['eva', 'gatsby', 21, 50, 60],
  ['eva', 'gatsby', 22, 40, 55],
  // Gabriela and Hugo
  ['gabriela', 'piranesi', 1, 20, 30],
  ['gabriela', 'mockingbird', 32, 55, 60],
  ['hugo', 'hobbit', 1, 25, 40],
];

/** Diogo's session that is running right now. */
export const RUNNING_SESSION = {
  reader: 'diogo' as ReaderKey,
  book: 'hailmary' as BookKey,
  minutesAgo: 25,
};

/** [requester, addressee, status, days ago]. */
export const FRIENDSHIPS: [ReaderKey, ReaderKey, 'accepted' | 'pending', number][] = [
  ['ana', 'bruno', 'accepted', 120],
  ['carla', 'ana', 'accepted', 110],
  ['ana', 'diogo', 'accepted', 90],
  ['eva', 'ana', 'accepted', 60],
  ['bruno', 'carla', 'accepted', 100],
  ['diogo', 'eva', 'accepted', 50],
  ['bruno', 'diogo', 'accepted', 40],
  ['hugo', 'ana', 'pending', 2],
  ['filipe', 'bruno', 'pending', 1],
];

export interface SeedChallenge {
  key: string;
  name: string;
  description: string;
  admin: ReaderKey;
  members: ReaderKey[];
  /** Days from today: negative is in the past. */
  startInDays: number;
  durationDays: number;
  metric: 'minutes' | 'pages' | 'books' | 'streak';
}

export const CHALLENGES: SeedChallenge[] = [
  {
    key: 'sprint',
    name: 'November Sprint',
    description: 'Any book counts. Most minutes by the end of the month wins.',
    admin: 'ana',
    members: ['ana', 'bruno', 'carla', 'diogo'],
    startInDays: -10,
    durationDays: 30,
    metric: 'minutes',
  },
  {
    key: 'october',
    name: 'October Pages',
    description: 'A month of reading before the clocks change.',
    admin: 'bruno',
    members: ['bruno', 'ana', 'eva'],
    startInDays: -45,
    durationDays: 30,
    metric: 'minutes',
  },
  {
    key: 'winter',
    name: 'Winter Reads',
    description: 'Starts soon: cosy books only.',
    admin: 'eva',
    members: ['eva', 'ana'],
    startInDays: 10,
    durationDays: 30,
    metric: 'minutes',
  },
];

export interface SeedClub {
  key: string;
  name: string;
  description: string;
  admin: ReaderKey;
  members: ReaderKey[];
  /** Oldest first; the last one is the current round. */
  rounds: { book: BookKey; startInDays: number; deadlineInDays: number }[];
  poll?: {
    closesInDays: number;
    anonymous: boolean;
    proposals: { book: BookKey; by: ReaderKey }[];
    /** [voter, index of the proposal]. */
    votes: [ReaderKey, number][];
  };
  /** [author or null for a system message, text, hours ago]. */
  messages: [ReaderKey | null, string, number][];
}

export const CLUBS: SeedClub[] = [
  {
    key: 'classics',
    name: 'Sunday Classics',
    description: 'One classic a month, read slowly.',
    admin: 'carla',
    members: ['carla', 'ana', 'bruno'],
    rounds: [
      { book: 'pride', startInDays: -30, deadlineInDays: -12 },
      { book: 'emma', startInDays: -10, deadlineInDays: 20 },
    ],
    poll: {
      closesInDays: 5,
      anonymous: false,
      proposals: [
        { book: 'eyre', by: 'ana' },
        { book: 'middlemarch', by: 'carla' },
      ],
      votes: [
        ['ana', 0],
        ['bruno', 1],
      ],
    },
    messages: [
      [null, 'Emma was selected by admin Carla Mendes.', 240],
      ['carla', 'Round two! Emma until the 20th, no spoilers past chapter 20 please.', 239],
      ['bruno', 'Finished early, I could not stop. My lips are sealed.', 50],
      ['ana', 'Halfway there. Mr Knightley is the only sensible person in Highbury.', 20],
    ],
  },
  {
    key: 'scifi',
    name: 'Sci-fi Saturdays',
    description: 'Big ideas, small groups.',
    admin: 'diogo',
    members: ['diogo', 'eva'],
    rounds: [{ book: 'hailmary', startInDays: -5, deadlineInDays: 25 }],
    messages: [
      [null, 'Project Hail Mary was selected by admin Diogo Ferreira.', 120],
      ['eva', 'Added it to my list, starting this weekend.', 100],
    ],
  },
];

/** Chat in the active challenge: [author or null, text, hours ago]. */
export const CHALLENGE_MESSAGES: Record<string, [ReaderKey | null, string, number][]> = {
  sprint: [
    [null, 'Ana Silva started the challenge November Sprint.', 240],
    ['bruno', 'Game on. I have a long train ride on Tuesday.', 200],
    ['diogo', 'Reading in the bath counts, right?', 30],
  ],
};

/** [inviter, invitee, group key]. */
export const PENDING_INVITES: [ReaderKey, ReaderKey, string][] = [['diogo', 'ana', 'scifi']];

/** [reader, book, rating, comment, days ago]. */
export const REVIEWS: [ReaderKey, BookKey, number, string | null, number][] = [
  ['ana', 'circe', 5, 'Gorgeous and furious. I underlined half of it.', 49],
  ['ana', 'pride', 4, 'Better on a reread: every line is a joke.', 17],
  ['ana', 'secret', 2, 'Beautiful writing, but I stopped caring about these people.', 44],
  ['bruno', 'pride', 5, null, 21],
  ['bruno', 'hobbit', 4, 'Cosy and brave. Perfect for a rainy week.', 39],
  ['carla', 'circe', 4, 'The middle drags, the ending soars.', 59],
  ['diogo', 'nineteen', 5, 'Still terrifying.', 29],
  ['eva', 'gatsby', 3, 'Short and sharp, though I wanted more of Nick.', 19],
  ['gabriela', 'mockingbird', 5, 'Should be read at every age.', 29],
];

/** Private folders: [reader, folder name, books]. */
export const FOLDERS: [ReaderKey, string, BookKey[]][] = [
  ['ana', 'Classics', ['emma', 'pride', 'room']],
  ['ana', 'To read next', ['midnight', 'dune']],
  ['bruno', 'Sci-fi', ['dune']],
];

/** Tags: [reader, tag name, books]. */
export const TAGS: [ReaderKey, string, BookKey[]][] = [
  ['ana', 'favourite', ['circe', 'pride']],
  ['ana', 'borrowed', ['piranesi']],
  ['carla', 'reread', ['circe']],
];
