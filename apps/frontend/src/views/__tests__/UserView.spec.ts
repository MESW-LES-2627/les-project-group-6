import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import {
  ApiError,
  type ApiFriendship,
  type ApiProfileReview,
  type ApiUserProfile,
} from '@/services/api';
import UserView from '../UserView.vue';

const api = vi.hoisted(() => ({
  getUserProfile: vi.fn<(username: string) => Promise<ApiUserProfile>>(),
  getUserReviews: vi.fn<(userId: string) => Promise<ApiProfileReview[]>>(async () => []),
  sendFriendRequest: vi.fn<(targetUserId: string) => Promise<ApiFriendship>>(),
  acceptFriendRequest: vi.fn<(id: string) => Promise<ApiFriendship>>(),
  declineFriendRequest: vi.fn<(id: string) => Promise<void>>(),
  removeFriend: vi.fn<(userId: string) => Promise<void>>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'profile', component: { template: '<div>Profile</div>' } },
      { path: '/users/:username', name: 'user-profile', component: UserView, props: true },
      { path: '/explore', name: 'explore', component: { template: '<div>Explore</div>' } },
      { path: '/library/:bookId', name: 'book-detail', component: { template: '<div>Book</div>' } },
    ],
  });
  return router;
}

async function mountView(username = 'alice_reads', router = createTestRouter()) {
  await router.push(`/users/${username}`);
  return mount(UserView, {
    props: { username },
    global: { plugins: [router] },
  });
}

const mockProfile: ApiUserProfile = {
  id: 'u-123',
  username: 'alice_reads',
  displayName: 'Alice Wonderland',
  photoUrl: null,
  bio: 'Curious reader in wonderlands.',
  timezone: 'Europe/Lisbon',
  profileVisibility: 'public',
  createdAt: '2026-03-01T12:00:00.000Z',
  isSelf: false,
  isVisible: true,
  friendshipStatus: 'none',
  friendRequestId: null,
  currentStreak: 5,
  longestStreak: 12,
  totalMinutes: 180,
  sessionsCount: 6,
};

describe('UserView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /profile when viewing oneself (isSelf = true)', async () => {
    const router = createTestRouter();
    await router.push('/users/alice_reads');
    const replaceSpy = vi.spyOn(router, 'replace');

    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      isSelf: true,
    });

    await mountView('alice_reads', router);
    await flushPromises();

    expect(replaceSpy).toHaveBeenCalledWith({ name: 'profile' });
  });

  it('displays user not found when username does not exist (404)', async () => {
    api.getUserProfile.mockRejectedValueOnce(new ApiError('User not found', 404));

    const wrapper = await mountView('nobody');
    await flushPromises();

    expect(wrapper.text()).toContain('User not found');
    expect(wrapper.text()).toContain('@nobody');
  });

  it('displays public user profile with name, streak, reading time and Add friend button', async () => {
    api.getUserProfile.mockResolvedValueOnce({ ...mockProfile });
    api.getUserReviews.mockResolvedValueOnce([
      {
        book: {
          id: 'b-1',
          title: 'Pride and Prejudice',
          coverUrl: null,
        },
        rating: 5,
        comment: 'A masterpiece.',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
    ]);

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    expect(wrapper.get('.name').text()).toBe('Alice Wonderland');
    expect(wrapper.get('.secondary').text()).toContain('@alice_reads');
    expect(wrapper.get('.bio').text()).toBe('Curious reader in wonderlands.');

    // Reading stats & streak
    expect(wrapper.find('.reading-time').exists()).toBe(true);
    expect(wrapper.get('.reading-time .number').text()).toBe('180');
    expect(wrapper.find('.streak').exists()).toBe(true);

    // Reviews
    expect(wrapper.find('.profile-reviews').exists()).toBe(true);
    expect(wrapper.text()).toContain('Pride and Prejudice');

    // Add friend button
    const addBtn = wrapper.find('.action-button.primary');
    expect(addBtn.exists()).toBe(true);
    expect(addBtn.text()).toBe('Add friend');
  });

  it('sends a friend request when Add friend is clicked', async () => {
    api.getUserProfile.mockResolvedValueOnce({ ...mockProfile, friendshipStatus: 'none' });
    api.sendFriendRequest.mockResolvedValueOnce({
      id: 'freq-1',
      requesterId: 'viewer-1',
      addresseeId: 'u-123',
      status: 'pending',
      createdAt: '2026-11-14T00:00:00.000Z',
      respondedAt: null,
    });

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    const addBtn = wrapper.get('.action-button.primary');
    await addBtn.trigger('click');
    await flushPromises();

    expect(api.sendFriendRequest).toHaveBeenCalledWith('u-123');
    expect(wrapper.text()).toContain('Friend request sent');
  });

  it('displays pending sent request status', async () => {
    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      friendshipStatus: 'pending_sent',
      friendRequestId: 'freq-1',
    });

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    expect(wrapper.find('.status-badge.pending').exists()).toBe(true);
    expect(wrapper.text()).toContain('Friend request sent');
  });

  it('allows accepting a pending received friend request', async () => {
    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      friendshipStatus: 'pending_received',
      friendRequestId: 'freq-2',
    });
    api.acceptFriendRequest.mockResolvedValueOnce({
      id: 'freq-2',
      requesterId: 'u-123',
      addresseeId: 'viewer-1',
      status: 'accepted',
      createdAt: '2026-11-14T00:00:00.000Z',
      respondedAt: '2026-11-14T00:01:00.000Z',
    });

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    expect(wrapper.text()).toContain('Accept request');
    expect(wrapper.text()).toContain('Decline');

    const acceptBtn = wrapper.get('.action-button.primary');
    await acceptBtn.trigger('click');
    await flushPromises();

    expect(api.acceptFriendRequest).toHaveBeenCalledWith('freq-2');
    expect(wrapper.text()).toContain('Friends');
  });

  it('allows declining a pending received friend request', async () => {
    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      friendshipStatus: 'pending_received',
      friendRequestId: 'freq-2',
    });
    api.declineFriendRequest.mockResolvedValueOnce();

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    const declineBtn = wrapper.get('.action-button.secondary');
    await declineBtn.trigger('click');
    await flushPromises();

    expect(api.declineFriendRequest).toHaveBeenCalledWith('freq-2');
    expect(wrapper.text()).toContain('Add friend');
  });

  it('displays confirmed friends and allows removing friend', async () => {
    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      friendshipStatus: 'friends',
    });
    api.removeFriend.mockResolvedValueOnce();

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    expect(wrapper.text()).toContain('Friends');

    const removeBtn = wrapper.get('.remove-friend-button');
    await removeBtn.trigger('click');
    await flushPromises();

    expect(api.removeFriend).toHaveBeenCalledWith('u-123');
    expect(wrapper.text()).toContain('Add friend');
  });

  it('displays private profile message and hides activity when isVisible is false', async () => {
    api.getUserProfile.mockResolvedValueOnce({
      ...mockProfile,
      profileVisibility: 'private',
      isVisible: false,
      friendshipStatus: 'none',
      totalMinutes: 0,
      sessionsCount: 0,
      currentStreak: 0,
      longestStreak: 0,
    });

    const wrapper = await mountView('alice_reads');
    await flushPromises();

    expect(wrapper.find('.private-card').exists()).toBe(true);
    expect(wrapper.text()).toContain('This profile is private');
    expect(wrapper.text()).toContain('Send a friend request to @alice_reads');

    // Stats and reviews are hidden
    expect(wrapper.find('.reading-time').exists()).toBe(false);
    expect(wrapper.find('.streak').exists()).toBe(false);
    expect(wrapper.find('.profile-reviews').exists()).toBe(false);
  });
});
