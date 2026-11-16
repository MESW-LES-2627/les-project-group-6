<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AddBookForm from '@/components/explore/AddBookForm.vue';
import BookSearchResults from '@/components/explore/BookSearchResults.vue';
import ExploreSearchBar from '@/components/explore/ExploreSearchBar.vue';
import TrendingBookCard from '@/components/explore/TrendingBookCard.vue';
import UserSearchBar from '@/components/explore/UserSearchBar.vue';
import UserSearchResults from '@/components/explore/UserSearchResults.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import {
  addBook,
  addToLibrary,
  getExplore,
  mapApiBookToLibraryBook,
  searchBooks,
  searchUsers,
  type ApiExplore,
  type NewBookPayload,
  type UserSearchResult,
} from '@/services/api';
import type { LibraryBook } from '@/types/library';

type TabId = 'trending' | 'most-read';

const TABS: { id: TabId; label: string; rankLabel: string; emptyText: string }[] = [
  {
    id: 'trending',
    label: 'Trending',
    rankLabel: '#1 Trending',
    emptyText: 'No books added this week yet.',
  },
  {
    id: 'most-read',
    label: 'Most read this week',
    rankLabel: '#1 This week',
    emptyText: 'No reading logged this week yet.',
  },
];

const route = useRoute();
const router = useRouter();

// F-EXP-04: the two weekly lists.
const overview = ref<ApiExplore | null>(null);
const loading = ref(true);
const loadError = ref(false);
const activeTab = ref<TabId>('trending');
const tab = computed(() => TABS.find((t) => t.id === activeTab.value)!);

async function loadOverview() {
  loading.value = true;
  loadError.value = false;
  try {
    overview.value = await getExplore();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);

// With nothing trending this week, the Trending tab shows random books to start with.
const showingSuggestions = computed(
  () =>
    activeTab.value === 'trending' &&
    !!overview.value &&
    overview.value.trending.length === 0 &&
    overview.value.suggestions.length > 0,
);

const cards = computed<{ book: LibraryBook; metric: string }[]>(() => {
  if (!overview.value) return [];
  if (showingSuggestions.value) {
    return overview.value.suggestions.map((book) => ({
      book: mapApiBookToLibraryBook(book),
      metric: 'A pick to start with',
    }));
  }
  if (activeTab.value === 'trending') {
    return overview.value.trending.map((entry) => ({
      book: mapApiBookToLibraryBook(entry.book),
      metric: entry.readers === 1 ? '1 reader added it' : `${entry.readers} readers added it`,
    }));
  }
  return overview.value.mostReadThisWeek.map((entry) => ({
    book: mapApiBookToLibraryBook(entry.book),
    metric: `${entry.minutes} min read`,
  }));
});

// F-EXP-01: the search lives in `?q=`, so reload and back keep it. Typing searches
// 300 ms after the last keystroke (replacing the URL); Enter searches at once (pushing it).
const MIN_QUERY_LENGTH = 2;
const TYPING_DELAY_MS = 300;

/** The `?q=` a text leads to: trimmed, or '' when too short to search. */
function toQuery(text: string): string {
  const trimmed = text.trim();
  return trimmed.length >= MIN_QUERY_LENGTH ? trimmed : '';
}

function routeWith(changes: { q?: string; uq?: string }) {
  const next: Record<string, string> = {};
  const currentQ = typeof route.query.q === 'string' ? route.query.q.trim() : '';
  const currentUq = typeof route.query.uq === 'string' ? route.query.uq.trim() : '';

  const finalQ = changes.q !== undefined ? changes.q : currentQ;
  const finalUq = changes.uq !== undefined ? changes.uq : currentUq;

  if (finalQ) next.q = finalQ;
  if (finalUq) next.uq = finalUq;

  return { name: 'explore', query: next };
}

// ---------------------------------------------------------------------------
// Book Search
// ---------------------------------------------------------------------------
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''));
const draft = ref(query.value);
const results = ref<LibraryBook[]>([]);
const searching = ref(false);
const searchError = ref(false);
let latestSearch = 0;
let inFlight: AbortController | undefined;
let typingTimer: ReturnType<typeof setTimeout> | undefined;

watch(draft, (text) => {
  clearTimeout(typingTimer);
  if (toQuery(text) === query.value) return;
  typingTimer = setTimeout(
    () => void router.replace(routeWith({ q: toQuery(text) })),
    TYPING_DELAY_MS,
  );
});

watch(
  query,
  async (q) => {
    if (toQuery(draft.value) !== q) draft.value = q;
    inFlight?.abort();
    searchError.value = false;
    const id = ++latestSearch;
    if (!q) {
      results.value = [];
      searching.value = false;
      return;
    }
    searching.value = true;
    const controller = (inFlight = new AbortController());
    try {
      const found = await searchBooks(q, controller.signal);
      if (id === latestSearch) results.value = found.map((b) => mapApiBookToLibraryBook(b));
    } catch {
      if (id === latestSearch) {
        results.value = [];
        searchError.value = true;
      }
    } finally {
      if (id === latestSearch) searching.value = false;
    }
  },
  { immediate: true },
);

function search(text: string) {
  clearTimeout(typingTimer);
  void router.push(routeWith({ q: toQuery(text) }));
}

// ---------------------------------------------------------------------------
// Reader Search (F-SOC-02, F-EXP-01)
// ---------------------------------------------------------------------------
const userQuery = computed(() => (typeof route.query.uq === 'string' ? route.query.uq.trim() : ''));
const userDraft = ref(userQuery.value);
const userResults = ref<UserSearchResult[]>([]);
const userSearching = ref(false);
const userSearchError = ref(false);
let latestUserSearch = 0;
let userInFlight: AbortController | undefined;
let userTypingTimer: ReturnType<typeof setTimeout> | undefined;

watch(userDraft, (text) => {
  clearTimeout(userTypingTimer);
  if (toQuery(text) === userQuery.value) return;
  userTypingTimer = setTimeout(
    () => void router.replace(routeWith({ uq: toQuery(text) })),
    TYPING_DELAY_MS,
  );
});

watch(
  userQuery,
  async (uq) => {
    if (toQuery(userDraft.value) !== uq) userDraft.value = uq;
    userInFlight?.abort();
    userSearchError.value = false;
    const id = ++latestUserSearch;
    if (!uq) {
      userResults.value = [];
      userSearching.value = false;
      return;
    }
    userSearching.value = true;
    const controller = (userInFlight = new AbortController());
    try {
      const found = await searchUsers(uq, controller.signal);
      if (id === latestUserSearch) userResults.value = found;
    } catch {
      if (id === latestUserSearch) {
        userResults.value = [];
        userSearchError.value = true;
      }
    } finally {
      if (id === latestUserSearch) userSearching.value = false;
    }
  },
  { immediate: true },
);

function searchUsersSubmit(text: string) {
  clearTimeout(userTypingTimer);
  void router.push(routeWith({ uq: toQuery(text) }));
}

// F-BOOK-02: a book no source knows is created by the reader and shelved as "Not started".
const adding = ref(false);
const saving = ref(false);
const addError = ref('');

watch(query, () => {
  adding.value = false;
  addError.value = '';
});

async function saveBook(payload: NewBookPayload) {
  saving.value = true;
  addError.value = '';
  try {
    const book = await addBook(payload);
    await addToLibrary(book.id);
    await router.push({ name: 'book-detail', params: { bookId: book.id } });
  } catch (e) {
    addError.value = (e as Error).message || "Couldn't add the book.";
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(() => {
  clearTimeout(typingTimer);
  clearTimeout(userTypingTimer);
  latestSearch++;
  latestUserSearch++;
  inFlight?.abort();
  userInFlight?.abort();
});
</script>

<template>
  <main class="page-column explore">
    <PageHeader
      eyebrow="Discover something good"
      title="Follow your curiosity."
      subtitle="Your next favorite book or fellow reader might be one search away."
    />

    <div class="search-bars">
      <div class="search-column">
        <ExploreSearchBar v-model="draft" @submit="search" />

        <BookSearchResults
          v-if="query"
          :query="query"
          :books="results"
          :loading="searching && results.length === 0"
          :error="searchError"
          @clear="search('')"
          @add="adding = true"
        />

        <AddBookForm
          v-if="query && adding"
          :initial-title="query"
          :saving="saving"
          :error="addError"
          @submit="saveBook"
          @cancel="adding = false"
        />
      </div>

      <div class="search-column">
        <UserSearchBar v-model="userDraft" @submit="searchUsersSubmit" />

        <UserSearchResults
          v-if="userQuery"
          :query="userQuery"
          :users="userResults"
          :loading="userSearching && userResults.length === 0"
          :error="userSearchError"
          @clear="searchUsersSubmit('')"
        />
      </div>
    </div>

    <section class="trending" aria-labelledby="trending-title">
      <h2 id="trending-title" class="trending-title">A good time to pick these up.</h2>
      <div class="page-tabs" role="group" aria-label="Book lists">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          :class="['page-tab', { active: activeTab === t.id }]"
          :aria-pressed="activeTab === t.id"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="loading" class="muted state">Loading…</p>
      <div v-else-if="loadError" class="state">
        <p class="muted">Couldn't load trending books.</p>
        <button type="button" class="button-outline button-small" @click="loadOverview">
          Try again
        </button>
      </div>
      <p v-else-if="cards.length === 0" class="muted state">{{ tab.emptyText }}</p>
      <p v-else-if="showingSuggestions" class="muted state suggestions-note">
        Nothing is trending this week yet, so here are a few books to start with.
      </p>
      <ul v-if="!loading && !loadError && cards.length > 0" class="cards">
        <li v-for="(card, index) in cards" :key="card.book.id">
          <TrendingBookCard
            :book="card.book"
            :metric="card.metric"
            :rank-label="index === 0 && !showingSuggestions ? tab.rankLabel : undefined"
          />
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.explore {
  /* The app shell is a flex column; without a width the centred column shrinks to its content */
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-8);
  padding-bottom: var(--space-8);
}

.search-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.search-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.trending-title {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-xl);
}

.state {
  margin-top: var(--space-6);
}

.suggestions-note + .cards {
  margin-top: var(--space-4);
}

.state p {
  margin: 0 0 var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 1099px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .cards {
    grid-template-columns: 1fr;
  }

  .trending-title {
    font-size: var(--font-size-lg);
  }
}
</style>
