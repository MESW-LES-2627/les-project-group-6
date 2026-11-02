import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReadingTimer from '../ReadingTimer.vue';

describe('ReadingTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks from the elapsed time and has no pause control', async () => {
    vi.useFakeTimers();
    const wrapper = mount(ReadingTimer, { props: { initialSeconds: 28 * 60 + 14 } });

    expect(wrapper.get('.timer-time').text()).toBe('00:28:14');

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.timer-time').text()).toBe('00:28:15');
    expect(wrapper.text()).not.toContain('Pause');

    wrapper.unmount();
  });

  it('emits stop when the session is stopped', async () => {
    const wrapper = mount(ReadingTimer, { props: { initialSeconds: 60, autoStart: false } });

    await wrapper.get('.timer-button--stop').trigger('click');

    expect(wrapper.emitted('stop')).toHaveLength(1);
    wrapper.unmount();
  });

  it('emits cancel when the session is cancelled', async () => {
    const wrapper = mount(ReadingTimer, { props: { autoStart: false } });

    await wrapper.get('.timer-button--cancel').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('disables both actions while busy', () => {
    const wrapper = mount(ReadingTimer, { props: { autoStart: false, busy: true } });

    expect(wrapper.get('.timer-button--stop').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.timer-button--cancel').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
});
