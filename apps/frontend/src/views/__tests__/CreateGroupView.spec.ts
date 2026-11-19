// @req F-GRP-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBook,
  ApiBookClub,
  ApiChallengeGroup,
  ApiGroupInvite,
  CreateBookClubPayload,
  CreateChallengeGroupPayload,
} from '@/services/api';
import type { GroupMember } from '@/types/groups';
import CreateGroupView from '../CreateGroupView.vue';

const createChallengeGroup = vi.hoisted(() =>
  vi.fn<(payload: CreateChallengeGroupPayload) => Promise<ApiChallengeGroup>>(),
);

const createBookClub = vi.hoisted(() =>
  vi.fn<(payload: CreateBookClubPayload) => Promise<ApiBookClub>>(),
);
const getFriends = vi.hoisted(() => vi.fn<() => Promise<GroupMember[]>>());
const inviteToGroup = vi.hoisted(() =>
  vi.fn<(groupId: string, inviteeId: string) => Promise<ApiGroupInvite>>(),
);
const searchBooks = vi.hoisted(() => vi.fn<(title: string) => Promise<ApiBook[]>>());

// The app router's guard only lets a signed-in reader through.
vi.mock('@/stores/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/session')>();
  const { readySession } = await import('@/stores/__tests__/fake-session');
  return { ...actual, session: readySession(actual.createSession) };
});

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  createChallengeGroup,
  createBookClub,
  getFriends,
  inviteToGroup,
  searchBooks,
}));

const MAYA = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
  name: 'Maya Laurent',
  initials: 'ML',
  handle: 'mayareads',
};
const JONAH = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
  name: 'Jonah Ellis',
  initials: 'JE',
  handle: 'jonahreads',
};
const EMMA: ApiBook = {
  id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  title: 'Emma',
  authors: [],
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
};

function mountView() {
  return mount(CreateGroupView, { global: { plugins: [router] } });
}

describe('CreateGroupView', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  beforeEach(() => {
    // The form starts on today's date: pin it to 1 November 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 1, 10, 0));
    getFriends.mockResolvedValue([MAYA, JONAH]);
  });

  it('starts empty, on today, with no friend invited', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect((wrapper.get('#group-name').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('#start-date').element as HTMLInputElement).value).toBe('2026-11-01');
    expect(wrapper.findAll('.friend[aria-pressed="true"]')).toHaveLength(0);
    expect(wrapper.get('button[type="submit"]').text()).toBe('Create group & send 0 invites');
  });

  it('lists only the friends from the API', async () => {
    const wrapper = mountView();
    await flushPromises();

    const names = wrapper.findAll('.friend').map((f) => f.text());
    expect(names).toHaveLength(2);
    expect(names.join(' ')).toContain('Maya Laurent');
    expect(names.join(' ')).toContain('Jonah Ellis');
  });

  it('says so when the friends cannot be loaded, without inventing any', async () => {
    getFriends.mockRejectedValue(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('.friend')).toHaveLength(0);
    expect(wrapper.get('.hint[role="alert"]').text()).toBe(
      'We could not load your friends. You can invite them later.',
    );
  });

  it('invites friends once the reader has some', async () => {
    getFriends.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Add friends to invite them to a group.');
  });

  it('previews the challenge as the form changes', async () => {
    const wrapper = mountView();
    const preview = wrapper.get('.glance');
    await wrapper.get('#group-name').setValue('November Pages');

    expect(preview.text()).toContain('November Pages');
    expect(preview.text()).toContain('1–30 November 2026');
    expect(preview.text()).toContain('Winner: most counted pages');

    await wrapper.get('#group-name').setValue('Winter Reads');
    await wrapper.get('#metric').setValue('minutes');

    expect(preview.text()).toContain('Winter Reads');
    expect(preview.text()).toContain('Winner: most counted minutes');
  });

  it('switches to the book club fields', async () => {
    const wrapper = mountView();

    expect(wrapper.get('.club-fields').attributes('disabled')).toBeDefined();

    await wrapper.findAll('.segment')[1]!.trigger('click');

    expect(wrapper.get('.club-fields').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('.group:not(.club-fields)').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#shape-title').text()).toBe('2. Shape the book club');
  });

  it('counts the invited friends in the button', async () => {
    const wrapper = mountView();
    await flushPromises();
    const submit = () => wrapper.get('button[type="submit"]').text();

    await wrapper.findAll('.friend')[0]!.trigger('click');
    expect(submit()).toBe('Create group & send 1 invite');

    await wrapper.findAll('.friend')[1]!.trigger('click');
    expect(submit()).toBe('Create group & send 2 invites');

    await wrapper.get('#friend-search').setValue('jonah');
    expect(wrapper.findAll('.friend')).toHaveLength(1);
  });

  it('asks for a name before creating the group', async () => {
    const wrapper = mountView();

    await wrapper.get('#group-name').setValue('');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#name-error').text()).toBe('Give your group a name.');
  });

  it('creates the challenge through the API and opens its page', async () => {
    const id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
    createChallengeGroup.mockResolvedValueOnce({ id } as ApiChallengeGroup);
    await router.push('/groups/new');
    const wrapper = mountView();
    await wrapper.get('#group-name').setValue('November Pages');

    await wrapper.get('form').trigger('submit');

    expect(createChallengeGroup).toHaveBeenCalledWith({
      name: 'November Pages',
      startDate: '2026-11-01',
      durationDays: 30,
      winMetric: 'pages',
    });
    await vi.waitFor(() => expect(router.currentRoute.value.params.groupId).toBe(id));
  });

  it('shows the server error when the challenge cannot be created', async () => {
    createChallengeGroup.mockRejectedValueOnce(new Error('Invalid start date: 2026-02-30'));
    const wrapper = mountView();
    await wrapper.get('#group-name').setValue('November Pages');

    await wrapper.get('form').trigger('submit');

    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain('Invalid start'));
  });

  it('asks for the club book before creating a book club', async () => {
    const wrapper = mountView();

    await wrapper.findAll('.segment')[1]!.trigger('click');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#book-error').text()).toBe('Pick the book the club will read.');
    expect(createBookClub).not.toHaveBeenCalled();
  });

  it('creates a book club with the picked book, invites friends and opens it', async () => {
    const id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a09';
    getFriends.mockResolvedValue([MAYA, JONAH]);
    searchBooks.mockResolvedValue([EMMA]);
    createBookClub.mockResolvedValueOnce({ id } as ApiBookClub);
    inviteToGroup.mockResolvedValue({} as ApiGroupInvite);
    await router.push('/groups/new');
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findAll('.segment')[1]!.trigger('click');
    await wrapper.get('#group-name').setValue('Classics');
    await wrapper.get('#club-book').setValue('Emm');
    await vi.waitFor(() => expect(wrapper.findAll('.result')).not.toHaveLength(0));
    await wrapper.get('.result').trigger('click');
    await wrapper.get('#round-deadline').setValue('2026-12-15');

    expect(wrapper.get('.glance').text()).toContain('Emma');
    await wrapper.findAll('.friend')[0]!.trigger('click');
    await wrapper.findAll('.friend')[1]!.trigger('click');
    await wrapper.get('form').trigger('submit');

    await vi.waitFor(() => expect(router.currentRoute.value.params.groupId).toBe(id));
    expect(createBookClub).toHaveBeenCalledWith({
      name: 'Classics',
      bookId: EMMA.id,
      deadline: '2026-12-15',
    });
    expect(inviteToGroup.mock.calls.map((c) => c[1]).sort()).toEqual([MAYA.id, JONAH.id].sort());
  });

  it('updates the preview from the challenge period, metric shortcut and fair-play rules', async () => {
    const wrapper = mountView();
    const preview = wrapper.get('.glance');

    // Back and forth between the two kinds keeps the challenge fields.
    await wrapper.findAll('.segment')[1]!.trigger('click');
    await wrapper.findAll('.segment')[0]!.trigger('click');
    expect(wrapper.get('#shape-title').text()).toBe('2. Shape the challenge');

    await wrapper.get('#start-date').setValue('2026-12-01');
    await wrapper.get('#duration').setValue('7');
    expect(preview.text()).toContain('1–7 December 2026');

    const streak = wrapper.findAll('.chip').find((b) => b.text() === 'Streak')!;
    await streak.trigger('click');
    expect(streak.attributes('aria-pressed')).toBe('true');
    expect(preview.text()).toContain('Winner: longest daily streak');

    const toggle = (label: string) => wrapper.get(`[role="switch"][aria-label="${label}"]`);
    await toggle('Simple timer').trigger('click');
    await toggle('Still-reading checks').trigger('click');
    await toggle('Pause for inactivity').trigger('click');
    await toggle('Require an end page').trigger('click');
    await wrapper.get('#daily-cap').setValue('45');

    expect(toggle('Simple timer').attributes('aria-checked')).toBe('false');
    expect(preview.text()).toContain('No timer · 45 min/day cap');
    expect(preview.text()).not.toContain('end page required');
    expect(preview.text()).toContain('Still-reading checks and inactivity pause on');
  });

  it('deselects an invited friend and shows the chosen picture name', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findAll('.friend')[0]!.trigger('click');
    await wrapper.findAll('.friend')[1]!.trigger('click');
    await wrapper.findAll('.friend')[0]!.trigger('click');
    expect(wrapper.findAll('.friend')[0]!.attributes('aria-pressed')).toBe('false');
    expect(wrapper.get('button[type="submit"]').text()).toBe('Create group & send 1 invite');

    const input = wrapper.get('#group-picture');
    Object.defineProperty(input.element, 'files', {
      value: [new File(['x'], 'shelf.png', { type: 'image/png' })],
    });
    await input.trigger('change');

    expect(wrapper.text()).toContain('shelf.png');
  });
});
