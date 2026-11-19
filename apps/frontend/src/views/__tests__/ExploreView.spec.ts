// @req F-EXP-01 F-EXP-04
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiBook, ApiExplore, UserSearchResult } from '@/services/api';
import ExploreView from '../ExploreView.vue';

const api = vi.hoisted(() => ({
  getExplore: vi.fn<() => Promise<ApiExplore>>(),
  searchBooks: vi.fn<(query: string, signal?: AbortSignal) => Promise<ApiBook[]>>(),
  searchUsers: vi.fn<(query: string, signal?: AbortSignal) => Promise<UserSearchResult[]>>(),
  addBook: vi.fn<(book: { title: string }) => Promise<ApiBook>>(),
  addToLibrary: vi.fn<(bookId: string) => Promise<void>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string): ApiBook => ({
  authors: [],
  id,
  title,
  description: null,
  isbn13: null,
  pageCount: 300,
  coverUrl: null,
});

async function mountView(path = '/explore') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/explore', name: 'explore', component: ExploreView },
      { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
      { path: '/users/:username', name: 'user-profile', component: { template: '<p />' } },
    ],
  });
  await router.push(path);
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const tab = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('.page-tab').find((t) => t.text() === label)!;

describe('ExploreView', () => {
  beforeEach(() => {
    api.getExplore.mockReset().mockResolvedValue({
      trending: [
        { book: book('b1', 'Circe'), readers: 3 },
        { book: book('b2', 'Emma'), readers: 1 },
      ],
      mostReadThisWeek: [{ book: book('b3', 'Dune'), minutes: 320 }],
      suggestions: [],
    });
    api.searchBooks.mockReset().mockResolvedValue([book('b3', 'Dune')]);
    api.searchUsers.mockReset().mockResolvedValue([]);
  });

  it('shows trending books first and most read on the other tab', async () => {
    const { wrapper } = await mountView();

    expect(wrapper.get('h1').text()).toBe('Follow your curiosity.');
    expect(wrapper.findAll('.cards h3').map((h) => h.text())).toEqual(['Circe', 'Emma']);
    expect(wrapper.text()).toContain('3 readers added it');
    expect(wrapper.text()).toContain('1 reader added it');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 Trending');
    expect(wrapper.get('.cards a').attributes('href')).toBe('/library/b1');

    await tab(wrapper, 'Most read this week').trigger('click');

    expect(wrapper.findAll('.cards h3').map((h) => h.text())).toEqual(['Dune']);
    expect(wrapper.text()).toContain('320 min read');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 This week');
  });

  it('suggests books on the Trending tab while nothing is trending', async () => {
    api.getExplore.mockResolvedValue({
      trending: [],
      mostReadThisWeek: [],
      suggestions: [book('b4', 'Middlemarch'), book('b5', 'Beloved')],
    });
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain('Nothing is trending this week yet');
    expect(wrapper.findAll('.cards h3').map((h) => h.text())).toEqual(['Middlemarch', 'Beloved']);
    expect(wrapper.text()).toContain('A pick to start with');
    expect(wrapper.find('.tag-highlight').exists()).toBe(false);

    await tab(wrapper, 'Most read this week').trigger('click');
    expect(wrapper.find('.cards').exists()).toBe(false);
    expect(wrapper.text()).toContain('No reading logged this week yet.');
  });

  it('shows empty states when nobody read or added a book', async () => {
    api.getExplore.mockResolvedValue({ trending: [], mostReadThisWeek: [], suggestions: [] });
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain('No books added this week yet.');
    await tab(wrapper, 'Most read this week').trigger('click');
    expect(wrapper.text()).toContain('No reading logged this week yet.');
  });

  it('offers to try again when the lists fail to load', async () => {
    api.getExplore.mockRejectedValueOnce(new Error('down'));
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain("Couldn't load trending books.");
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click');
    await flushPromises();

    expect(api.getExplore).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('.cards h3')).toHaveLength(2);
  });

  it('searches from the bar, keeps the query in the URL and clears it', async () => {
    const { wrapper, router } = await mountView();

    await wrapper.get('input[type="search"]').setValue('Dune');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBe('Dune');
    expect(api.searchBooks).toHaveBeenCalledWith('Dune', expect.any(AbortSignal));
    expect(wrapper.get('.results').text()).toContain('Dune');
    expect(wrapper.find('.cards').exists()).toBe(true);

    await wrapper.get('.results .link-button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBeUndefined();
    expect(wrapper.find('.results').exists()).toBe(false);
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('');
  });

  it('runs the search from the URL on load', async () => {
    const { wrapper } = await mountView('/explore?q=Dune');

    expect(api.searchBooks).toHaveBeenCalledWith('Dune', expect.any(AbortSignal));
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('Dune');
    expect(wrapper.get('.results').text()).toContain('1 result');
  });

  describe('while typing', () => {
    // Only timers are faked: flushPromises relies on setImmediate.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const input = (wrapper: VueWrapper) => wrapper.get('input[type="search"]');
    const typed = (wrapper: VueWrapper) => (input(wrapper).element as HTMLInputElement).value;
    async function wait(ms: number) {
      vi.advanceTimersByTime(ms);
      await flushPromises();
    }

    it('searches once, 300 ms after the last keystroke, replacing the URL', async () => {
      const { wrapper, router } = await mountView();
      const replace = vi.spyOn(router, 'replace');

      await input(wrapper).setValue('du');
      await input(wrapper).setValue('dun');
      await wait(299);
      expect(api.searchBooks).not.toHaveBeenCalled();

      await wait(1);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(router.currentRoute.value.query.q).toBe('dun');
      expect(api.searchBooks).toHaveBeenCalledTimes(1);
      expect(api.searchBooks).toHaveBeenCalledWith('dun', expect.any(AbortSignal));
      expect(wrapper.get('.results').text()).toContain('Dune');
    });

    it('cancels an older search and keeps the newest results', async () => {
      let resolveOld!: (books: ApiBook[]) => void;
      api.searchBooks
        .mockImplementationOnce(() => new Promise((resolve) => (resolveOld = resolve)))
        .mockResolvedValueOnce([book('b3', 'Dune')]);
      const { wrapper } = await mountView();

      await input(wrapper).setValue('dun');
      await wait(300);
      await input(wrapper).setValue('dune');
      await wait(300);

      expect(api.searchBooks.mock.calls[0]![1]!.aborted).toBe(true);
      resolveOld([book('b9', 'The Dunes of Mars')]);
      await flushPromises();

      expect(wrapper.get('.results').text()).toContain('Dune');
      expect(wrapper.get('.results').text()).not.toContain('The Dunes of Mars');
    });

    it('hides the results under 2 characters but keeps what was typed', async () => {
      const { wrapper, router } = await mountView('/explore?q=dune');

      await input(wrapper).setValue('d');
      await wait(300);

      expect(router.currentRoute.value.query.q).toBeUndefined();
      expect(wrapper.find('.results').exists()).toBe(false);
      expect(typed(wrapper)).toBe('d');
    });

    it('searches at once on Enter and keeps it in the history', async () => {
      const { wrapper, router } = await mountView();
      const push = vi.spyOn(router, 'push');

      await input(wrapper).setValue('Dune');
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(push).toHaveBeenCalledWith({ name: 'explore', query: { q: 'Dune' } });
      expect(api.searchBooks).toHaveBeenCalledTimes(1);
      await wait(300);
      expect(api.searchBooks).toHaveBeenCalledTimes(1);
    });

    it('keeps a trailing space while typing', async () => {
      const { wrapper, router } = await mountView();

      await input(wrapper).setValue('dune ');
      await wait(300);

      expect(router.currentRoute.value.query.q).toBe('dune');
      expect(typed(wrapper)).toBe('dune ');
    });

    it('searches readers 300 ms after the last keystroke, replacing the URL', async () => {
      const { wrapper, router } = await mountView();
      const replace = vi.spyOn(router, 'replace');

      await wrapper.get('#user-search').setValue('ped');
      await wait(299);
      expect(api.searchUsers).not.toHaveBeenCalled();

      await wait(1);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(router.currentRoute.value.query.uq).toBe('ped');
      expect(api.searchUsers).toHaveBeenCalledWith('ped', expect.any(AbortSignal));
    });
  });

  it('adds a book no source knows and opens it from the library', async () => {
    api.searchBooks.mockResolvedValue([]);
    api.addBook.mockReset().mockResolvedValue(book('b9', "My grandmother's diary"));
    api.addToLibrary.mockReset().mockResolvedValue();
    const { wrapper, router } = await mountView("/explore?q=My grandmother's diary");

    await wrapper
      .findAll('.link-button')
      .find((b) => b.text() === 'Add this book')!
      .trigger('click');
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).toHaveBeenCalledWith({ title: "My grandmother's diary" });
    expect(api.addToLibrary).toHaveBeenCalledWith('b9');
    expect(router.currentRoute.value.fullPath).toBe('/library/b9');
  });

  describe('Reader search', () => {
    it('searches readers from the user search bar and displays results', async () => {
      api.searchUsers.mockResolvedValue([
        {
          id: 'u1',
          username: 'pedro_reads',
          displayName: 'Pedro Silva',
          photoUrl: null,
          bio: 'Literature enthusiast.',
          profileVisibility: 'public',
        },
      ]);
      const { wrapper, router } = await mountView();

      const userInput = wrapper.get('#user-search');
      await userInput.setValue('pedro');
      await wrapper.findAll('form')[1]?.trigger('submit');
      await flushPromises();

      expect(router.currentRoute.value.query.uq).toBe('pedro');
      expect(api.searchUsers).toHaveBeenCalledWith('pedro', expect.any(AbortSignal));
      expect(wrapper.get('#user-results-title').text()).toBe('Readers');
      expect(wrapper.text()).toContain('Pedro Silva');
      expect(wrapper.text()).toContain('@pedro_reads');

      await wrapper.get('#user-results-title + p .link-button').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.query.uq).toBeUndefined();
      expect(wrapper.find('#user-results-title').exists()).toBe(false);
    });

    it('runs reader search from the URL on load', async () => {
      api.searchUsers.mockResolvedValue([
        {
          id: 'u2',
          username: 'alice_w',
          displayName: 'Alice Wonder',
          photoUrl: null,
          bio: null,
          profileVisibility: 'private',
        },
      ]);
      const { wrapper } = await mountView('/explore?uq=alice');

      expect(api.searchUsers).toHaveBeenCalledWith('alice', expect.any(AbortSignal));
      expect((wrapper.get('#user-search').element as HTMLInputElement).value).toBe('alice');
      expect(wrapper.text()).toContain('Alice Wonder');
      expect(wrapper.text()).toContain('@alice_w');
      expect(wrapper.text()).toContain('Private');
    });
  });

  it('says search is unavailable when the book search fails', async () => {
    api.searchBooks.mockRejectedValue(new Error('down'));
    const { wrapper } = await mountView('/explore?q=Dune');

    expect(wrapper.get('.results').text()).toContain('Search is unavailable right now.');
    expect(wrapper.findAll('.results li')).toHaveLength(0);
  });

  it('says reader search is unavailable when it fails', async () => {
    api.searchUsers.mockRejectedValue(new Error('down'));
    const { wrapper } = await mountView('/explore?uq=alice');

    expect(wrapper.text()).toContain('Reader search is unavailable right now.');
  });

  async function openAddForm(wrapper: VueWrapper) {
    await wrapper
      .findAll('.link-button')
      .find((b) => b.text() === 'Add this book')!
      .trigger('click');
  }

  it('shows the error and stays on the page when adding a book fails', async () => {
    api.searchBooks.mockResolvedValue([]);
    api.addBook.mockReset().mockRejectedValue(new Error('That ISBN already exists'));
    api.addToLibrary.mockReset();
    const { wrapper, router } = await mountView('/explore?q=Diary');

    await openAddForm(wrapper);
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.add-book').text()).toContain('That ISBN already exists');
    expect(api.addToLibrary).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/explore');
  });

  it('falls back to a generic message when the add error has no text', async () => {
    api.searchBooks.mockResolvedValue([]);
    api.addBook.mockReset().mockRejectedValue(new Error(''));
    const { wrapper } = await mountView('/explore?q=Diary');

    await openAddForm(wrapper);
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.add-book').text()).toContain("Couldn't add the book.");
  });

  it('closes the add form on cancel', async () => {
    api.searchBooks.mockResolvedValue([]);
    const { wrapper } = await mountView('/explore?q=Diary');

    await openAddForm(wrapper);
    expect(wrapper.find('.add-book').exists()).toBe(true);

    await wrapper
      .findAll('.add-book button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click');

    expect(wrapper.find('.add-book').exists()).toBe(false);
  });
});
