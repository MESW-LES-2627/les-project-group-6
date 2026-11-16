// @req F-AUTH-01
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';
import { createSession } from '@/stores/session';
import { fakeAuth, fakeProfileApi, TEST_ACCOUNT } from '@/stores/__tests__/fake-session';
import router, { installAuthGuard } from '../index';

// The app router runs with a signed-in reader; the guard itself is tested below.
vi.mock('@/stores/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/session')>();
  const { readySession } = await import('@/stores/__tests__/fake-session');
  return { ...actual, session: readySession(actual.createSession) };
});

describe('router', () => {
  it('redirects the root path to home', async () => {
    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('hides the app chrome on the login route and marks it public', () => {
    const login = router.getRoutes().find((r) => r.name === 'login')!;

    expect(login.meta.hideAppChrome).toBe(true);
    expect(login.meta.public).toBe(true);
  });

  it('routes to the home page', async () => {
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

  it('routes to another reader profile page with username', async () => {
    await router.push('/users/jane_doe');

    expect(router.currentRoute.value.name).toBe('user-profile');
    expect(router.currentRoute.value.params.username).toBe('jane_doe');
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

describe('auth guard (F-AUTH-01)', () => {
  function guarded(state: 'signed-out' | 'profile-required' | 'ready') {
    // No sign-up metadata, so the profile cannot be finished silently.
    const account = { ...TEST_ACCOUNT, username: null, displayName: null };
    const session = createSession(
      fakeAuth(state === 'signed-out' ? null : account).auth,
      fakeProfileApi(state === 'ready' ? undefined : null),
    );
    const target = createRouter({ history: createMemoryHistory(), routes: router.options.routes });
    installAuthGuard(target, session);
    return { target, session };
  }

  it.each(['/home', '/library', '/groups/new', '/profile', '/unknown'])(
    'sends a visitor who opens %s to the login page, remembering where they were going',
    async (path) => {
      const { target } = guarded('signed-out');
      await target.push(path);

      expect(target.currentRoute.value.name).toBe('login');
      expect(target.currentRoute.value.query.redirect).toBe(path);
    },
  );

  it('lets a visitor open the login page', async () => {
    const { target } = guarded('signed-out');
    await target.push('/login');

    expect(target.currentRoute.value.name).toBe('login');
  });

  it('keeps a reader without a profile on the complete-profile step', async () => {
    const { target } = guarded('profile-required');
    await target.push('/home');
    expect(target.currentRoute.value.name).toBe('complete-profile');

    await target.push('/login');
    expect(target.currentRoute.value.name).toBe('complete-profile');
  });

  it('sends a signed-in reader away from login and complete-profile to Home', async () => {
    const { target } = guarded('ready');
    await target.push('/login');
    expect(target.currentRoute.value.name).toBe('home');

    await target.push('/complete-profile');
    expect(target.currentRoute.value.name).toBe('home');

    await target.push('/library');
    expect(target.currentRoute.value.name).toBe('library');
  });

  it('shows the login page again after logging out', async () => {
    const { target, session } = guarded('ready');
    await target.push('/home');
    await session.signOut();
    await target.push('/library');

    expect(target.currentRoute.value.name).toBe('login');
  });
});
