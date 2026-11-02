import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type { ApiReadingStats } from '@/services/api';
import ProfileView from '../ProfileView.vue';

const getReadingStats = vi.hoisted(() => vi.fn<() => Promise<ApiReadingStats>>());

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getReadingStats,
}));

function mountView() {
  return mount(ProfileView, { global: { plugins: [router] } });
}

describe('ProfileView reading time', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the minutes and sessions from the reading stats API', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 40, sessionsCount: 1 });
    const wrapper = mountView();
    await flushPromises();

    const readingTime = wrapper.get('.reading-time');
    expect(readingTime.get('.number').text()).toBe('40');
    expect(readingTime.text()).toContain('minutes');
    expect(readingTime.get('.sessions').text()).toBe('across 1 session');
  });

  it('shows the empty hint when no session has been finished', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    const wrapper = mountView();
    await flushPromises();

    const readingTime = wrapper.get('.reading-time');
    expect(readingTime.get('.number').text()).toBe('0');
    expect(readingTime.find('.sessions').exists()).toBe(false);
    expect(readingTime.text()).toContain('Start a reading session');
  });

  it('keeps the mock reading time when the API is unreachable', async () => {
    getReadingStats.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.reading-time .number').text()).toBe('4260');
    expect(wrapper.get('.reading-time .sessions').text()).toBe('across 96 sessions');
  });
});
