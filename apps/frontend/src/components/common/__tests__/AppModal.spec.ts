import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AppModal from '../AppModal.vue';

function mountModal() {
  return mount(AppModal, {
    props: { labelledby: 'modal-title' },
    slots: {
      header: '<h2 id="modal-title">Add a book</h2>',
      default: '<p>Modal body</p><input data-autofocus aria-label="Search" />',
    },
    attachTo: document.body,
  });
}

describe('AppModal', () => {
  it('renders a labelled modal dialog and focuses it', () => {
    const wrapper = mountModal();
    const dialog = wrapper.get('[role="dialog"]');

    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toBe('modal-title');
    expect(wrapper.text()).toContain('Add a book');
    expect(document.activeElement).toBe(wrapper.get('input').element);

    wrapper.unmount();
  });

  it('closes with the close button, the backdrop and Escape', async () => {
    const wrapper = mountModal();

    await wrapper.get('[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    await wrapper.get('.backdrop').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(3);

    wrapper.unmount();
  });

  it('does not close when the dialog itself is clicked and restores the page on unmount', async () => {
    document.body.style.overflow = 'auto';
    const wrapper = mountModal();

    expect(document.body.style.overflow).toBe('hidden');
    await wrapper.get('.dialog').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    wrapper.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
