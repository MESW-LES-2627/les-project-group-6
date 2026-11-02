import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiBook, ApiReadingSession } from '@/services/api';
import ActiveSessionView from '../ActiveSessionView.vue';

const BOOK_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const SESSION_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';

// A fake server: it keeps one running session per reader, as the backend does,
// so mounting the view again behaves like a page reload.
const server = vi.hoisted(() => ({
  session: null as ApiReadingSession | null,
  elapsedSeconds: 0,
}));

const api = vi.hoisted(() => ({
  getBook: vi.fn<(bookId: string) => Promise<ApiBook>>(),
  startReadingSession: vi.fn<(bookId: string) => Promise<ApiReadingSession>>(),
  finishReadingSession: vi.fn<(sessionId: string) => Promise<ApiReadingSession>>(),
  cancelReadingSession: vi.fn<(sessionId: string) => Promise<void>>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

const book: ApiBook = {
  id: BOOK_ID,
  title: 'Emma',
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
};

// Stub pages: finishing or cancelling navigates away, and the app router would
// lazy-load real views after the test file is torn down.
const Stub = { template: '<div />' };
const router = createRouter({
  history: createMemoryHistory(),
  routes: ['library', 'book-detail', 'profile'].map((name) => ({
    name,
    path: name === 'book-detail' ? '/library/:bookId' : `/${name}`,
    component: Stub,
  })),
});

function mountView() {
  return mount(ActiveSessionView, {
    props: { bookId: BOOK_ID },
    global: { plugins: [router] },
  });
}

describe('ActiveSessionView with a server session', () => {
  beforeEach(() => {
    server.session = null;
    server.elapsedSeconds = 0;
    api.getBook.mockResolvedValue(book);
    api.startReadingSession.mockImplementation(async (bookId: string) => {
      server.session ??= {
        id: SESSION_ID,
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        bookId,
        startedAt: '2026-10-31T10:00:00.000Z',
        endedAt: null,
        elapsedSeconds: 0,
        countedMinutes: 0,
      };
      return { ...server.session, elapsedSeconds: server.elapsedSeconds };
    });
    api.finishReadingSession.mockResolvedValue({} as ApiReadingSession);
    api.cancelReadingSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('starts a session on the server when the page opens', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(api.startReadingSession).toHaveBeenCalledWith(BOOK_ID);
    expect(wrapper.get('.timer-time').text()).toBe('00:00:00');
    wrapper.unmount();
  });

  it('reuses the same session after a page reload, with the server elapsed time', async () => {
    const first = mountView();
    await flushPromises();
    first.unmount();

    server.elapsedSeconds = 12 * 60 + 5;
    const reloaded = mountView();
    await flushPromises();

    expect(api.startReadingSession).toHaveBeenCalledTimes(2);
    expect(reloaded.get('.timer-time').text()).toBe('00:12:05');

    await reloaded.get('.timer-button--stop').trigger('click');
    await flushPromises();
    expect(api.finishReadingSession).toHaveBeenCalledWith(SESSION_ID);
    expect(router.currentRoute.value.name).toBe('profile');
    reloaded.unmount();
  });

  it('cancels the session after confirmation and saves nothing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('.timer-button--cancel').trigger('click');
    await flushPromises();

    expect(api.cancelReadingSession).toHaveBeenCalledWith(SESSION_ID);
    expect(router.currentRoute.value.name).toBe('book-detail');
    expect(api.finishReadingSession).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the session running when the cancel is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('.timer-button--cancel').trigger('click');
    await flushPromises();

    expect(api.cancelReadingSession).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows the server error when another session is running', async () => {
    api.startReadingSession.mockRejectedValue(
      new Error('Only one reading session can run at a time; finish the active one first'),
    );
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.session-error').text()).toContain('Only one reading session');
    wrapper.unmount();
  });
});
