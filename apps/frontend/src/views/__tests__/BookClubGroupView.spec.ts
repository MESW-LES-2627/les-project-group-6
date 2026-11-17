// @req F-GRP-07 F-GRP-08
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockClub } from '@/mocks/groups';
import router from '@/router';
import type { ApiBook } from '@/services/api';
import type { BookClubDetail, GroupMember } from '@/types/groups';
import BookClubGroupView from '../BookClubGroupView.vue';

const api = vi.hoisted(() => ({
  getFriends: vi.fn<typeof import('@/services/api').getFriends>(),
  inviteToGroup: vi.fn<typeof import('@/services/api').inviteToGroup>(),
  openPoll: vi.fn<typeof import('@/services/api').openPoll>(),
  proposeBook: vi.fn<typeof import('@/services/api').proposeBook>(),
  startNextRound: vi.fn<typeof import('@/services/api').startNextRound>(),
  voteForProposal: vi.fn<typeof import('@/services/api').voteForProposal>(),
  searchBooks: vi.fn<typeof import('@/services/api').searchBooks>(),
  getGroupMessages: vi.fn<typeof import('@/services/api').getGroupMessages>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));
// The live chat would open a socket; these tests only need it to exist.
vi.mock('@/services/chat-socket', () => ({ connectChatSocket: () => ({ close: () => {} }) }));

const NEW_FRIEND: GroupMember = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b09',
  name: 'Rosa Diaz',
  initials: 'RD',
  handle: 'rosareads',
};
const PIRANESI: ApiBook = {
  id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
  title: 'Piranesi',
  description: null,
  isbn13: null,
  pageCount: 272,
  coverUrl: null,
};

const liveClub = (overrides: Partial<BookClubDetail> = {}): BookClubDetail => ({
  ...mockClub,
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380c09',
  isAdmin: true,
  roundOver: true,
  ...overrides,
});

function mountClub(club: BookClubDetail) {
  return mount(BookClubGroupView, {
    props: { club, meId: mockClub.members[0]!.id, live: true },
    global: { plugins: [router] },
  });
}

const button = (wrapper: ReturnType<typeof mountClub>, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)!;

async function openAdmin(wrapper: ReturnType<typeof mountClub>) {
  await button(wrapper, 'Admin & settings').trigger('click');
  await flushPromises();
}

async function pickBook(wrapper: ReturnType<typeof mountClub>, inputId: string) {
  await wrapper.get(`#${inputId}`).setValue('Pira');
  await vi.waitFor(() => expect(wrapper.find('.result').exists()).toBe(true));
  await wrapper.get('.result').trigger('click');
}

describe('BookClubGroupView (live)', () => {
  beforeEach(() => {
    api.getGroupMessages.mockResolvedValue([]);
    api.getFriends.mockResolvedValue([mockClub.members[1]!, NEW_FRIEND]);
    api.searchBooks.mockResolvedValue([PIRANESI]);
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lists only friends outside the club and invites one', async () => {
    api.inviteToGroup.mockResolvedValue({} as never);
    const club = liveClub();
    const wrapper = mountClub(club);
    await openAdmin(wrapper);

    const names = wrapper.findAll('.friend-name').map((n) => n.text());
    expect(names).toEqual(['Rosa Diaz']);

    await button(wrapper, 'Invite').trigger('click');
    await flushPromises();

    expect(api.inviteToGroup).toHaveBeenCalledWith(club.id, NEW_FRIEND.id);
    expect(wrapper.get('[role="status"]').text()).toBe('Invite sent to Rosa Diaz.');
    expect(button(wrapper, 'Invited').attributes('disabled')).toBeDefined();
  });

  it('shows the error when an invite fails', async () => {
    api.inviteToGroup.mockRejectedValue(new Error('Not your friend'));
    const wrapper = mountClub(liveClub());
    await openAdmin(wrapper);

    await button(wrapper, 'Invite').trigger('click');
    await flushPromises();

    expect(wrapper.get('.action-error').text()).toBe('Not your friend');
    expect(button(wrapper, 'Invite').attributes('disabled')).toBeUndefined();
  });

  it('opens a named, closing-at-18:00 vote and asks the page to reload', async () => {
    api.openPoll.mockResolvedValue({} as never);
    const club = liveClub({ voting: null });
    const wrapper = mountClub(club);
    await openAdmin(wrapper);

    await wrapper.get('#poll-closes').setValue('2026-12-01');
    await wrapper.get('[role="switch"][aria-label="Anonymous proposals"]').trigger('click');
    await wrapper.findAll('form.admin-block')[0]!.trigger('submit');
    await flushPromises();

    expect(api.openPoll).toHaveBeenCalledWith(club.id, {
      closesAt: new Date('2026-12-01T18:00:00').toISOString(),
      anonymous: false,
    });
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('shows the server error when opening the vote fails', async () => {
    api.openPoll.mockRejectedValue(new Error('A vote is already open'));
    const wrapper = mountClub(liveClub({ voting: null }));
    await openAdmin(wrapper);

    await wrapper.findAll('form.admin-block')[0]!.trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('A vote is already open');
    expect(wrapper.emitted('changed')).toBeUndefined();
  });

  it('starts the next round with the picked book and deadline', async () => {
    api.startNextRound.mockResolvedValue({} as never);
    const club = liveClub();
    const wrapper = mountClub(club);
    await openAdmin(wrapper);

    const start = button(wrapper, 'Start next round');
    expect(start.attributes('disabled')).toBeDefined();
    await pickBook(wrapper, 'next-book');
    await wrapper.get('#next-deadline').setValue('2027-01-15');
    expect(start.attributes('disabled')).toBeUndefined();
    await wrapper.findAll('form.admin-block')[1]!.trigger('submit');
    await flushPromises();

    expect(api.startNextRound).toHaveBeenCalledWith(club.id, {
      bookId: PIRANESI.id,
      deadline: '2027-01-15',
    });
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('does not start a round without a book', async () => {
    const wrapper = mountClub(liveClub());
    await openAdmin(wrapper);

    await wrapper.findAll('form.admin-block')[1]!.trigger('submit');
    await flushPromises();

    expect(api.startNextRound).not.toHaveBeenCalled();
  });

  it('proposes a catalog book to the open vote', async () => {
    api.proposeBook.mockResolvedValue({} as never);
    const club = liveClub();
    const wrapper = mountClub(club);

    // Submitting before picking a book does nothing.
    await wrapper.get('.proposal').trigger('submit');
    expect(api.proposeBook).not.toHaveBeenCalled();

    await pickBook(wrapper, 'proposal-title');
    await wrapper.get('.proposal').trigger('submit');
    await flushPromises();

    expect(api.proposeBook).toHaveBeenCalledWith(club.id, PIRANESI.id);
    expect(wrapper.emitted('changed')).toHaveLength(1);
    // The picker is cleared for the next proposal.
    expect(wrapper.find('#proposal-title').exists()).toBe(true);
  });

  it('shows the error when loading friends fails', async () => {
    api.getFriends.mockRejectedValue(new Error('Failed to load friends'));
    const wrapper = mountClub(liveClub());
    await openAdmin(wrapper);

    expect(wrapper.get('.action-error').text()).toBe('Failed to load friends');
    expect(wrapper.text()).toContain('All your friends are already here.');
  });
});

describe('BookClubGroupView (mock club)', () => {
  it('counts a first vote locally without calling the API', async () => {
    const club: BookClubDetail = {
      ...mockClub,
      voting: { ...mockClub.voting!, yourVote: null, voted: 2 },
    };
    const wrapper = mount(BookClubGroupView, { props: { club }, global: { plugins: [router] } });
    const first = club.voting!.options[0]!;

    expect(wrapper.text()).toContain(`2 of ${club.voting!.total} have voted`);
    await button(wrapper, `Vote for ${first.title}`).trigger('click');

    expect(wrapper.text()).toContain(`3 of ${club.voting!.total} have voted`);
    expect(wrapper.findAll('.options > li')[0]!.get('.your-vote').text()).toBe('Your vote');
    expect(api.voteForProposal).not.toHaveBeenCalled();
  });
});
