import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PetSprite from '../PetSprite.vue';
import ReadingPet from '../ReadingPet.vue';

const NOW = new Date(2026, 10, 21, 12);

function mountPet(lastReadDate: string | null = '2026-11-21') {
  return mount(ReadingPet, { props: { lastReadDate, now: NOW } });
}

describe('ReadingPet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a happy cat when the reader read today', () => {
    const wrapper = mountPet();
    expect(wrapper.text()).toContain('Miso is happy. You read today!');
    expect(wrapper.getComponent(PetSprite).props()).toMatchObject({ animal: 'cat', face: 'happy' });
  });

  it('shows a starving pet after a week away', () => {
    const wrapper = mountPet('2026-11-10');
    expect(wrapper.text()).toContain('starving');
    expect(wrapper.getComponent(PetSprite).props('face')).toBe('starving');
  });

  it('shows the love face and a heart when clicked, then goes back to its mood', async () => {
    const wrapper = mountPet();
    await wrapper.get('.pet-body').trigger('click');
    expect(wrapper.getComponent(PetSprite).props('face')).toBe('love');
    expect(wrapper.find('[data-test="pet-heart"]').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);
    expect(wrapper.find('[data-test="pet-heart"]').exists()).toBe(false);
    expect(wrapper.getComponent(PetSprite).props('face')).not.toBe('love');
  });

  it('ignores extra clicks while the heart is showing', async () => {
    const wrapper = mountPet();
    await wrapper.get('.pet-body').trigger('click');
    await vi.advanceTimersByTimeAsync(1000);
    await wrapper.get('.pet-body').trigger('click');
    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.find('[data-test="pet-heart"]').exists()).toBe(false);
  });

  it('describes the mood to screen readers', () => {
    const wrapper = mountPet('2026-11-19');
    expect(wrapper.get('.pet-body').attributes('aria-label')).toBe(
      'Miso is sad. A short reading session will cheer them up. Pet Miso.',
    );
  });

  it('plays idle actions over time', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // happy pets end their list with sleep
    const wrapper = mountPet();
    await vi.advanceTimersByTimeAsync(7000);
    expect(wrapper.get('[data-test="pet-motion"]').classes()).toContain('is-sleep');
    expect(wrapper.getComponent(PetSprite).props('face')).toBe('sleep');
    vi.restoreAllMocks();
  });

  it('stays still when the reader prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const wrapper = mountPet();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(wrapper.get('[data-test="pet-motion"]').classes()).toContain('is-idle');
    vi.unstubAllGlobals();
  });

  it('lets the reader choose another pet and remembers it', async () => {
    const wrapper = mountPet();
    await wrapper.get('.pet-change').trigger('click');
    await wrapper.get('[aria-label="Maple the fox"]').trigger('click');

    expect(wrapper.text()).toContain('Maple is happy');
    expect(localStorage.getItem('bookmarked.pet')).toBe('fox');
    expect(wrapper.find('#pet-picker').exists()).toBe(false);

    expect(mountPet().text()).toContain('Maple');
  });

  it('stops its timers when removed', () => {
    const wrapper = mountPet();
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
