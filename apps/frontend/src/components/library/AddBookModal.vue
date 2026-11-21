<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import AddBookForm from '@/components/explore/AddBookForm.vue';
import BookSearchResults from '@/components/explore/BookSearchResults.vue';
import AppModal from '@/components/layout/AppModal.vue';
import {
  addBook,
  addToLibrary,
  mapApiBookToLibraryBook,
  searchBooks,
  type NewBookPayload,
} from '@/services/api';
import type { LibraryBook } from '@/types/library';

// F-BOOK-02 + F-EXP-01: the library's Add book modal. It searches the catalogue the
// same way Explore does, adds a result to the shelf, or opens the manual form for a
// book no source knows.
const props = withDefaults(defineProps<{ ownedIds?: string[] }>(), { ownedIds: () => [] });
const emit = defineEmits<{ close: []; added: [] }>();

const MIN_QUERY_LENGTH = 2;
const TYPING_DELAY_MS = 300;

const draft = ref('');
const query = ref('');
const results = ref<LibraryBook[]>([]);
const searching = ref(false);
const searchError = ref(false);
let latestSearch = 0;
let inFlight: AbortController | undefined;
let typingTimer: ReturnType<typeof setTimeout> | undefined;

/** The query a text leads to: trimmed, or '' when too short to search. */
function toQuery(text: string): string {
  const trimmed = text.trim();
  return trimmed.length >= MIN_QUERY_LENGTH ? trimmed : '';
}

watch(draft, (text) => {
  clearTimeout(typingTimer);
  if (toQuery(text) === query.value) return;
  typingTimer = setTimeout(() => {
    query.value = toQuery(text);
  }, TYPING_DELAY_MS);
});

watch(
  query,
  async (q) => {
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

function submitSearch() {
  clearTimeout(typingTimer);
  query.value = toQuery(draft.value);
}

function clearSearch() {
  clearTimeout(typingTimer);
  draft.value = '';
  query.value = '';
}

// Adding a result that already exists in the catalogue only needs the library row.
const addingId = ref('');
const addError = ref('');

async function addExisting(book: LibraryBook) {
  if (addingId.value) return;
  addingId.value = book.id;
  addError.value = '';
  try {
    await addToLibrary(book.id);
    emit('added');
  } catch (e) {
    addError.value = (e as Error).message || "Couldn't add the book.";
  } finally {
    addingId.value = '';
  }
}

// A book no source knows is created and shelved as "Not started", as on Explore.
const manualOpen = ref(false);
const manualTitle = ref('');
const saving = ref(false);
const saveError = ref('');

function openManualForm() {
  manualTitle.value = query.value;
  manualOpen.value = true;
}

async function saveBook(payload: NewBookPayload) {
  saving.value = true;
  saveError.value = '';
  try {
    const book = await addBook(payload);
    await addToLibrary(book.id);
    emit('added');
  } catch (e) {
    saveError.value = (e as Error).message || "Couldn't add the book.";
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
  <AppModal labelled-by="add-book-modal-title" @close="emit('close')">
    <h2 id="add-book-modal-title" class="modal-title">Add a book</h2>
    <p class="muted intro">Search the catalogue, or add a book no source has yet.</p>

    <form class="search" role="search" @submit.prevent="submitSearch">
      <label for="library-add-book-search" class="search-label">Search books</label>
      <div class="search-row">
        <input
          id="library-add-book-search"
          v-model="draft"
          class="field-input"
          type="search"
          placeholder="Try “harry potter” or an ISBN"
          autocomplete="off"
        />
        <button type="submit" class="button button-medium">Search</button>
      </div>
    </form>

    <BookSearchResults
      v-if="query"
      mode="add"
      :query="query"
      :books="results"
      :loading="searching && results.length === 0"
      :error="searchError"
      :owned-ids="props.ownedIds"
      :busy-id="addingId"
      @clear="clearSearch"
      @add="openManualForm"
      @pick="addExisting"
    />

    <p v-if="addError" class="error" role="alert">{{ addError }}</p>

    <button
      v-if="!query && !manualOpen"
      type="button"
      class="link-button manual-link"
      @click="openManualForm"
    >
      Can't find it? Add it manually
    </button>

    <AddBookForm
      v-if="manualOpen"
      :initial-title="manualTitle"
      :saving="saving"
      :error="saveError"
      @submit="saveBook"
      @cancel="manualOpen = false"
    />
  </AppModal>
</template>

<style scoped>
.modal-title {
  margin: 0;
  padding-right: var(--space-8);
  font-family: var(--font-body);
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.intro {
  margin: var(--space-2) 0 var(--space-4);
  font-size: var(--font-size-sm);
}

.search {
  margin-bottom: var(--space-4);
}

.search-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.search-row {
  display: flex;
  gap: var(--space-2);
}

.search-row .field-input {
  flex: 1;
  min-width: 0;
}

.manual-link {
  margin-top: var(--space-4);
}

.error {
  margin: var(--space-2) 0 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

/* The modal frames these panels, so their own border is dropped. */
:deep(.results),
:deep(.add-book) {
  padding: 0;
  border: 0;
  background: transparent;
}

:deep(.add-book) {
  margin-top: var(--space-4);
}
</style>
