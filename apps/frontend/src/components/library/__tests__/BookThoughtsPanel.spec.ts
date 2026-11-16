// @req F-LIB-02
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiReview } from '@/services/api';
import type { ReadingStatus } from '@/types/library';
import BookThoughtsPanel from '../BookThoughtsPanel.vue';

const api = vi.hoisted(() => ({
  saveReview:
    vi.fn<(bookId: string, review: { rating: number; comment: string }) => Promise<void>>(),
  deleteReview: vi.fn<(bookId: string) => Promise<void>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const review: ApiReview = {
  id: 'r1',
  bookId: 'b1',
  rating: 4,
  comment: 'Great world building',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  author: { id: 'u1', username: 'me', displayName: 'Me', photoUrl: null },
};

const mountPanel = (status: ReadingStatus = 'finished', current: ApiReview | null = null) =>
  mount(BookThoughtsPanel, { props: { bookId: 'b1', status, review: current } });

describe('BookThoughtsPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('disables the controls with a hint when the book is not started', () => {
    const wrapper = mountPanel('not-started');
    expect(wrapper.text()).toContain('Start reading this book to rate and review it.');
    expect(wrapper.findAll('.star').every((s) => s.attributes('disabled') !== undefined)).toBe(
      true,
    );
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.save-button').attributes('disabled')).toBeDefined();
  });

  it('does not offer the old audience selector', () => {
    expect(mountPanel().find('.audience').exists()).toBe(false);
  });

  it('saves the rating and comment and tells the page', async () => {
    api.saveReview.mockResolvedValueOnce();
    const wrapper = mountPanel('finished');
    await wrapper.findAll('.star')[3]!.trigger('click');
    await wrapper.get('textarea').setValue('Great world building');
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(api.saveReview).toHaveBeenCalledWith('b1', {
      rating: 4,
      comment: 'Great world building',
    });
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('starts from my existing review and saves the edit', async () => {
    api.saveReview.mockResolvedValueOnce();
    const wrapper = mountPanel('in-progress', review);
    expect(wrapper.get('textarea').element.value).toBe('Great world building');
    await wrapper.findAll('.star')[4]!.trigger('click');
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(api.saveReview).toHaveBeenCalledWith('b1', {
      rating: 5,
      comment: 'Great world building',
    });
  });

  it('deletes my review after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    api.deleteReview.mockResolvedValueOnce();
    const wrapper = mountPanel('finished', review);
    await wrapper.get('.delete-button').trigger('click');
    await flushPromises();
    expect(api.deleteReview).toHaveBeenCalledWith('b1');
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('keeps the review when the deletion is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const wrapper = mountPanel('finished', review);
    await wrapper.get('.delete-button').trigger('click');
    expect(api.deleteReview).not.toHaveBeenCalled();
  });

  it('shows the server message when saving fails', async () => {
    api.saveReview.mockRejectedValueOnce(new ApiError('Rating must be between 1 and 5', 400));
    const wrapper = mountPanel('finished', review);
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Rating must be between 1 and 5');
    expect(wrapper.emitted('changed')).toBeUndefined();
  });
});
