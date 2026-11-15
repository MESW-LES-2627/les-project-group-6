import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBookDetail, mockLibrary } from '@/mocks/library';
import type { LibraryBook, TagSummary } from '@/types/library';
import BookReadingPanel from '../BookReadingPanel.vue';

const api = vi.hoisted(() => ({
  tagBook: vi.fn<(bookId: string, name: string) => Promise<TagSummary>>(),
  untagBook: vi.fn<(bookId: string, tagId: string) => Promise<void>>(async () => {}),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const BOOK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BORROWED = '11111111-1111-4111-8111-111111111111';
const AUDIOBOOK = '22222222-2222-4222-8222-222222222222';

const base = mockLibrary.books[0]!;
const book = (tagIds: string[]): LibraryBook => ({ ...base, id: BOOK_ID, tagIds });

function mountPanel(tagIds: string[], tags: TagSummary[]) {
  return mount(BookReadingPanel, {
    props: { book: book(tagIds), detail: getBookDetail(base), folders: [], tags },
    global: { stubs: { RouterLink: true } },
  });
}

describe('BookReadingPanel tags', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the book tags as chips', () => {
    const wrapper = mountPanel(
      [BORROWED],
      [
        { id: BORROWED, name: 'borrowed', count: 1 },
        { id: AUDIOBOOK, name: 'audiobook', count: 2 },
      ],
    );

    const chips = wrapper.findAll('.tag-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0]!.text()).toContain('borrowed');
  });

  it('adds a tag through the API, normalised to lower case', async () => {
    api.tagBook.mockResolvedValue({ id: AUDIOBOOK, name: 'audiobook', count: 3 });
    const wrapper = mountPanel([], [{ id: AUDIOBOOK, name: 'audiobook', count: 2 }]);

    await wrapper.get('.tag-input').setValue('  AudioBook ');
    await wrapper.get('.tag-form').trigger('submit');
    await flushPromises();

    expect(api.tagBook).toHaveBeenCalledWith(BOOK_ID, 'audiobook');
    expect(wrapper.emitted('tagsUpdated')![0]![0]).toEqual({
      tagIds: [AUDIOBOOK],
      tags: [{ id: AUDIOBOOK, name: 'audiobook', count: 3 }],
    });
    expect((wrapper.get('.tag-input').element as HTMLInputElement).value).toBe('');
  });

  it('removes a tag and drops it when no book has it any more', async () => {
    const wrapper = mountPanel([BORROWED], [{ id: BORROWED, name: 'borrowed', count: 1 }]);

    await wrapper.get('.tag-remove').trigger('click');
    await flushPromises();

    expect(api.untagBook).toHaveBeenCalledWith(BOOK_ID, BORROWED);
    expect(wrapper.emitted('tagsUpdated')![0]![0]).toEqual({ tagIds: [], tags: [] });
    expect(wrapper.text()).toContain('No tags');
  });

  it('shows the error and keeps the tags when saving fails', async () => {
    api.tagBook.mockRejectedValue(new Error('Failed to add the tag'));
    const wrapper = mountPanel([], []);

    await wrapper.get('.tag-input').setValue('reread');
    await wrapper.get('.tag-form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Failed to add the tag');
    expect(wrapper.emitted('tagsUpdated')).toBeUndefined();
  });

  it('rejects tags longer than 40 characters without calling the API', async () => {
    const wrapper = mountPanel([], []);

    await wrapper.get('.tag-input').setValue('x'.repeat(41));
    await wrapper.get('.tag-form').trigger('submit');

    expect(api.tagBook).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain('at most 40 characters');
  });
});
