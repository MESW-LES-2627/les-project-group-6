<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import AddBookForm from '@/components/explore/AddBookForm.vue';
import AppModal from '@/components/common/AppModal.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import {
  addBook,
  addToLibrary,
  mapApiBookToLibraryBook,
  searchBooks,
  type ApiBook,
  type NewBookPayload,
} from '@/services/api';
import type { LibraryBook } from '@/types/library';

// F-LIB-01 / F-BOOK-02: the Library's "Add book" opens this modal, where the
// reader searches the same catalog as Explore or adds a missing book by hand.
// A book is always added to the shelf as "Not started".
const props = defineProps<{
  /** The books already on the reader's shelf, so they cannot be added twice. */
  libraryIds: string[];
  /** Signed-out visitors use the prototype library and get a local book. */
  signedIn: boolean;
}>();
const emit = defineEmits<{ close: []; added: [book: LibraryBook] }>();

const MIN_QUERY_LENGTH = 2;
const TYPING_DELAY_MS = 300;

const query = ref('');
const results = ref<ApiBook[]>([]);
const searching = ref(false);
const searchError = ref(false);
const addedIds = ref<string[]>([]);
const addingId = ref<string | null>(null);
const addError = ref('');

const manualOpen = ref(false);
const saving = ref(false);
const manualError = ref('');

let typingTimer: ReturnType<typeof setTimeout> | undefined;
let latestSearch = 0;
let inFlight: AbortController | undefined;

const text = computed(() => query.value.trim());
const hasQuery = computed(() => text.value.length >= MIN_QUERY_LENGTH);
const shelfIds = computed(() => new Set([...props.libraryIds, ...addedIds.value]));

const inLibrary = (bookId: string) => shelfIds.value.has(bookId);
const authorOf = (book: ApiBook) => mapApiBookToLibraryBook(book).author;

function resetSearch() {
  clearTimeout(typingTimer);
  inFlight?.abort();
  latestSearch++;
  results.value = [];
  searching.value = false;
  searchError.value = false;
}

async function runSearch() {
  if (!hasQuery.value) return;
  clearTimeout(typingTimer);
  inFlight?.abort();

  const id = ++latestSearch;
  const controller = (inFlight = new AbortController());
  searching.value = true;
  searchError.value = false;
  addError.value = '';

  try {
    const found = await searchBooks(text.value, controller.signal);
    if (id === latestSearch) results.value = found;
  } catch {
    // A cancelled search is always an older one, so this guard drops it too.
    if (id === latestSearch) {
      results.value = [];
      searchError.value = true;
    }
  } finally {
    if (id === latestSearch) searching.value = false;
  }
}

watch(query, () => {
  clearTimeout(typingTimer);
  if (!hasQuery.value) {
    resetSearch();
    return;
  }
  typingTimer = setTimeout(() => void runSearch(), TYPING_DELAY_MS);
});

function searchNow() {
  if (!hasQuery.value) return;
  void runSearch();
}

async function addResult(book: ApiBook) {
  if (inLibrary(book.id) || addingId.value) return;
  addError.value = '';

  // The prototype library has no API behind it.
  if (!props.signedIn) {
    addedIds.value = [...addedIds.value, book.id];
    emit('added', mapApiBookToLibraryBook(book));
    return;
  }

  addingId.value = book.id;
  try {
    await addToLibrary(book.id);
    addedIds.value = [...addedIds.value, book.id];
    emit('added', mapApiBookToLibraryBook(book));
  } catch (error) {
    addError.value = (error as Error).message || "Couldn't add the book.";
  } finally {
    addingId.value = null;
  }
}

function openManual() {
  manualError.value = '';
  addError.value = '';
  manualOpen.value = true;
}

/** A book for the signed-out prototype, shaped like the mock library. */
function localBook(payload: NewBookPayload): LibraryBook {
  return {
    id: `local-${Date.now()}`,
    title: payload.title,
    author: payload.authors?.[0] ?? 'Unknown Author',
    cover: '',
    status: 'not-started',
    pages: payload.pageCount ?? 1,
    currentPage: 0,
    genre: 'General',
    summary: 'Ready when you are',
    folderIds: [],
    tagIds: [],
    chip: 'To read',
    updatedAt: new Date().toISOString(),
  };
}

async function saveManual(payload: NewBookPayload) {
  saving.value = true;
  manualError.value = '';
  try {
    if (!props.signedIn) {
      emit('added', localBook(payload));
      return;
    }
    const book = await addBook(payload);
    if (inLibrary(book.id)) {
      manualError.value = 'This book is already in your library.';
      return;
    }
    await addToLibrary(book.id);
    emit('added', mapApiBookToLibraryBook(book));
  } catch (error) {
    manualError.value = (error as Error).message || "Couldn't add the book.";
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(() => {
  clearTimeout(typingTimer);
  latestSearch++;
  inFlight?.abort();
});
</script>

<template>
  <AppModal labelledby="add-book-modal-title" @close="emit('close')">
    <template #header>
      <div>
        <p class="eyebrow">Grow your shelf</p>
        <h2 id="add-book-modal-title" class="modal-title">Add a book</h2>
      </div>
    </template>

    <form class="search-form" role="search" @submit.prevent="searchNow">
      <label for="add-book-search" class="search-label">Search books</label>
      <div class="search-row">
        <div class="search-field">
          <svg
            class="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="add-book-search"
            v-model="query"
            class="field-input"
            type="search"
            placeholder="Title, author or ISBN"
            autocomplete="off"
            data-autofocus
          />
        </div>
        <button type="submit" class="button">Search</button>
      </div>
      <p class="muted hint">Title, author or ISBN · at least 2 characters</p>
    </form>

    <section class="results" aria-label="Book search results" aria-live="polite">
      <p v-if="searchError" class="error state" role="alert">Search is unavailable right now.</p>
      <p v-else-if="searching && results.length === 0" class="muted state">Searching…</p>
      <p v-else-if="hasQuery && results.length === 0" class="muted state">
        No books match "{{ text }}".
      </p>
      <ul v-else-if="results.length > 0" class="result-list">
        <li v-for="book in results" :key="book.id" class="result">
          <div class="thumb">
            <BookCoverImage :src="book.coverUrl" :title="book.title" />
          </div>
          <div class="info">
            <p class="title">{{ book.title }}</p>
            <p class="muted author">{{ authorOf(book) }}</p>
          </div>
          <span v-if="inLibrary(book.id)" class="tag">In library</span>
          <button
            v-else
            type="button"
            class="button-outline button-small"
            :disabled="addingId !== null"
            :aria-label="`Add ${book.title} to my library`"
            @click="addResult(book)"
          >
            {{ addingId === book.id ? 'Adding…' : 'Add' }}
          </button>
        </li>
      </ul>
      <p v-else class="muted state">
        Search the catalogue for a book you want to read, or add a missing one below.
      </p>
    </section>

    <p v-if="addError" class="error" role="alert">{{ addError }}</p>

    <div class="manual">
      <p v-if="!manualOpen" class="muted manual-hint">
        Can't find it?
        <button type="button" class="link-button" @click="openManual">Add this book</button>
      </p>
      <AddBookForm
        v-else
        :initial-title="text"
        :saving="saving"
        :error="manualError"
        @submit="saveManual"
        @cancel="manualOpen = false"
      />
    </div>
  </AppModal>
</template>

<style scoped>
.modal-title {
  margin: 2px 0 0;
  font-size: var(--font-size-lg);
  line-height: 1.25;
}

.search-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.search-row {
  display: flex;
  gap: var(--space-3);
}

.search-field {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 11px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-field .field-input {
  padding-left: 34px;
}

.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-xs);
}

.state {
  margin: var(--space-4) 0 0;
}

.result-list {
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.result {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) 0;
}

.result + .result {
  border-top: 1px solid var(--color-border);
}

.thumb {
  flex: none;
  width: 44px;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.author {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
}

.error {
  margin: var(--space-4) 0 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.manual {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.manual-hint {
  margin: 0;
  font-size: var(--font-size-sm);
}

@media (max-width: 599px) {
  .search-row {
    flex-direction: column;
  }

  .search-row .button {
    justify-content: center;
  }
}
</style>
