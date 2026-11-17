// @req F-GRP-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import type { GroupSummary } from '@/types/groups';
import GroupCard from '../GroupCard.vue';

const group = (overrides: Partial<GroupSummary> = {}): GroupSummary => ({
  id: 'winter-minutes',
  name: 'Winter Minutes',
  kind: 'challenge',
  status: 'active',
  headline: '#1 · 40 min',
  progress: 10,
  detail: '29 days left',
  meta: '1–30 Nov',
  memberInitials: [],
  memberCount: 3,
  ...overrides,
});

function mountCard(props: { group: GroupSummary; variant?: 'feature' | 'compact' }) {
  return mount(GroupCard, { props, global: { plugins: [router] } });
}

describe('GroupCard', () => {
  it('counts the readers when the group lists no initials', () => {
    expect(mountCard({ group: group() }).get('.more').text()).toBe('3 readers');
    expect(
      mountCard({ group: group({ memberCount: 1 }) })
        .get('.more')
        .text(),
    ).toBe('1 reader');
  });

  it('shows the readers beyond the listed initials as a plus count', () => {
    const wrapper = mountCard({ group: group({ memberInitials: ['ML', 'PS'], memberCount: 5 }) });
    expect(wrapper.get('.more').text()).toBe('+3');
  });

  it('emits rematch with the group from a completed compact card', async () => {
    const completed = group({ status: 'completed', canRematch: true });
    const wrapper = mountCard({ group: completed, variant: 'compact' });

    expect(wrapper.text()).toContain('Challenge · #1 · 40 min · 29 days left');
    await wrapper.get('.rematch').trigger('click');

    expect(wrapper.emitted('rematch')).toEqual([[completed]]);
  });
});
