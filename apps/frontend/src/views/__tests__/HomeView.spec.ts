import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from '@/router';
import HomeView from '../HomeView.vue';

const mountView = () => mount(HomeView, { global: { plugins: [router] } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeView backend status', () => {
  it('requests health and displays the backend response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mountView();

    expect(wrapper.get('[data-test="health"]').text()).toBe('Checking backend…');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(wrapper.get('[data-test="health"]').text()).toBe('Backend status: ok');
    wrapper.unmount();
  });

  it.each([
    ['HTTP failure', () => Promise.resolve({ ok: false, status: 503 }), 'HTTP 503'],
    ['network failure', () => Promise.reject(new Error('Failed to fetch')), 'Failed to fetch'],
    [
      'invalid response',
      () => Promise.resolve({ ok: true, json: async () => ({ message: 'unexpected' }) }),
      'Invalid health response',
    ],
  ])('displays a useful error for %s', async (_name, response, message) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(response));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('[data-test="health"]').text()).toBe(`Backend unavailable: ${message}`);
    expect(wrapper.get('[data-test="health"]').classes()).toContain('health-status--error');
    wrapper.unmount();
  });
});

describe('HomeView content', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }),
    );
  });

  it('shows the greeting, the bedside book, the streak and the goals', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('A little reading, a little wonder.');
    expect(wrapper.text()).toContain('Page 294 of 474 · 62%');
    expect(wrapper.text()).toContain('12 day streak');
    expect(wrapper.text()).toContain('18/24');
    expect(wrapper.text()).toContain('6 books and 1,720 counted minutes to go');
    wrapper.unmount();
  });

  it('links to the session, the book and the groups', () => {
    const wrapper = mountView();
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    expect(hrefs).toContain('/session/emma');
    expect(hrefs).toContain('/library/emma');
    expect(hrefs).toContain('/groups/october-sprint');
    expect(hrefs).toContain('/groups/classics');
    wrapper.unmount();
  });

  it('removes a friend request once accepted and the section once all are answered', async () => {
    const wrapper = mountView();
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!;

    await button('Accept').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('You and Sofia Chen are now friends.');

    await button('Decline').trigger('click');
    expect(wrapper.text()).not.toContain('A seat saved for you');
    wrapper.unmount();
  });
});
