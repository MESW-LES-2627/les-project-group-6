// @req F-READ-01
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import router from '@/router';
import ActiveSessionView from '../ActiveSessionView.vue';

function mountView(bookId = 'emma') {
  return mount(ActiveSessionView, {
    props: { bookId },
    global: { plugins: [router] },
  });
}

describe('ActiveSessionView', () => {
  it('shows the running session, timer, progress and eligible groups', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Just you and the next chapter.');
    expect(wrapper.get('.session-subtitle').text()).toContain('Emma');
    expect(wrapper.get('.session-book-title').text()).toBe('Emma');
    expect(wrapper.get('.timer-time').text()).toBe('00:28:14');
    expect(wrapper.get('.progress-note').text()).toBe('+24 pages since you started');
    expect(wrapper.get('.page-count').text()).toBe('318 / 474 pages');
    expect(wrapper.get('.eligible-groups').text()).toBe('2 eligible groups');
    expect(wrapper.get('.groups').text()).toContain('October Sprint');
    expect(wrapper.get('.groups').text()).toContain('Classics • Emma');
    expect(wrapper.get('.rules-card').text()).toContain('60 counted min/day cap in the Sprint');
  });

  it('keeps the page and percentage inputs in sync', async () => {
    const wrapper = mountView();
    const [pageInput, percentageInput] = wrapper.findAll('input');
    expect(pageInput).toBeDefined();
    expect(percentageInput).toBeDefined();

    await pageInput!.setValue('237');
    expect(wrapper.get('.progress-note').text()).toBe('+0 pages since you started');
    expect(wrapper.get('.page-count').text()).toBe('237 / 474 pages');
    expect(percentageInput!.element.value).toBe('50');

    await percentageInput!.setValue('25');
    expect(pageInput!.element.value).toBe('119');
    expect(wrapper.get('.page-count').text()).toBe('119 / 474 pages');
  });

  it('shows a friendly message for an unknown book id', () => {
    const wrapper = mountView('missing-book');

    expect(wrapper.get('h1').text()).toBe('Session not found');
    expect(wrapper.get('.missing-link').attributes('href')).toBe('/library');
  });

  it('goes back to the book when a mock session is stopped or cancelled', async () => {
    const wrapper = mountView();
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined);

    await wrapper.get('.timer-button--stop').trigger('click');
    await wrapper.get('.timer-button--cancel').trigger('click');

    const bookRoute = { name: 'book-detail', params: { bookId: 'emma' } };
    expect(push).toHaveBeenNthCalledWith(1, bookRoute);
    expect(push).toHaveBeenNthCalledWith(2, bookRoute);
    push.mockRestore();
  });
});
