// @req F-LIB-04 F-LIB-01 F-READ-01
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type { FolderSummary, LibraryBook, TagSummary } from '@/types/library';
import { toIsoDate } from '@/utils/groups';
import BookReadingPanel from '../BookReadingPanel.vue';

const api = vi.hoisted(() => ({
  getActiveReadingSession: vi.fn<() => Promise<import('@/services/api').ApiReadingSession | null>>(
    async () => null,
  ),
  tagBook: vi.fn<(bookId: string, name: string) => Promise<TagSummary>>(),
  untagBook: vi.fn<(bookId: string, tagId: string) => Promise<void>>(),
  updateReadingStatus: vi.fn<(payload: unknown) => Promise<void>>(),
  addBookToFolder: vi.fn<(folderId: string, bookId: string) => Promise<void>>(),
  removeBookFromFolder: vi.fn<(folderId: string, bookId: string) => Promise<void>>(),
  removeFromLibrary: vi.fn<(bookId: string) => Promise<void>>(),
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
  summary: '',
  folderIds: [],
  tagIds,
  chip: 'Reading',
  updatedAt: '2026-11-16T00:00:00Z',
});

function mountPanel(
  tagIds: string[] = [],
  tags: TagSummary[] = [AUDIO, REREAD],
  id = BOOK_ID,
  overrides: Partial<LibraryBook> = {},
  folders: FolderSummary[] = [],
) {
  const book = { ...makeBook(id, tagIds), ...overrides };
  return mount(BookReadingPanel, {
    props: { book, folders, tags },
    global: { plugins: [router] },
  });
}

async function typeTag(wrapper: ReturnType<typeof mountPanel>, value: string) {
  await wrapper.get('.tag-input').setValue(value);
  await wrapper.get('.tag-form').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  api.getActiveReadingSession.mockResolvedValue(null);
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

const FAV: FolderSummary = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Favourites',
  count: 1,
};
const SUMMER: FolderSummary = {
  id: '88888888-8888-4888-8888-888888888888',
  name: 'Summer',
  count: 0,
};

describe('BookReadingPanel status editor', () => {
  it('opens the editor with "in progress" preselected for a not-started book', async () => {
    const wrapper = mountPanel([], [], BOOK_ID, { status: 'not-started', currentPage: 0 });

    await wrapper.get('.update-status').trigger('click');

    expect(wrapper.get('.update-status').text()).toContain('Close');
    expect((wrapper.get('.editor-select').element as HTMLSelectElement).value).toBe('in-progress');
    expect((wrapper.get('.editor-input').element as HTMLInputElement).value).toBe('10');
  });

  it('opens with the current status and page, and closes on cancel', async () => {
    const wrapper = mountPanel([], [], BOOK_ID, { status: 'finished', currentPage: 400 });

    await wrapper.get('.update-status').trigger('click');
    expect((wrapper.get('.editor-select').element as HTMLSelectElement).value).toBe('finished');
    expect((wrapper.get('.editor-input').element as HTMLInputElement).value).toBe('400');

    await wrapper.get('.button-cancel').trigger('click');
    expect(wrapper.find('.status-editor').exists()).toBe(false);
  });

  it('saves the status through the API, emits it and closes after a delay', async () => {
    vi.useFakeTimers();
    api.updateReadingStatus.mockResolvedValue();
    const wrapper = mountPanel();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('finished');
    await wrapper.get('.editor-input').setValue('400');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(api.updateReadingStatus).toHaveBeenCalledWith({
      bookId: BOOK_ID,
      status: 'finished',
      currentPage: 400,
      finishedOn: toIsoDate(new Date()),
    });
    expect(wrapper.emitted('updated')).toEqual([
      [{ status: 'finished', currentPage: 400, finishedOn: toIsoDate(new Date()) }],
    ]);
    expect(wrapper.get('.editor-message').text()).toBe('Status saved to backend!');

    vi.advanceTimersByTime(1500);
    await flushPromises();
    expect(wrapper.find('.status-editor').exists()).toBe(false);
    vi.useRealTimers();
  });

  it('shows the API error when saving fails', async () => {
    api.updateReadingStatus.mockRejectedValue(new Error('Server down'));
    const wrapper = mountPanel();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.editor-message').text()).toBe('Server down');
    expect(wrapper.emitted('updated')).toBeUndefined();
    expect(wrapper.get('.button-save').attributes('disabled')).toBeUndefined();
  });

  it('falls back to a generic message for a non-Error failure', async () => {
    api.updateReadingStatus.mockRejectedValue('nope');
    const wrapper = mountPanel();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.editor-message').text()).toBe('Failed to update');
  });
});

describe('BookReadingPanel folders', () => {
  const openFolders = async (wrapper: ReturnType<typeof mountPanel>) => {
    await wrapper.get('.folder-toggle').trigger('click');
  };

  it('adds the book to a folder through the API and emits the new ids', async () => {
    api.addBookToFolder.mockResolvedValue();
    const wrapper = mountPanel([], [], BOOK_ID, {}, [FAV, SUMMER]);

    expect(wrapper.get('.folder-toggle').text()).toBe('No folder yet');
    await openFolders(wrapper);
    await wrapper.findAll('.folder-option input')[1]!.trigger('change');
    await flushPromises();

    expect(api.addBookToFolder).toHaveBeenCalledWith(SUMMER.id, BOOK_ID);
    expect(wrapper.emitted('foldersUpdated')).toEqual([[[SUMMER.id]]]);
    expect(wrapper.get('.folder-toggle').text()).toBe('Summer');
  });

  it('removes the book from a folder it is already in', async () => {
    api.removeBookFromFolder.mockResolvedValue();
    const wrapper = mountPanel([], [], BOOK_ID, { folderIds: [FAV.id] }, [FAV, SUMMER]);

    await openFolders(wrapper);
    await wrapper.findAll('.folder-option input')[0]!.trigger('change');
    await flushPromises();

    expect(api.removeBookFromFolder).toHaveBeenCalledWith(FAV.id, BOOK_ID);
    expect(wrapper.emitted('foldersUpdated')).toEqual([[[]]]);
  });

  it('rolls back the selection and shows the error when the API fails', async () => {
    api.addBookToFolder.mockRejectedValue(new Error('Folder is full'));
    const wrapper = mountPanel([], [], BOOK_ID, { folderIds: [FAV.id] }, [FAV, SUMMER]);

    await openFolders(wrapper);
    await wrapper.findAll('.folder-option input')[1]!.trigger('change');
    await flushPromises();

    expect(wrapper.get('.folder-message').text()).toBe('Folder is full');
    expect(wrapper.get('.folder-toggle').text()).toBe('Favourites');
    expect(wrapper.emitted('foldersUpdated')).toBeUndefined();
  });

  it('uses a generic message for a non-Error failure', async () => {
    api.removeBookFromFolder.mockRejectedValue('nope');
    const wrapper = mountPanel([], [], BOOK_ID, { folderIds: [FAV.id] }, [FAV]);

    await openFolders(wrapper);
    await wrapper.get('.folder-option input').trigger('change');
    await flushPromises();

    expect(wrapper.get('.folder-message').text()).toBe('Failed to update folders');
  });

  it('ignores a second toggle while the first is still saving', async () => {
    let resolve!: () => void;
    api.addBookToFolder.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const wrapper = mountPanel([], [], BOOK_ID, {}, [FAV, SUMMER]);

    await openFolders(wrapper);
    const inputs = wrapper.findAll('.folder-option input');
    await inputs[0]!.trigger('change');
    await inputs[1]!.trigger('change');
    resolve();
    await flushPromises();

    expect(api.addBookToFolder).toHaveBeenCalledTimes(1);
  });

  it('tells the reader to create a folder when there are none', async () => {
    const wrapper = mountPanel();

    await openFolders(wrapper);

    expect(wrapper.get('.folder-empty').text()).toContain('No folders yet');
  });

  it('resyncs the selection when the book prop changes', async () => {
    const wrapper = mountPanel([], [], BOOK_ID, {}, [FAV, SUMMER]);

    await wrapper.setProps({ book: { ...makeBook(BOOK_ID, []), folderIds: [SUMMER.id] } });

    expect(wrapper.get('.folder-toggle').text()).toBe('Summer');
  });
});

describe('BookReadingPanel tag removal guard', () => {
  it('ignores a second removal while the first is still saving', async () => {
    let resolve!: () => void;
    api.untagBook.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const wrapper = mountPanel([AUDIO.id, REREAD.id]);

    await wrapper.get('[aria-label="Remove tag audiobook"]').trigger('click');
    await wrapper.get('[aria-label="Remove tag reread"]').trigger('click');
    resolve();
    await flushPromises();

    expect(api.untagBook).toHaveBeenCalledTimes(1);
  });
});

describe('BookReadingPanel library and dates (F-LIB-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('offers "Add to library" for a book that is not in the library', async () => {
    api.updateReadingStatus.mockResolvedValue();
    const wrapper = mountPanel([], [], BOOK_ID, {
      inLibrary: false,
      status: 'not-started',
      currentPage: 0,
    });

    await wrapper.get('.add-to-library').trigger('click');
    await flushPromises();

    expect(api.updateReadingStatus).toHaveBeenCalledWith({
      bookId: BOOK_ID,
      status: 'not-started',
      currentPage: 0,
    });
    expect(wrapper.emitted('libraryChanged')).toHaveLength(1);
  });

  it('shows the saved start and finish days', () => {
    const wrapper = mountPanel([], [], BOOK_ID, {
      status: 'finished',
      startedOn: '2026-11-02',
      finishedOn: '2026-11-15',
    });

    expect(wrapper.get('.reading-dates').text()).toBe('Started 2 Nov 2026 • Finished 15 Nov 2026');
  });

  it('refuses a finish date before the start date', async () => {
    const wrapper = mountPanel([], [], BOOK_ID, { startedOn: '2026-11-10' });

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('finished');
    await wrapper.get('.finished-on').setValue('2026-11-05');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.date-error').text()).toBe(
      'The finish date cannot be before the start date.',
    );
    expect(wrapper.get('.button-save').attributes('disabled')).toBeDefined();
    expect(api.updateReadingStatus).not.toHaveBeenCalled();
  });

  it('sends the edited dates', async () => {
    vi.useFakeTimers();
    api.updateReadingStatus.mockResolvedValue();
    const wrapper = mountPanel([], [], BOOK_ID, { startedOn: '2026-11-10' });

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('finished');
    await wrapper.get('.started-on').setValue('2026-11-01');
    await wrapper.get('.finished-on').setValue('2026-11-12');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(api.updateReadingStatus).toHaveBeenCalledWith(
      expect.objectContaining({ startedOn: '2026-11-01', finishedOn: '2026-11-12' }),
    );
    vi.useRealTimers();
  });

  it('removes the book after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.removeFromLibrary.mockResolvedValue();
    const wrapper = mountPanel();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.remove-from-library').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remove Dune from your library?');
    expect(api.removeFromLibrary).toHaveBeenCalledWith(BOOK_ID);
    expect(wrapper.emitted('libraryChanged')).toHaveLength(1);
  });

  it('keeps the book when the reader does not confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const wrapper = mountPanel();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.remove-from-library').trigger('click');
    await flushPromises();

    expect(api.removeFromLibrary).not.toHaveBeenCalled();
  });
});

describe('BookReadingPanel session navigation (#188)', () => {
  it('offers Start session for this book when no session is running', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    expect(wrapper.get('.start-session').text()).toBe('Start session');
    expect(wrapper.get('.start-session').attributes('href')).toBe(`/session/${BOOK_ID}`);
    wrapper.unmount();
  });

  it.each([BOOK_ID, 'another-book'])(
    'continues the active session on %s instead of starting this book',
    async (bookId) => {
      api.getActiveReadingSession.mockResolvedValue({
        id: 'existing-session',
        userId: 'reader',
        bookId,
        startedAt: '2026-11-27T09:00:00Z',
        endedAt: null,
        elapsedSeconds: 125,
        countedMinutes: 0,
      });
      const wrapper = mountPanel();
      await flushPromises();
      expect(wrapper.get('.start-session').text()).toBe('Continue session');
      expect(wrapper.get('.start-session').attributes('href')).toBe(`/session/${bookId}`);
      expect(wrapper.text().includes('already running for another book')).toBe(bookId !== BOOK_ID);
      wrapper.unmount();
    },
  );

  it('prevents navigation while checking the active session', async () => {
    let resolve!: (value: null) => void;
    api.getActiveReadingSession.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const wrapper = mountPanel();
    expect(wrapper.get('.start-session').element.tagName).toBe('BUTTON');
    expect(wrapper.get('.start-session').attributes('disabled')).toBeDefined();
    expect(wrapper.find('a.start-session').exists()).toBe(false);
    resolve(null);
    await flushPromises();
    expect(wrapper.get('.start-session').text()).toBe('Start session');
    wrapper.unmount();
  });

  it('shows guidance without offering a new start when the session lookup fails', async () => {
    api.getActiveReadingSession.mockRejectedValue(new Error('offline'));
    const wrapper = mountPanel();
    await flushPromises();
    expect(wrapper.get('.start-session').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not check your reading session');
    wrapper.unmount();
  });
});
