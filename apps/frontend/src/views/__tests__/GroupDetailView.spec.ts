import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import GroupDetailView from '../GroupDetailView.vue';

function mountGroup(groupId: string) {
  return mount(GroupDetailView, { props: { groupId }, global: { plugins: [router] } });
}

describe('GroupDetailView', () => {
  it('shows the challenge page with the leaderboard and sends a chat message', async () => {
    const wrapper = mountGroup('october-sprint');

    expect(wrapper.get('h1').text()).toBe('October Sprint');
    expect(wrapper.text()).toContain('#2 · 420');
    expect(wrapper.findAll('.board > li')).toHaveLength(6);
    expect(wrapper.get('.board').text()).toContain('Eleanor Whitmore · you');

    await wrapper.get('input[type="text"]').setValue('See you on the leaderboard');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.text()).toContain('See you on the leaderboard');
  });

  it('does not send an empty chat message', async () => {
    const wrapper = mountGroup('october-sprint');
    const before = wrapper.findAll('.messages > li').length;

    await wrapper.get('input[type="text"]').setValue('   ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.findAll('.messages > li')).toHaveLength(before);
  });

  it('switches the challenge conversation tabs', async () => {
    const wrapper = mountGroup('october-sprint');

    await wrapper
      .findAll('.tab')
      .find((t) => t.text().startsWith('Members'))!
      .trigger('click');

    expect(wrapper.findAll('.members li')).toHaveLength(6);
  });

  it('shows the book club page with the round and the vote', () => {
    const wrapper = mountGroup('classics');

    expect(wrapper.get('h1').text()).toBe('Classics, in good company.');
    expect(wrapper.text()).toContain('2 of 6 finished');
    expect(wrapper.text()).toContain('Start Emma session');
    expect(wrapper.findAll('.options > li')).toHaveLength(3);
  });

  it('changes the vote and adds a proposal', async () => {
    const wrapper = mountGroup('classics');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Change my vote')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Vote for Piranesi')!
      .trigger('click');

    const options = wrapper.findAll('.options > li');
    expect(options[0]!.text()).toContain('2 votes');
    expect(options[1]!.text()).toMatch(/3 votes\s+· your vote/);

    await wrapper.get('#proposal-title').setValue('Middlemarch');
    await wrapper.get('.proposal').trigger('submit');

    expect(wrapper.findAll('.options > li')).toHaveLength(4);
  });

  it('explains when a group has no page in the prototype', () => {
    const wrapper = mountGroup('winter-classics');

    expect(wrapper.get('h1').text()).toContain('not part of the prototype');
  });
});
