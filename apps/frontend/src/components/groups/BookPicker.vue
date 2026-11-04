<script setup lang="ts">
import { ref, watch } from 'vue';

import { addBook, authorOf, searchBooks, type ApiBook } from '@/services/api';

export interface PickedBook {
  id: string;
  title: string;
}

// Picks a book from the catalog by title. A missing book can be added with only
// its title (F-BOOK-02), so a club never waits for the catalog.
const props = withDefaults(
  defineProps<{
    inputId: string;
    label: string;
    placeholder?: string;
    /** Delay before searching, in ms */
    debounce?: number;
  }>(),
  { placeholder: 'Search book title…', debounce: 250 },
);

const model = defineModel<PickedBook | null>({ default: null });

const query = ref('');
const results = ref<ApiBook[]>([]);
const searched = ref('');
const busy = ref(false);
const error = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;

async function search(text: string) {
  try {
    results.value = (await searchBooks(text)).slice(0, 6);
    searched.value = text;
    error.value = '';
  } catch (e) {
    error.value = (e as Error).message;
  }
}

watch(query, (value) => {
  clearTimeout(timer);
  const text = value.trim();
  if (!text) {
    results.value = [];
    searched.value = '';
    return;
  }
  timer = setTimeout(() => void search(text), props.debounce);
});

function pick(book: ApiBook) {
  model.value = { id: book.id, title: book.title };
  query.value = '';
}

async function addTyped() {
  const title = query.value.trim();
  if (!title) return;
  busy.value = true;
  try {
    pick(await addBook(title));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function hasExact(): boolean {
  const title = searched.value.toLowerCase();
  return results.value.some((b) => b.title.toLowerCase() === title);
}
</script>

<template>
  <div class="picker">
    <label :for="inputId" class="picker-label">{{ label }}</label>
    <p v-if="model" class="picked">
      <span class="picked-title">{{ model.title }}</span>
      <button type="button" class="text-link change" @click="model = null">Change</button>
    </p>
    <template v-else>
      <input
        :id="inputId"
        v-model="query"
        type="search"
        autocomplete="off"
        :placeholder="placeholder"
      />
      <ul v-if="searched" class="results" :aria-label="`Books matching ${searched}`">
        <li v-for="book in results" :key="book.id">
          <button type="button" class="result" @click="pick(book)">
            <span class="result-title">{{ book.title }}</span>
            <span class="result-meta">
              {{
                [authorOf(book.id), book.pageCount ? `${book.pageCount} pages` : '']
                  .filter(Boolean)
                  .join(' · ')
              }}
            </span>
          </button>
        </li>
        <li v-if="!hasExact()">
          <button type="button" class="result add" :disabled="busy" @click="addTyped">
            Add “{{ searched }}” as a new book
          </button>
        </li>
      </ul>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
}

.picker-label {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

input {
  width: 100%;
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.results {
  margin: var(--space-2) 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  list-style: none;
}

.results li + li {
  border-top: 1px solid var(--color-border);
}

.result {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.result:hover {
  background: var(--color-surface-hover);
}

.result-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.result-meta {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.add {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.picked {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
}

.picked-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.change {
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}

.error {
  margin: var(--space-2) 0 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}
</style>
