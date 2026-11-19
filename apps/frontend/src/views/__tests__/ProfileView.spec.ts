// @req F-PROF-01 F-READ-04
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import {
  ApiError,
  type ApiLibraryItem,
  type ApiMe,
  type ApiProfileReview,
  type ApiReadingStats,
  type ApiStreak,
  type ApiUserProfile,
} from '@/services/api';
import type { FolderSummary } from '@/types/library';
import ProfileView from '../ProfileView.vue';

const getReadingStats = vi.hoisted(() => vi.fn<() => Promise<ApiReadingStats>>());
const getStreak = vi.hoisted(() => vi.fn<() => Promise<ApiStreak>>());
const ME: ApiMe = {
  id: 'me-id',
  email: 'eleanor@example.com',
  username: 'eleanorreads',
  displayName: 'Eleanor Whitmore',
  timezone: 'Europe/Lisbon',
  photoUrl: null,
  profileVisibility: 'public',
  createdAt: '2026-03-01T10:00:00.000Z',
};

const api = vi.hoisted(() => ({
  getMe: vi.fn<() => Promise<ApiMe>>(),
  getUserProfile: vi.fn<(username: string) => Promise<ApiUserProfile>>(),
  getUserReviews: vi.fn<(userId: string) => Promise<ApiProfileReview[]>>(async () => []),
  getUserLibrary: vi.fn<() => Promise<ApiLibraryItem[]>>(async () => []),
  getLibraryFolders: vi.fn<() => Promise<FolderSummary[]>>(async () => []),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getReadingStats,
  getStreak,
  ...api,
}));

function mountView() {
  return mount(ProfileView, { global: { plugins: [router] } });
}

const item = (
  id: string,
  title: string,
  status: ApiLibraryItem['status'],
  updatedAt: string,
  folderIds: string[] = [],
): ApiLibraryItem => ({
  id: `li-${id}`,
  book: {
    id,
    title,
    authors: ['Jane Austen'],
    description: null,
    isbn13: null,
    pageCount: 400,
    coverUrl: id === 'emma' ? 'https://covers.example/emma.jpg' : null,
  },
  status,
  currentPage: status === 'finished' ? 400 : 100,
  updatedAt,
  folderIds,
});

beforeEach(() => {
  api.getMe.mockResolvedValue(ME);
  api.getUserProfile.mockResolvedValue({
    bio: 'Usually somewhere between a cup of tea and one more chapter.',
  } as ApiUserProfile);
});

describe('ProfileView reader and books', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the signed-in reader on the bookplate', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    const wrapper = mountView();
    await flushPromises();

    expect(api.getUserProfile).toHaveBeenCalledWith('eleanorreads');
    expect(wrapper.get('.name').text()).toBe('Eleanor Whitmore');
    expect(wrapper.text()).toContain('@eleanorreads');
    expect(wrapper.text()).toContain('one more chapter');
    expect(wrapper.text()).toContain('Public profile');
  });

  it('shows an error instead of a mock reader when the profile cannot be loaded', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getMe.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('.band').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('We could not load your profile');
  });

  it('builds currently reading, the shelf, recently added and folders from the library', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getUserLibrary.mockResolvedValueOnce([
      item('emma', 'Emma', 'in-progress', '2026-11-16T00:00:00Z', ['f1']),
      item('persuasion', 'Persuasion', 'finished', '2026-11-10T00:00:00Z', ['f1']),
      item('sense', 'Sense and Sensibility', 'not-started', '2026-11-01T00:00:00Z'),
    ]);
    api.getLibraryFolders.mockResolvedValueOnce([{ id: 'f1', name: 'Austen', count: 2 }]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Emma');
    expect(wrapper.get('.shelf-section .count').text()).toBe('1 finished');
    expect(wrapper.get('.spine').attributes('aria-label')).toBe('Persuasion by Jane Austen');
    expect(wrapper.findAll('.cover-grid li')).toHaveLength(3);
    expect(wrapper.get('.folders').text()).toContain('Austen');
    expect(wrapper.get('.folders').text()).toContain('2 books');
    // A real cover image is used when the catalogue has one.
    expect(wrapper.find('img[src="https://covers.example/emma.jpg"]').exists()).toBe(true);
  });

  it('shows the empty states for a reader with no books', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.shelf-section .count').text()).toBe('0 finished');
    expect(wrapper.findAll('.cover-grid li')).toHaveLength(0);
  });
});

describe('ProfileView reading time', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the minutes and sessions from the reading stats API', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 40, sessionsCount: 1 });
    const wrapper = mountView();
    await flushPromises();

    const readingTime = wrapper.get('.reading-time');
    expect(readingTime.get('.number').text()).toBe('40');
    expect(readingTime.text()).toContain('minutes');
    expect(readingTime.get('.sessions').text()).toBe('across 1 session');
  });

  it('shows the empty hint when no session has been finished', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    const wrapper = mountView();
    await flushPromises();

    const readingTime = wrapper.get('.reading-time');
    expect(readingTime.get('.number').text()).toBe('0');
    expect(readingTime.find('.sessions').exists()).toBe(false);
    expect(readingTime.text()).toContain('Start a reading session');
  });

  it('shows an empty reading time and an error, not mock data, when the API is unreachable', async () => {
    getReadingStats.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.reading-time .number').text()).toBe('0');
    expect(wrapper.find('.reading-time .sessions').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('reading stats could not be loaded');
  });
});

describe('ProfileView reviews', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists the books I reviewed with their rating', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getUserReviews.mockResolvedValueOnce([
      {
        book: { id: 'b1', title: 'Dune', coverUrl: null },
        rating: 4,
        comment: 'Great world building',
        updatedAt: '2026-11-13T00:00:00Z',
      },
    ]);
    const wrapper = mountView();
    await flushPromises();

    expect(api.getUserReviews).toHaveBeenCalledWith('me-id');
    const section = wrapper.get('.profile-reviews');
    expect(section.text()).toContain('Dune');
    expect(section.text()).toContain('Great world building');
    expect(section.get('.stars').attributes('aria-label')).toBe('4 out of 5');
  });

  it('hides the section when the reviews cannot be loaded', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getUserReviews.mockRejectedValueOnce(new ApiError('This profile is private', 403));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('.profile-reviews').exists()).toBe(false);
  });
});

describe('ProfileView logged-in user and streak', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays the logged-in user profile details in the bookplate', async () => {
    api.getMe.mockResolvedValueOnce({
      id: 'logged-in-user-id',
      email: 'reader@example.com',
      username: 'book_lover',
      displayName: 'Book Lover',
      timezone: 'Europe/Lisbon',
      photoUrl: null,
      profileVisibility: 'public',
      createdAt: '2026-05-15T12:00:00Z',
    });
    api.getUserProfile.mockResolvedValueOnce({ bio: 'Avid sci-fi reader' } as ApiUserProfile);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.plate .name').text()).toBe('Book Lover');
    expect(wrapper.get('.plate .secondary').text()).toContain('@book_lover');
    expect(wrapper.get('.plate .secondary').text()).toContain('reading since May 2026');
    expect(wrapper.get('.plate .bio').text()).toBe('Avid sci-fi reader');
    expect(wrapper.get('.plate .avatar').text()).toBe('BL');
  });

  it('renders the streak calendar from the streak API', async () => {
    const days = Array.from({ length: 28 }, (_, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      read: i >= 20, // last 8 days read
    }));

    getStreak.mockResolvedValueOnce({
      current: 8,
      longest: 15,
      readToday: true,
      lastReadDate: '2026-11-28',
      streakType: 'daily',
      freezesLeft: 0,
      days,
    });

    const wrapper = mountView();
    await flushPromises();

    const streakEl = wrapper.get('.streak');
    expect(streakEl.get('.summary').text()).toContain('8 days, longest 15');
    expect(streakEl.get('.summary').text()).toContain('0 freezes left');
    const readDays = wrapper.findAll('.streak .day.read');
    expect(readDays.length).toBe(8);
  });

  it('shows an error and empty streak, not mock data, when the API fails', async () => {
    api.getMe.mockRejectedValueOnce(new Error('Network error'));
    getStreak.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mountView();
    await flushPromises();

    // No made-up reader or streak is shown in place of real data.
    expect(wrapper.find('.plate').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('could not load your profile');
    expect(wrapper.get('.streak .summary').text()).toContain('No streak yet');
    expect(wrapper.findAll('.streak .day.read').length).toBe(0);
  });

  it('shows no error when everything loads', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    getStreak.mockResolvedValueOnce({
      current: 0,
      longest: 0,
      readToday: false,
      lastReadDate: null,
      streakType: 'daily',
      freezesLeft: 0,
      days: [],
    });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get('.plate .name').text()).toBe('Eleanor Whitmore');
  });
});
