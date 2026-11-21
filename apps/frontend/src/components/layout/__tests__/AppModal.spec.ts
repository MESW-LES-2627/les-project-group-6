// @req F-BOOK-02
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import AppModal from '../AppModal.vue';

enableAutoUnmount(afterEach);

function mountModal() {
  return mount(AppModal, {
    props: { labelledBy: 'dialog-title' },
    slots: {
      default: `
        <h2 id="dialog-title">Add a book</h2>
        <label for="book-title">Title</label>
        <input id="book-title" />
        <button type="button">Save</button>
      `,
    },
    attachTo: document.body,
  });
}

describe('AppModal', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders a labelled dialog and focuses its first field', () => {
    const wrapper = mountModal();
    const dialog = wrapper.get('[role="dialog"]');

    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toBe('dialog-title');
    expect(wrapper.text()).toContain('Add a book');
    expect(document.activeElement).toBe(wrapper.get('input').element);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('emits close on Escape', () => {
    const wrapper = mountModal();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close on the backdrop but not on the dialog itself', async () => {
    const wrapper = mountModal();

    await wrapper.get('.modal-dialog').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.get('.modal-backdrop').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close from the close button', async () => {
    const wrapper = mountModal();

    await wrapper.get('.modal-close').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('keeps Tab inside the dialog', async () => {
    const wrapper = mountModal();
    const close = wrapper.get('.modal-close');
    const save = wrapper.get('.modal-dialog > button[type="button"]:last-of-type');

    (save.element as HTMLElement).focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(document.activeElement).toBe(close.element);
  });

  it('gives the page back on unmount: scroll and focus', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const wrapper = mountModal();
    expect(document.body.style.overflow).toBe('hidden');

    wrapper.unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
