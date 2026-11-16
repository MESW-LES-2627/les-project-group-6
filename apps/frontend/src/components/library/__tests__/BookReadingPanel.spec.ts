// @req F-LIB-04
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import { getBookDetail } from '@/mocks/library';
import type { LibraryBook, TagSummary } from '@/types/library';
import BookReadingPanel from '../BookReadingPanel.vue';

const api = vi.hoisted(() => ({
  tagBook: vi.fn<(bookId: string, name: string) => Promise<TagSummary>>(),
  untagBook: vi.fn<(bookId: string, tagId: string) => Promise<void>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const BOOK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUDIO: TagSummary = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'audiobook',
  count: 1,
};
const REREAD: TagSummary = { id: '55555555-5555-4555-8555-555555555555', name: 'reread', count: 1 };

const makeBook = (id: string, tagIds: string[]): LibraryBook => ({
  id,
  title: 'Dune',
  author: 'Frank Herbert',
  cover: '/cover.png',
  status: 'in-progress',
  pages: 400,
  currentPage: 40,
  genre: 'Sci-fi',
  summary: '',
  folderIds: [],
  tagIds,
  chip: 'Reading',
  updatedAt: '2026-11-16T00:00:00Z',
});

function mountPanel(tagIds: string[] = [], tags: TagSummary[] = [AUDIO, REREAD], id = BOOK_ID) {
  const book = makeBook(id, tagIds);
  return mount(BookReadingPanel, {
    props: { book, detail: getBookDetail(book), folders: [], tags },
    global: { plugins: [router] },
  });
}

async function typeTag(wrapper: ReturnType<typeof mountPanel>, value: string) {
  await wrapper.get('.tag-input').setValue(value);
  await wrapper.get('.tag-form').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookReadingPanel tags', () => {
  it('shows "No tags" and a disabled add button for an untagged book', () => {
    const wrapper = mountPanel();

    expect(wrapper.get('.tag-empty').text()).toBe('No tags');
    expect(wrapper.get('.tag-add').attributes('disabled')).toBeDefined();
  });

  it('shows every tag on the book by name', () => {
    const wrapper = mountPanel([AUDIO.id, REREAD.id]);

    const chips = wrapper.findAll('.tag-chip').map((chip) => chip.text().replace('×', '').trim());
    expect(chips).toEqual(['audiobook', 'reread']);
    expect(wrapper.find('.tag-empty').exists()).toBe(false);
  });

  it('adds a normalised tag through the API and emits it', async () => {
    const created = { id: '66666666-6666-4666-8666-666666666666', name: 'borrowed', count: 1 };
    api.tagBook.mockResolvedValue(created);
    const wrapper = mountPanel();

    await typeTag(wrapper, '  Borrowed  ');

    expect(api.tagBook).toHaveBeenCalledWith(BOOK_ID, 'borrowed');
    expect(wrapper.emitted('tagAdded')).toEqual([[created]]);
    expect((wrapper.get('.tag-input').element as HTMLInputElement).value).toBe('');
  });

  it('does not call the API for a tag the book already has', async () => {
    const wrapper = mountPanel([AUDIO.id]);

    await typeTag(wrapper, 'AudioBook');

    expect(api.tagBook).not.toHaveBeenCalled();
    expect(wrapper.get('.tag-message').text()).toBe('This book already has the tag "audiobook"');
  });

  it('ignores a blank tag', async () => {
    const wrapper = mountPanel();

    await typeTag(wrapper, '   ');

    expect(api.tagBook).not.toHaveBeenCalled();
    expect(wrapper.emitted('tagAdded')).toBeUndefined();
  });

  it('shows the API error and keeps the typed tag when adding fails', async () => {
    api.tagBook.mockRejectedValue(new Error('Failed to add the tag'));
    const wrapper = mountPanel();

    await typeTag(wrapper, 'borrowed');

    expect(wrapper.get('.tag-message').text()).toBe('Failed to add the tag');
    expect((wrapper.get('.tag-input').element as HTMLInputElement).value).toBe('borrowed');
    expect(wrapper.emitted('tagAdded')).toBeUndefined();
  });

  it('removes a tag through the API and emits its id', async () => {
    api.untagBook.mockResolvedValue();
    const wrapper = mountPanel([AUDIO.id, REREAD.id]);

    await wrapper.get('[aria-label="Remove tag reread"]').trigger('click');
    await flushPromises();

    expect(api.untagBook).toHaveBeenCalledWith(BOOK_ID, REREAD.id);
    expect(wrapper.emitted('tagRemoved')).toEqual([[REREAD.id]]);
  });

  it('shows the API error when removing fails', async () => {
    api.untagBook.mockRejectedValue(new Error('Failed to remove the tag'));
    const wrapper = mountPanel([AUDIO.id]);

    await wrapper.get('[aria-label="Remove tag audiobook"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('.tag-message').text()).toBe('Failed to remove the tag');
    expect(wrapper.emitted('tagRemoved')).toBeUndefined();
  });

  it('tags a mock book locally, reusing a known tag, without the API', async () => {
    const wrapper = mountPanel([], [AUDIO], 'emma');

    await typeTag(wrapper, 'audiobook');
    await typeTag(wrapper, 'borrowed');
    await wrapper.setProps({ book: makeBook('emma', [AUDIO.id]) });
    await wrapper.get('[aria-label="Remove tag audiobook"]').trigger('click');

    expect(api.tagBook).not.toHaveBeenCalled();
    expect(api.untagBook).not.toHaveBeenCalled();
    const added = wrapper.emitted<[TagSummary]>('tagAdded')!.map(([tag]) => tag.name);
    expect(added).toEqual(['audiobook', 'borrowed']);
    expect(wrapper.emitted('tagRemoved')).toEqual([[AUDIO.id]]);
  });
});
