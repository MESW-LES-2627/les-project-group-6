import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PageSkeleton from '../PageSkeleton.vue';

describe('PageSkeleton', () => {
  it('announces the label once and hides the blocks from screen readers', () => {
    const wrapper = mount(PageSkeleton, { props: { label: 'Loading the book…' } });

    const root = wrapper.get('[role="status"]');
    expect(root.attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(root.get('.sr-only').text()).toBe('Loading the book…');
    expect(root.get('[aria-hidden="true"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('.skeleton').every((s) => s.attributes('aria-hidden') === 'true')).toBe(
      true,
    );
  });

  it('defaults to the detail layout with a side rail and no cover column', () => {
    const wrapper = mount(PageSkeleton, { props: { label: 'Loading the group…' } });

    expect(wrapper.classes()).toContain('detail');
    expect(wrapper.find('.detail-layout.has-rail').exists()).toBe(true);
    expect(wrapper.find('.detail-layout.has-cover').exists()).toBe(false);
    expect(wrapper.find('.cover').exists()).toBe(false);
  });

  it('puts the burgundy plate above the detail layout when asked', () => {
    const wrapper = mount(PageSkeleton, {
      props: { label: 'Loading the group…', plate: true },
    });

    expect(wrapper.find('.band').exists()).toBe(true);
    expect(wrapper.find('.band .plate').exists()).toBe(true);
    expect(wrapper.find('.detail-body.page-column').exists()).toBe(true);
    expect(wrapper.find('.detail-body .title').exists()).toBe(false);
  });

  it('adds a cover column to the detail layout and can drop the rail', () => {
    const wrapper = mount(PageSkeleton, {
      props: { label: 'Loading the book…', cover: true, rail: false },
    });

    expect(wrapper.find('.detail-layout.has-cover').exists()).toBe(true);
    expect(wrapper.find('.detail-layout.has-rail').exists()).toBe(false);
    expect(wrapper.find('.cover').exists()).toBe(true);
    expect(wrapper.find('.rail').exists()).toBe(false);
  });

  it('draws an identity band with a round avatar for the profile layout', () => {
    const wrapper = mount(PageSkeleton, {
      props: { label: 'Loading your profile…', variant: 'profile' },
    });

    expect(wrapper.find('.band').exists()).toBe(true);
    expect(wrapper.find('.band .skeleton').attributes('style')).toContain('border-radius: 50%');
    expect(wrapper.find('.profile-columns').exists()).toBe(true);
  });

  it('draws as many cards as asked, with a filter sidebar when requested', () => {
    const plain = mount(PageSkeleton, {
      props: { label: 'Loading…', variant: 'cards', count: 3 },
    });
    expect(plain.findAll('.card')).toHaveLength(3);
    expect(plain.find('.filters').exists()).toBe(false);

    const shelf = mount(PageSkeleton, {
      props: { label: 'Loading your library…', variant: 'cards', sidebar: true, count: 8 },
    });
    expect(shelf.findAll('.card')).toHaveLength(8);
    expect(shelf.find('.filters').exists()).toBe(true);
    expect(shelf.find('.cards-layout.has-sidebar').exists()).toBe(true);
  });

  it('puts the cover beside the text, with a button, in row cards', () => {
    const column = mount(PageSkeleton, {
      props: { label: 'Loading…', variant: 'cards', card: 'column', count: 1 },
    });
    const row = mount(PageSkeleton, {
      props: { label: 'Loading…', variant: 'cards', card: 'row', count: 1 },
    });

    expect(column.find('.card.column').exists()).toBe(true);
    expect(row.find('.card.row').exists()).toBe(true);
    expect(row.findAll('.card .skeleton').length).toBeGreaterThan(
      column.findAll('.card .skeleton').length,
    );
  });

  it('draws a plain vertical list of rows for the rows layout', () => {
    const wrapper = mount(PageSkeleton, {
      props: { label: 'Loading your groups…', variant: 'rows', count: 3 },
    });

    expect(wrapper.findAll('.rows .list-row')).toHaveLength(3);
    expect(wrapper.find('.list-section').exists()).toBe(false);
  });

  it('draws titled sections of rows for the list layout', () => {
    const wrapper = mount(PageSkeleton, {
      props: { label: 'Loading your groups…', variant: 'list', sections: 3, count: 2 },
    });

    expect(wrapper.findAll('.list-section')).toHaveLength(3);
    expect(wrapper.findAll('.list-section')[0]?.findAll('.list-row')).toHaveLength(2);
  });
});
