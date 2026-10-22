import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReadingTimer from '../ReadingTimer.vue';

describe('ReadingTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks from the elapsed time and can pause and resume', async () => {
    vi.useFakeTimers();
    const wrapper = mount(ReadingTimer, { props: { initialSeconds: 28 * 60 + 14 } });

    expect(wrapper.get('.timer-time').text()).toBe('00:28:14');

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.timer-time').text()).toBe('00:28:15');

    await wrapper.get('.timer-button--pause').trigger('click');
    expect(wrapper.get('.timer-status').text()).toContain('Paused');
    expect(wrapper.get('.timer-button--pause').text()).toContain('Resume');
    expect(wrapper.emitted('pause')).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.timer-time').text()).toBe('00:28:15');

    await wrapper.get('.timer-button--pause').trigger('click');
    expect(wrapper.emitted('resume')).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.timer-time').text()).toBe('00:28:16');

    wrapper.unmount();
  });

  it('emits stop when the session is stopped', async () => {
    const wrapper = mount(ReadingTimer, { props: { initialSeconds: 60, autoStart: false } });

    await wrapper.get('.timer-button--stop').trigger('click');

    expect(wrapper.emitted('stop')).toHaveLength(1);
    wrapper.unmount();
  });
});
