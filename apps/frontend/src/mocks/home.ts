import type { UnbuiltHomeSections } from '@/types/home';

// Mock data only for the Home sections whose features are not built yet: yearly
// goals, friend activity (F-SOC-03) and friends reading now
// (F-SOC-04). Every other Home section comes from the API. Remove each part when its
// endpoint exists.
export const mockHome: UnbuiltHomeSections = {
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
};
