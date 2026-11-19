// @req F-READ-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBook,
  ApiBookClub,
  ApiChallengeGroup,
  ApiLibraryItem,
  ApiReadingSession,
} from '@/services/api';
import ActiveSessionView from '../ActiveSessionView.vue';

const api = vi.hoisted(() => ({
  getUserLibrary: vi.fn<() => Promise<ApiLibraryItem[]>>(),
  getBook: vi.fn<(bookId: string) => Promise<ApiBook>>(),
  getUserGroups: vi.fn<() => Promise<ApiChallengeGroup[]>>(),
  getUserBookClubs: vi.fn<() => Promise<ApiBookClub[]>>(),
  startReadingSession: vi.fn<(bookId: string) => Promise<ApiReadingSession>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const EMMA: ApiBook = {
  id: 'emma',
  title: 'Emma',
  authors: ['Jane Austen'],
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
};

const challenge = (id: string, name: string, status: ApiChallengeGroup['status']) =>
  ({
    id,
    name,
    description: '',
    adminId: 'u1',
    status,
    challenge: {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      winMetric: 'minutes',
      metricGoal: 0,
    },
    members: [],
    createdAt: '2026-10-01T00:00:00Z',
  }) satisfies ApiChallengeGroup;

const club = (id: string, name: string, bookId: string): ApiBookClub => ({
  id,
  name,
  description: '',
  adminId: 'u1',
  members: [],
  round: {
    id: `${id}-r1`,
    number: 1,
    startDate: '2026-11-01',
    deadline: '2026-11-30',
    outcome: 'active',
    finished: 0,
    expected: 3,
    daysLeft: 13,
    book: { id: bookId, title: 'A book', authors: [], pageCount: 300, coverUrl: null },
  },
  createdAt: '2026-10-01T00:00:00Z',
});

async function mountView(bookId = 'emma') {
  const wrapper = mount(ActiveSessionView, { props: { bookId }, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  api.getUserLibrary.mockResolvedValue([
    {
      id: 'li-emma',
      book: EMMA,
      status: 'in-progress',
      currentPage: 294,
      updatedAt: '2026-11-10T00:00:00Z',
    },
  ]);
  api.getBook.mockRejectedValue(new Error('Book not found'));
  api.getUserGroups.mockResolvedValue([
    challenge('sprint', 'November Sprint', 'active'),
    challenge('later', 'December Dash', 'scheduled'),
  ]);
  api.getUserBookClubs.mockResolvedValue([
    club('classics', 'Classics', 'emma'),
    club('other', 'Sci-fi club', 'dune'),
  ]);
  api.startReadingSession.mockImplementation(async (bookId) => ({
    id: 'session-1',
    userId: 'u1',
    bookId,
    startedAt: '2026-11-17T10:00:00.000Z',
    endedAt: null,
    elapsedSeconds: 28 * 60 + 14,
    countedMinutes: 0,
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ActiveSessionView', () => {
  it('shows the server session, the book from the library and its progress', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Just you and the next chapter.');
    expect(wrapper.get('.session-subtitle').text()).toContain('Emma');
    expect(wrapper.get('.session-book-title').text()).toBe('Emma');
    expect(wrapper.get('.session-book-author').text()).toBe('Jane Austen');
    expect(wrapper.get('.timer-time').text()).toBe('00:28:14');
    expect(wrapper.get('.session-meta').text()).toContain('Start page 294');
    expect(wrapper.get('.page-count').text()).toBe('294 / 474 pages');
    expect(api.getBook).not.toHaveBeenCalled();
  });

  it('lists the active challenges and the clubs reading this book as eligible groups', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('.eligible-groups').text()).toBe('2 eligible groups');
    const groups = wrapper.get('.groups').text();
    expect(groups).toContain('November Sprint');
    expect(groups).toContain('Classics');
    expect(groups).not.toContain('December Dash');
    expect(groups).not.toContain('Sci-fi club');
  });

  it('shows only rules the server enforces', async () => {
    const wrapper = await mountView();

    const rules = wrapper.get('.rules-card').text();
    expect(rules).toContain('Only finished sessions count towards streaks and groups');
    expect(rules).not.toContain('cap');
  });

  it('says no group counts the session when the reader has none', async () => {
    api.getUserGroups.mockResolvedValue([]);
    api.getUserBookClubs.mockResolvedValue([]);
    const wrapper = await mountView();

    expect(wrapper.get('.eligible-groups').text()).toBe('0 eligible groups');
    expect(wrapper.get('.counts-card').text()).toContain('No active group counts this session.');
  });

  it('keeps the page and percentage inputs in sync', async () => {
    const wrapper = await mountView();
    const [pageInput, percentageInput] = wrapper.findAll('input');

    await pageInput!.setValue('237');
    expect(wrapper.get('.progress-note').text()).toBe('+0 pages since you started');
    expect(wrapper.get('.page-count').text()).toBe('237 / 474 pages');
    expect(percentageInput!.element.value).toBe('50');

    await percentageInput!.setValue('25');
    expect(pageInput!.element.value).toBe('119');
    expect(wrapper.get('.page-count').text()).toBe('119 / 474 pages');
  });

  it('shows a friendly message for an unknown book id', async () => {
    const wrapper = await mountView('missing-book');

    expect(wrapper.get('h1').text()).toBe('Session not found');
    expect(api.startReadingSession).not.toHaveBeenCalled();
    expect(wrapper.get('.missing-link').attributes('href')).toBe('/library');
  });
});
