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

  it('routes to the profile page', async () => {
    await router.push('/profile');

    expect(router.currentRoute.value.name).toBe('profile');
  });

  it('routes unknown paths to the not-found page', async () => {
    await router.push('/unknown');

    expect(router.currentRoute.value.name).toBe('not-found');
  });
});
