import emmaCover from '@/assets/covers/emma.png';
import type { HomeData } from '@/types/home';

// Mock data for the home prototype, matching the design reference (screen 05).
// Replace it with the home API once those endpoints exist.

export const mockHome: HomeData = {
  date: 'Sunday, October 11, 2026',
  isoDate: '2026-10-11',
  readerName: 'Eleanor',
  bedside: {
    id: 'emma',
    title: 'Emma',
    author: 'Jane Austen',
    cover: emmaCover,
    pages: 474,
    currentPage: 294,
    club: 'Classics club',
    lastSession: { minutes: 35, when: 'Today', pages: 24 },
  },
  streak: { days: 12, freezesLeft: 2, freezesMax: 2, todayComplete: true },
  challenge: {
    id: 'october-sprint',
    name: 'October Sprint',
    rank: 2,
    countedMinutes: 420,
    behindLeaders: 30,
    progress: 64,
    daysLeft: 20,
    endsOn: '31 Oct',
    readers: 6,
    members: ['EW', 'ML', 'PS'],
  },
  club: {
    id: 'classics',
    name: 'Classics · Emma',
    finished: 2,
    total: 6,
    progress: 62,
    deadline: '31 October',
    members: ['ML', 'PS', 'JN'],
  },
  goals: {
    year: 2026,
    booksRead: 18,
    booksGoal: 24,
    minutesRead: 4280,
    minutesGoal: 6000,
    onSchedule: true,
  },
  activity: [
    {
      id: 'a1',
      initials: 'ML',
      title: 'Maya Laurent finished Piranesi',
      detail: '“An extraordinary little universe.” · 1 hour ago',
    },
    {
      id: 'a2',
      initials: 'PS',
      title: 'Priya Shah earned Seven-day Spark',
      detail: 'A whole week of completed reading days · 3 hours ago',
    },
    {
      id: 'a3',
      initials: 'CL',
      title: 'Classics selected Emma for October',
      detail: 'A new shared chapter · 1 October',
    },
  ],
  readingNow: [
    { initials: 'ML', name: 'Maya Laurent', book: 'The Secret History' },
    { initials: 'JE', name: 'Jonah Ellis', book: 'Circe' },
  ],
  friendRequest: { name: 'Sofia Chen' },
  invitation: {
    id: 'sunday-shelf',
    title: 'The Sunday Shelf',
    detail: 'Book club · invited by Maya',
  },
};
