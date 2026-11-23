<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import PageSkeleton from '@/components/layout/PageSkeleton.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import ReadingTimer from '@/components/session/ReadingTimer.vue';
import SessionSummary from '@/components/session/SessionSummary.vue';
import {
  cancelReadingSession,
  finishReadingSession,
  getBook,
  getUserBookClubs,
  getUserGroups,
  getUserLibrary,
  mapApiBookToLibraryBook,
  mapApiLibraryItemToBook,
  sessionGroupsFor,
  startReadingSession,
  type ApiReadingSession,
} from '@/services/api';
import type { LibraryBook } from '@/types/library';
import type { SessionGroup } from '@/types/session';

const props = defineProps<{ bookId: string }>();

// Fair reading rules the server enforces today (F-READ-01).
const RULES = [
  'The server keeps the clock; the time cannot be typed in',
  'Only finished sessions count towards streaks and groups',
  'One active session at a time',
  'Cancelling a session discards its time',
];

const router = useRouter();
const book = ref<LibraryBook | null>(null);
const serverSession = ref<ApiReadingSession | null>(null);
const groups = ref<SessionGroup[]>([]);
const sessionError = ref<string | null>(null);
const busy = ref(false);
const loading = ref(true);
/** The finished session, shown as a summary before leaving the page (#49). */
const finished = ref<ApiReadingSession | null>(null);

const session = computed(() => {
  if (!book.value || !serverSession.value) return null;
  const time = new Date(serverSession.value.startedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    bookId: book.value.id,
    startedAtLabel: `Started at ${time}`,
    startTimeLabel: time,
    startPage: book.value.currentPage,
    elapsedSeconds: serverSession.value.elapsedSeconds,
    groups: groups.value,
  };
});

// The book and the session come from the API; starting resumes a session already
// running on this book. Groups only add context, so a failure there is ignored.
onMounted(async () => {
  try {
    const item = (await getUserLibrary()).find((entry) => entry.book.id === props.bookId);
    book.value = item
      ? mapApiLibraryItemToBook(item)
      : mapApiBookToLibraryBook(await getBook(props.bookId));
    serverSession.value = await startReadingSession(props.bookId);
  } catch (error) {
    if (book.value) sessionError.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
  try {
    const [challenges, clubs] = await Promise.all([getUserGroups(), getUserBookClubs()]);
    groups.value = sessionGroupsFor(props.bookId, challenges, clubs);
  } catch {
    groups.value = [];
  }
});

const currentPage = ref(0);
const percentage = ref(0);

watchEffect(() => {
  if (!book.value || !session.value) return;
  currentPage.value = session.value.startPage;
  percentage.value = Math.round((session.value.startPage / book.value.pages) * 100);
});

const pagesSinceStart = computed(() =>
  Math.max(0, currentPage.value - (session.value?.startPage ?? 0)),
);

const eligibleGroupsLabel = computed(() => {
  const count = session.value?.groups.length ?? 0;
  return `${count} eligible ${count === 1 ? 'group' : 'groups'}`;
});

function updateFromPage() {
  if (!book.value) return;
  const page = Math.min(book.value.pages, Math.max(0, Math.round(Number(currentPage.value) || 0)));
  currentPage.value = page;
  percentage.value = book.value.pages > 0 ? Math.round((page / book.value.pages) * 100) : 0;
}

function updateFromPercentage() {
  if (!book.value) return;
  const percent = Math.min(100, Math.max(0, Math.round(Number(percentage.value) || 0)));
  percentage.value = percent;
  currentPage.value = Math.round((percent / 100) * book.value.pages);
}

async function stopSession() {
  if (!serverSession.value) return;

  await whileBusy(async () => {
    finished.value = await finishReadingSession(serverSession.value!.id);
  });
}

function closeSummary() {
  void router.push({ name: 'profile' });
}

/** Discards a session started by mistake; nothing is saved to the profile. */
async function cancelSession() {
  if (!book.value || !serverSession.value) return;
  const bookRoute = { name: 'book-detail', params: { bookId: book.value.id } };
  if (!window.confirm('Cancel this session? The time will not be saved.')) return;

  await whileBusy(async () => {
    await cancelReadingSession(serverSession.value!.id);
    void router.push(bookRoute);
  });
}

async function whileBusy(action: () => Promise<void>) {
  busy.value = true;
  sessionError.value = null;
  try {
    await action();
  } catch (error) {
    sessionError.value = (error as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="session-view">
    <div class="page-column">
      <SessionSummary
        v-if="book && finished"
        :title="book.title"
        :cover="book.detailCover ?? book.cover"
        :duration-seconds="finished.elapsedSeconds"
        :counted-minutes="finished.countedMinutes"
        @done="closeSummary"
      />
      <template v-else-if="book && session">
        <header class="session-header">
          <div class="header-copy">
            <p class="eyebrow">
              <RouterLink :to="{ name: 'library' }">Reading room</RouterLink>
              <span aria-hidden="true">/</span>
              Session in progress
            </p>
            <h1 class="session-title">Just you and the next chapter.</h1>
            <p class="session-subtitle">
              Your session is linked to {{ book.title }}. Take your time; we'll keep the clock.
            </p>
          </div>

          <p class="session-pill">
            <span class="pill-dot" aria-hidden="true"></span>
            Session running
          </p>
        </header>

        <div class="session-layout">
          <div class="main-stack">
            <section class="session-card" :aria-labelledby="`session-book-${book.id}`">
              <div class="book-row">
                <div class="session-cover">
                  <BookCoverImage :src="book.detailCover ?? book.cover" :title="book.title" />
                </div>

                <div class="book-copy">
                  <h2 :id="`session-book-${book.id}`" class="session-book-title">
                    {{ book.title }}
                  </h2>
                  <p v-if="book.author" class="session-book-author">{{ book.author }}</p>
                  <span class="one-session">Only one active session at a time</span>
                  <p class="session-meta">
                    {{ session.startedAtLabel }} <span aria-hidden="true">•</span> Start page
                    {{ session.startPage }}
                  </p>
                </div>
              </div>

              <p v-if="sessionError" class="session-error" role="alert">{{ sessionError }}</p>

              <ReadingTimer
                :key="serverSession?.id"
                :initial-seconds="session.elapsedSeconds"
                :busy="busy"
                @stop="stopSession"
                @cancel="cancelSession"
              />

              <div class="progress-editor">
                <label class="page-field">
                  <span class="field-label">Current page</span>
                  <input
                    v-model.number="currentPage"
                    class="field-input"
                    type="number"
                    min="0"
                    :max="book.pages"
                    inputmode="numeric"
                    @input="updateFromPage"
                  />
                </label>

                <label class="page-field">
                  <span class="field-label">Or percentage</span>
                  <span class="percentage-field">
                    <input
                      v-model.number="percentage"
                      type="number"
                      min="0"
                      max="100"
                      inputmode="numeric"
                      aria-label="Reading percentage"
                      :style="{ width: `${Math.max(1, String(percentage).length)}ch` }"
                      @input="updateFromPercentage"
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                </label>

                <div class="progress-summary">
                  <p class="progress-note">+{{ pagesSinceStart }} pages since you started</p>
                  <progress
                    class="progress-bar page-progress"
                    :max="book.pages"
                    :value="currentPage"
                    :aria-label="`Progress in ${book.title}: ${percentage}%`"
                  ></progress>
                  <p class="page-count">{{ currentPage }} / {{ book.pages }} pages</p>
                </div>
              </div>
            </section>

            <aside class="resume-note" aria-label="Session reminder">
              <span class="note-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <div class="note-copy">
                <p class="note-title">
                  Welcome back. Your {{ book.title }} session is still running.
                </p>
                <p class="note-body">
                  Started at {{ session.startTimeLabel }} <span aria-hidden="true">•</span> Closing
                  the tab doesn't stop your session. You're back at the timer now: stop and save, or
                  cancel above. Only one session can run at a time.
                </p>
              </div>
            </aside>
          </div>

          <aside class="session-rail">
            <section class="counts-card" aria-labelledby="counts-title">
              <h2 id="counts-title" class="card-title">Where this session counts</h2>
              <p class="eligible-groups">{{ eligibleGroupsLabel }}</p>

              <div v-if="session.groups.length > 0" class="groups">
                <article v-for="group in session.groups" :key="group.id" class="group">
                  <h3 class="group-title">{{ group.name }}</h3>
                  <p class="group-description">{{ group.description }}</p>
                  <p class="group-note">{{ group.note }}</p>
                </article>
              </div>
              <p v-else class="empty-copy">No active group counts this session.</p>
            </section>

            <section class="rules-card" aria-labelledby="rules-title">
              <h2 id="rules-title" class="card-title">Fair reading rules</h2>
              <ul class="rules-list">
                <li v-for="rule in RULES" :key="rule">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  <span>{{ rule }}</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </template>

      <PageSkeleton v-else-if="loading" label="Starting your session…" />

      <section v-else class="missing" aria-labelledby="missing-session-title">
        <p class="eyebrow">Reading room <span aria-hidden="true">/</span> Session</p>
        <h1 id="missing-session-title" class="missing-title">
          {{ book ? 'Session could not start' : 'Session not found' }}
        </h1>
        <p v-if="sessionError" class="session-error" role="alert">{{ sessionError }}</p>
        <p v-else class="missing-copy">
          This book could not be found. Go back to the library to start a session.
        </p>
        <RouterLink class="button missing-link" :to="{ name: 'library' }">
          Back to library
        </RouterLink>
      </section>
    </div>
  </main>
</template>

<style scoped>
.session-error {
  margin: 16px 0 0;
  color: #6f1d1b;
  font-size: 0.875rem;
}

.session-view {
  padding: 10px 0 30px;
}

.session-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
}

.header-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--color-copper);
  font-size: 0.5625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.eyebrow a {
  color: inherit;
  text-decoration: none;
}

.eyebrow a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.session-title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.025em;
  line-height: 1.1;
}

.session-subtitle {
  margin: 5px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.session-pill {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: center;
  min-height: 25px;
  margin: 30px 0 0;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--color-cream);
  color: var(--color-primary);
  font-size: 0.5625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.pill-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.session-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 382px;
  gap: 29px;
  align-items: start;
  margin-top: 25px;
}

.main-stack {
  min-width: 0;
}

.session-card {
  padding: 35px 35px 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.book-row {
  display: flex;
  gap: 23px;
  align-items: flex-start;
}

.session-cover {
  display: block;
  flex: none;
  width: 85px;
  box-shadow: var(--shadow-cover);
}

.book-copy {
  min-width: 0;
  padding-top: 3px;
}

.session-book-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.session-book-author {
  margin: 13px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.3;
}

.one-session {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  margin-top: 10px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: 0.625rem;
  line-height: 1;
}

.session-meta {
  margin: 7px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.progress-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(0, 1.01fr);
  gap: 24px;
  align-items: start;
  margin-top: 47px;
}

.page-field {
  display: block;
  min-width: 0;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.field-input,
.percentage-field {
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.field-input {
  padding: 0 8px;
  font: inherit;
  font-size: var(--font-size-xs);
}

.field-input:focus,
.percentage-field:focus-within {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.percentage-field {
  gap: 0;
  padding: 0 8px;
}

.percentage-field input {
  flex: none;
  min-width: 1ch;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  outline: none;
  appearance: textfield;
}

.field-input::-webkit-inner-spin-button,
.field-input::-webkit-outer-spin-button,
.percentage-field input::-webkit-inner-spin-button,
.percentage-field input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.progress-summary {
  min-width: 0;
}

.progress-note,
.page-count {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.35;
}

.page-progress {
  height: 4px;
  margin-top: 11px;
  border-radius: 2px;
}

.page-progress::-webkit-progress-bar,
.page-progress::-webkit-progress-value,
.page-progress::-moz-progress-bar {
  border-radius: 2px;
}

.page-count {
  margin-top: 13px;
}

.resume-note {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin-top: 25px;
  padding: 12px 20px 12px 13px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.note-icon {
  display: block;
  margin-top: 1px;
  color: var(--color-copper);
}

.note-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
}

.note-body {
  margin: 3px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  line-height: 1.35;
}

.session-rail {
  display: flex;
  flex-direction: column;
  gap: 30px;
  min-width: 0;
}

.counts-card,
.rules-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.counts-card {
  padding: 24px 18px 11px;
}

.rules-card {
  padding: 24px 18px 12px;
}

.card-title {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.eligible-groups {
  margin: 17px 0 0 8px;
  color: var(--color-text-muted);
  font-size: 0.5625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  line-height: 1.3;
  text-transform: uppercase;
}

.groups {
  margin-top: 23px;
}

.group + .group {
  margin-top: 34px;
}

.group-title {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.group-description {
  margin: 18px 0 0;
  font-size: 0.6875rem;
  line-height: 1.4;
}

.group-note {
  margin: 16px 0 0;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  line-height: 1.4;
}

.empty-copy {
  margin: 20px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.rules-list li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  font-size: 0.75rem;
  line-height: 1.4;
}

.rules-list svg {
  margin-top: 2px;
  color: var(--color-copper);
}

.missing {
  max-width: 36rem;
  padding: 60px 0;
}

.missing-title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.missing-copy {
  margin: 12px 0 22px;
  color: var(--color-text-muted);
}

.missing-link {
  width: fit-content;
}

@media (max-width: 1199px) {
  .session-layout {
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
  }
}

@media (max-width: 899px) {
  .session-view {
    padding-top: 20px;
  }

  .session-pill {
    margin-top: 0;
  }

  .session-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
  }

  .session-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-6);
  }
}

@media (max-width: 639px) {
  .session-title {
    font-size: 2.25rem;
  }

  .session-card {
    padding: 20px 16px 22px;
  }

  .book-row {
    gap: 14px;
  }

  .session-cover {
    width: 70px;
  }

  .one-session {
    min-height: 20px;
    padding: 3px 8px;
    line-height: 1.15;
  }

  .progress-editor {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 36px;
  }

  .progress-summary {
    padding-top: 2px;
  }

  .session-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .counts-card,
  .rules-card {
    padding: 20px 16px;
  }
}
</style>
