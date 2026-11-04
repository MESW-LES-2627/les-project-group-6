import emmaCover from '@/assets/covers/emma.png';
import type {
  BookClubDetail,
  ChallengeDetail,
  GroupInvitation,
  GroupMember,
  GroupSummary,
} from '@/types/groups';

// Mock data for the groups prototype, matching the design reference.
// Replace it with the groups API once those endpoints exist.

function member(name: string, initials: string, handle: string): GroupMember {
  return { id: handle, name, initials, handle };
}

const maya = member('Maya Laurent', 'ML', 'mayareads');
const priya = member('Priya Shah', 'PS', 'priyapages');
const eleanor = member('Eleanor Whitmore', 'EW', 'eleanorreads');
const jonah = member('Jonah Ellis', 'JE', 'jonahreads');
const sofia = member('Sofia Chen', 'SC', 'sofiachen');
const nadia = member('Nadia Patel', 'NP', 'nadiapatel');

export const mockCurrentMemberId = eleanor.id;

/** Accepted friends who can be invited when creating a group. */
export const mockFriends: GroupMember[] = [maya, priya, jonah, sofia, nadia];

const readers = ['ML', 'PS', 'EW', 'JE'];

export const mockGroups: GroupSummary[] = [
  {
    id: 'october-sprint',
    name: 'October Sprint',
    kind: 'challenge',
    status: 'active',
    headline: '#2 · 420 min',
    progress: 42,
    detail: '30 min behind tied leaders · 20 days left',
    meta: '1–31 Oct · counted minutes · 6 members',
    memberInitials: readers,
    memberCount: 6,
  },
  {
    id: 'classics',
    name: 'Classics',
    kind: 'book-club',
    status: 'active',
    headline: '2 of 6 finished',
    progress: 33,
    detail: 'You’re 62% through Emma · 20 days left',
    meta: 'Deadline 31 Oct · Every member must finish',
    memberInitials: readers,
    memberCount: 6,
    book: { title: 'Emma', author: 'Jane Austen', cover: emmaCover },
  },
  {
    id: 'november-pages',
    name: 'November Pages',
    kind: 'challenge',
    status: 'scheduled',
    headline: 'A fresh chapter.',
    progress: 0,
    detail: 'Starts 1 November · 30 days',
    meta: 'Metric: pages · rules lock at the start',
    memberInitials: readers,
    memberCount: 6,
  },
  {
    id: 'september-sprint',
    name: 'September Sprint',
    kind: 'challenge',
    status: 'completed',
    headline: 'You won · 980 min',
    progress: 100,
    detail: 'Final results frozen · shared with Maya',
    meta: '1–30 Sep · Tied leaders both won',
    memberInitials: readers,
    memberCount: 6,
    canRematch: true,
  },
  {
    id: 'the-short-shelf',
    name: 'The Short Shelf',
    kind: 'book-club',
    status: 'completed',
    headline: '6 of 6 finished',
    progress: 100,
    detail: 'Successful round · A Room of One’s Own',
    meta: 'Deadline 30 Sep · View past-round history',
    memberInitials: readers,
    memberCount: 6,
    canRematch: true,
  },
  {
    id: 'winter-classics',
    name: 'Winter Classics',
    kind: 'book-club',
    status: 'scheduled',
    headline: 'Next up: Persuasion',
    progress: 0,
    detail: 'Round begins 1 December',
    meta: 'Deadline 31 Dec · Invitations open',
    memberInitials: readers,
    memberCount: 6,
  },
];

export const mockInvitation: GroupInvitation = {
  id: 'the-sunday-shelf',
  name: 'The Sunday Shelf',
  inviter: 'Maya',
  detail: 'Maya invited you to a book club · 5 friends · starts 1 November',
  group: {
    id: 'the-sunday-shelf',
    name: 'The Sunday Shelf',
    kind: 'book-club',
    status: 'scheduled',
    headline: 'Your next club.',
    progress: 0,
    detail: 'Round begins 1 November',
    meta: 'Invited by Maya · 5 friends',
    memberInitials: ['ML', 'PS', 'EW', 'JE'],
    memberCount: 6,
  },
};

export const mockChallenge: ChallengeDetail = {
  id: 'october-sprint',
  name: 'October Sprint',
  tagline: 'Six friends. Any book. A month of making time for the page.',
  metric: { label: 'Minutes', note: 'Completed session time only' },
  period: { label: '1–31 Oct', note: '2026 · ends 31 Oct, 23:59' },
  standing: { label: '#2 · 420', note: '30 min behind the tied leaders' },
  remaining: { label: '20 days', note: 'Active · rules are locked' },
  leaderboard: [
    { member: maya, rank: 1, score: '450 min', note: 'Member · active this week' },
    { member: priya, rank: 1, score: '450 min', note: 'Member · active this week' },
    { member: eleanor, rank: 2, score: '420 min', note: 'You · 35 min counted today' },
    { member: jonah, rank: 3, score: '360 min', note: 'Member · active this week' },
    { member: sofia, rank: 4, score: '300 min', note: 'Member · active this week' },
    { member: nadia, rank: 5, score: '285 min', note: 'Member · active this week' },
  ],
  messages: [
    {
      id: 'm0',
      text: 'October Sprint started on 1 October. Duration, metric and fair-reading rules are now locked.',
      time: '1 Oct',
    },
    {
      id: 'm1',
      author: maya,
      text: 'A rainy morning is the best excuse for another chapter. What’s everyone reading?',
      time: '09:14',
    },
    {
      id: 'm2',
      author: eleanor,
      text: 'Still Emma—and still laughing at all the matchmaking.',
      time: '09:21',
    },
    {
      id: 'm3',
      author: priya,
      text: 'Just caught up with Maya! A shared first place feels right.',
      time: '09:32',
    },
  ],
  members: [maya, priya, eleanor, jonah, sofia, nadia],
  history: [
    {
      label: 'Completed · September Sprint',
      summary: 'Eleanor & Maya · tied winners · 980 min',
      note: 'Final scores are frozen in challenge history.',
    },
  ],
  lastResult: {
    label: 'Completed · September Sprint',
    summary: 'Eleanor & Maya · tied winners · 980 min',
    note: 'Final scores are frozen in challenge history.',
    rematchLabel: 'Rematch September Sprint',
  },
  rules: [
    { label: 'Simple timer', on: true },
    { label: 'Daily cap: 60 min', on: true },
    { label: 'End-page entry required', on: true },
    { label: 'Still-reading checks: off', on: false },
    { label: 'Inactivity pause: off', on: false },
    { label: 'Locked since 1 October', on: false },
  ],
  rulesNote:
    'Any book counts during the competition period. Manual minutes and estimated imports never count. Your profile takes the lowest counted value across eligible groups, once.',
};

export const mockClub: BookClubDetail = {
  id: 'classics',
  name: 'Classics',
  title: 'Classics, in good company.',
  subtitle: 'October’s shared chapter: Emma by Jane Austen.',
  round: {
    label: 'Round 4 · Active',
    book: { id: 'emma', title: 'Emma', author: 'Jane Austen', pages: 474, cover: emmaCover },
  },
  finished: { count: 2, total: 6 },
  deadline: '31 October 2026',
  daysLeft: '20 days to turn the last page',
  yourProgress: { page: 294, pages: 474 },
  leaderboard: [
    {
      member: maya,
      rank: 1,
      score: '310 min',
      note: 'Finished before deadline',
      progress: 100,
      finished: true,
    },
    {
      member: priya,
      rank: 2,
      score: '295 min',
      note: 'Finished before deadline',
      progress: 100,
      finished: true,
    },
    { member: eleanor, rank: 3, score: '260 min', note: '62% · In progress', progress: 62 },
    { member: jonah, rank: 4, score: '205 min', note: '48% · In progress', progress: 48 },
    { member: sofia, rank: 5, score: '190 min', note: '82% · In progress', progress: 82 },
    { member: nadia, rank: 6, score: '140 min', note: '35% · In progress', progress: 35 },
  ],
  messages: [
    {
      id: 'c0',
      text: 'Emma was selected by admin Maya. Round closes 31 October.',
      time: '1 Oct',
    },
    {
      id: 'c1',
      author: priya,
      text: 'Finished! I’m saving my thoughts on the ending until everyone catches up.',
      time: 'Yesterday · 18:10',
    },
    {
      id: 'c2',
      author: jonah,
      text: 'Thank you for keeping it spoiler-free. Chapter 27 has so much going on.',
      time: 'Today · 08:45',
      tag: 'Spoiler etiquette · name the chapter',
    },
    {
      id: 'c3',
      author: eleanor,
      text: 'Emma is slowly learning what everyone else already knows. I love Austen’s patience.',
      time: 'Today · 09:21',
    },
  ],
  members: [maya, priya, eleanor, jonah, sofia, nadia],
  adminName: 'Maya',
  isAdmin: false,
  roundOver: false,
  history: [
    {
      label: 'Round 3 · Completed',
      summary: 'Persuasion · 6 of 6 finished',
      note: 'Every member turned the last page before 30 September.',
    },
  ],
  voting: {
    status: 'open',
    closes: '25 October at 18:00',
    options: [
      { id: 'persuasion', title: 'Persuasion', author: 'Jane Austen', votes: 3 },
      { id: 'piranesi', title: 'Piranesi', author: 'Susanna Clarke', votes: 2 },
      { id: 'jane-eyre', title: 'Jane Eyre', author: 'Charlotte Brontë', votes: 0 },
    ],
    yourVote: 'persuasion',
    voted: 5,
    total: 6,
    anonymous: true,
  },
};
