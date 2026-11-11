import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiBook } from '@/services/api';
import ExploreView from '../ExploreView.vue';

const api = vi.hoisted(() => ({ getExplore: vi.fn(), searchBooks: vi.fn() }));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string): ApiBook => ({
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
    });
    api.searchBooks.mockReset().mockResolvedValue([book('b3', 'Dune')]);
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

  it('shows empty states when nobody read or added a book', async () => {
    api.getExplore.mockResolvedValue({ trending: [], mostReadThisWeek: [] });
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
    expect(api.searchBooks).toHaveBeenCalledWith('Dune');
    expect(wrapper.get('.results').text()).toContain('Dune');
    expect(wrapper.find('.cards').exists()).toBe(true);

    await wrapper.get('.results .link-button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBeUndefined();
    expect(wrapper.find('.results').exists()).toBe(false);
  });

  it('runs the search from the URL on load', async () => {
    const { wrapper } = await mountView('/explore?q=Dune');

    expect(api.searchBooks).toHaveBeenCalledWith('Dune');
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('Dune');
    expect(wrapper.get('.results').text()).toContain('1 result');
  });
});
