import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeView from '../HomeView.vue';

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
    const wrapper = mount(HomeView);

    expect(wrapper.get('[role="status"]').text()).toBe('Checking backend…');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(wrapper.get('[role="status"]').text()).toBe('Backend status: ok');
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
    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe(`Backend unavailable: ${message}`);
    expect(wrapper.get('[role="status"]').classes()).toContain('health-status--error');
    wrapper.unmount();
  });
});
