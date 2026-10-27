import { describe, expect, it } from 'vitest';
import router from '../index';

describe('router', () => {
  it('redirects the root path to login', async () => {
    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('routes to the home placeholder', async () => {
    await router.push('/home');

    expect(router.currentRoute.value.name).toBe('home');
  });

  it('routes to the library page', async () => {
    await router.push('/library');

    expect(router.currentRoute.value.name).toBe('library');
  });

  it('routes to a book detail page with the book id', async () => {
    await router.push('/library/emma');

    expect(router.currentRoute.value.name).toBe('book-detail');
    expect(router.currentRoute.value.params.bookId).toBe('emma');
  });

  it('routes to the active session for a book id', async () => {
    await router.push('/session/emma');

    expect(router.currentRoute.value.name).toBe('active-session');
    expect(router.currentRoute.value.params.bookId).toBe('emma');
  });

  it('routes to the profile page', async () => {
    await router.push('/profile');

    expect(router.currentRoute.value.name).toBe('profile');
  });

  it('routes unknown paths to the not-found page', async () => {
    await router.push('/unknown');

    expect(router.currentRoute.value.name).toBe('not-found');
  });

  it('routes to the groups pages', async () => {
    await router.push('/groups');
    expect(router.currentRoute.value.name).toBe('groups');

    await router.push('/groups/new');
    expect(router.currentRoute.value.name).toBe('group-create');

    await router.push('/groups/october-sprint');
    expect(router.currentRoute.value.name).toBe('group-detail');
    expect(router.currentRoute.value.params.groupId).toBe('october-sprint');
  });
});
