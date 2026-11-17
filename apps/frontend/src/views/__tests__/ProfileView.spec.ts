// @req F-PROF-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import {
  ApiError,
  type ApiMe,
  type ApiProfileReview,
  type ApiReadingStats,
  type ApiStreak,
} from '@/services/api';
import ProfileView from '../ProfileView.vue';

const getReadingStats = vi.hoisted(() => vi.fn<() => Promise<ApiReadingStats>>());
const getStreak = vi.hoisted(() => vi.fn<() => Promise<ApiStreak>>());
const api = vi.hoisted(() => ({
  getMe: vi.fn<() => Promise<ApiMe>>(async () => ({ id: 'me-id' }) as ApiMe),
  getUserReviews: vi.fn<(userId: string) => Promise<ApiProfileReview[]>>(async () => []),
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

  it('keeps the mock reading time when the API is unreachable', async () => {
    getReadingStats.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.reading-time .number').text()).toBe('4260');
    expect(wrapper.get('.reading-time .sessions').text()).toBe('across 96 sessions');
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
      bio: 'Avid sci-fi reader',
      timezone: 'Europe/Lisbon',
      photoUrl: null,
      profileVisibility: 'public',
      createdAt: '2026-05-15T12:00:00Z',
    });
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
      hitStreak: true,
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

  it('falls back to mock profile and streak when API fails', async () => {
    api.getMe.mockRejectedValueOnce(new Error('Network error'));
    getStreak.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mountView();
    await flushPromises();

    // Eleanor Whitmore is the mock user
    expect(wrapper.get('.plate .name').text()).toBe('Eleanor Whitmore');
    expect(wrapper.get('.streak .summary').text()).toContain('12 days, longest 21');
  });
});
