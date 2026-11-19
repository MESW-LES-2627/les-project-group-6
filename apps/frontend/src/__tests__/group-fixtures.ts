import type { BookClubDetail, GroupMember } from '@/types/groups';

// A book club page as the API mappers build it, for component and view tests.

function member(name: string, initials: string, handle: string): GroupMember {
  return { id: handle, name, initials, handle };
}

const maya = member('Maya Laurent', 'ML', 'mayareads');
const priya = member('Priya Shah', 'PS', 'priyapages');
const eleanor = member('Eleanor Whitmore', 'EW', 'eleanorreads');
const jonah = member('Jonah Ellis', 'JE', 'jonahreads');
const sofia = member('Sofia Chen', 'SC', 'sofiachen');
const nadia = member('Nadia Patel', 'NP', 'nadiapatel');

export const testClub: BookClubDetail = {
  id: 'classics',
  name: 'Classics',
  title: 'Classics, in good company.',
  subtitle: 'October’s shared chapter: Emma by Jane Austen.',
  round: {
    label: 'Round 4 · Active',
    book: { id: 'emma', title: 'Emma', author: 'Jane Austen', pages: 474, cover: '' },
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
