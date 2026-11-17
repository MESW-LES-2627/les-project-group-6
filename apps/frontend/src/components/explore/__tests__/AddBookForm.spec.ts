// @req F-BOOK-02 F-BOOK-03
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AddBookForm from '../AddBookForm.vue';

const mountForm = (initialTitle = '') =>
  mount(AddBookForm, { props: { initialTitle, saving: false } });

describe('AddBookForm', () => {
  it('starts with the searched text as the title', () => {
    const wrapper = mountForm("My grandmother's diary");
    expect((wrapper.get('#add-book-title-input').element as HTMLInputElement).value).toBe(
      "My grandmother's diary",
    );
  });

  it('says the title is required and sends nothing without one', async () => {
    const wrapper = mountForm('   ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.text()).toContain('Title is required');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('rejects a page count that is not a whole number above 0', async () => {
    const wrapper = mountForm('Diary');
    await wrapper.get('#add-book-pages').setValue('0');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.text()).toContain('Pages must be a whole number above 0');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('sends only the fields that were filled in, trimmed', async () => {
    const wrapper = mountForm(' Diary ');
    await wrapper.get('#add-book-author').setValue(' Rosa ');
    await wrapper.get('#add-book-pages').setValue('120');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toEqual([
      [{ title: 'Diary', authors: ['Rosa'], pageCount: 120 }],
    ]);
  });

  it('sends the ISBN and description when filled in', async () => {
    const wrapper = mountForm('Diary');
    await wrapper.get('#add-book-isbn').setValue(' 9780000000001 ');
    await wrapper.get('#add-book-description').setValue('  Family notes  ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toEqual([
      [{ title: 'Diary', isbn13: '9780000000001', description: 'Family notes' }],
    ]);
  });

  it('shows the error from the parent and emits cancel', async () => {
    const wrapper = mount(AddBookForm, {
      props: { initialTitle: 'Diary', saving: true, error: 'Server down' },
    });

    expect(wrapper.get('[role="alert"]').text()).toBe('Server down');
    expect(wrapper.get('button[type="submit"]').text()).toBe('Adding…');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();

    await wrapper.get('button[type="button"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
