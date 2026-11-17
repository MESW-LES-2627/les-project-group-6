import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import type { UserSearchResult } from '@/services/api';
import UserSearchResults from '../UserSearchResults.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p />' } },
    { path: '/users/:username', name: 'user-profile', component: { template: '<p />' } },
  ],
});

const sampleUser: UserSearchResult = {
  id: 'u1',
  username: 'pedro_reads',
  displayName: 'Pedro Silva',
  photoUrl: null,
  bio: 'Reading classic literature.',
  profileVisibility: 'private',
};

function mountResults(
  props: { users?: UserSearchResult[]; loading?: boolean; error?: boolean } = {},
) {
  return mount(UserSearchResults, {
    props: { query: 'pedro', users: [sampleUser], loading: false, error: false, ...props },
    global: { plugins: [router] },
  });
}

describe('UserSearchResults', () => {
  it('lists the readers with avatar, name, handle, bio, and profile link', async () => {
    const wrapper = mountResults();

    expect(wrapper.get('h2').text()).toBe('Readers');
    expect(wrapper.text()).toContain('1 result');
    expect(wrapper.get('.avatar-initials').text()).toBe('PS');
    expect(wrapper.get('.name').text()).toBe('Pedro Silva');
    expect(wrapper.get('.badge-private').text()).toBe('Private');
    expect(wrapper.get('.handle').text()).toBe('@pedro_reads');
    expect(wrapper.get('.bio').text()).toBe('Reading classic literature.');
    expect(wrapper.get('li a').attributes('href')).toBe('/users/pedro_reads');

    await wrapper.get('.link-button').trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('renders photoUrl when present', () => {
    const userWithPhoto: UserSearchResult = {
      ...sampleUser,
      photoUrl: 'https://example.com/photo.jpg',
    };
    const wrapper = mountResults({ users: [userWithPhoto] });

    expect(wrapper.find('.avatar-img').exists()).toBe(true);
    expect(wrapper.get('.avatar-img').attributes('src')).toBe('https://example.com/photo.jpg');
    expect(wrapper.find('.avatar-initials').exists()).toBe(false);
  });

  it('says when nothing matches, while searching and when search fails', () => {
    expect(mountResults({ users: [] }).text()).toContain('No readers match "pedro".');
    expect(mountResults({ error: true }).text()).toContain(
      'Reader search is unavailable right now.',
    );
    expect(mountResults({ loading: true }).text()).toContain('Searching readers…');
  });

  it('uses the first letter of a one-word name as the avatar', () => {
    const wrapper = mountResults({ users: [{ ...sampleUser, displayName: 'pedro' }] });

    expect(wrapper.get('.avatar-initials').text()).toBe('P');
  });
});
