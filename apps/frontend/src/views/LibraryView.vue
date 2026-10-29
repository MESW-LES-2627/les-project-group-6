<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import LibraryBookCard from '@/components/library/LibraryBookCard.vue';
import LibrarySidebar from '@/components/library/LibrarySidebar.vue';
import { mockLibrary } from '@/mocks/library';
import { getUserLibrary, mapApiLibraryItemToBook } from '@/services/api';
import type { LibraryBook, LibrarySort, Shelf, ShelfId } from '@/types/library';
import { sortBooks } from '@/utils/library';

const rawBooks = ref<LibraryBook[]>(mockLibrary.books);
const isApiLoaded = ref(false);

const activeShelf = ref<ShelfId>('all');
const activeFolder = ref('autumn');
const activeTag = ref('');
const activeGenre = ref('all');
const search = ref('');
const sort = ref<LibrarySort>('recent');

async function fetchLibraryData() {
  try {
    const items = await getUserLibrary();
    if (items && items.length > 0) {
      rawBooks.value = items.map(mapApiLibraryItemToBook);
      isApiLoaded.value = true;
      activeFolder.value = '';
    }
  } catch {
    // Keep mock data on error or in testing
  }
}

onMounted(() => {
  void fetchLibraryData();
});

const genreOptions = computed(() => [...new Set(rawBooks.value.map((book) => book.genre))].sort());

const folderName = computed(
  () => mockLibrary.folders.find((folder) => folder.id === activeFolder.value)?.name,
);
const tagName = computed(() => mockLibrary.tags.find((tag) => tag.id === activeTag.value)?.name);

const shelves = computed<Shelf[]>(() => {
  if (!isApiLoaded.value) return mockLibrary.shelves;
  return [
    { id: 'all', label: 'All books', count: rawBooks.value.length },
    {
      id: 'not-started',
      label: 'Not started',
      count: rawBooks.value.filter((b) => b.status === 'not-started').length,
    },
    {
      id: 'in-progress',
      label: 'In progress',
      count: rawBooks.value.filter((b) => b.status === 'in-progress').length,
    },
    {
      id: 'finished',
      label: 'Finished',
      count: rawBooks.value.filter((b) => b.status === 'finished').length,
    },
    {
      id: 'did-not-finish',
      label: 'Did not finish',
      count: rawBooks.value.filter((b) => b.status === 'did-not-finish').length,
    },
  ];
});

const books = computed(() => {
  const term = search.value.trim().toLowerCase();
  const filtered = rawBooks.value.filter((book) => {
    if (activeShelf.value !== 'all' && book.status !== activeShelf.value) return false;
    if (activeFolder.value && !book.folderIds.includes(activeFolder.value)) return false;
    if (activeTag.value && !book.tagIds.includes(activeTag.value)) return false;
    if (activeGenre.value !== 'all' && book.genre !== activeGenre.value) return false;
    if (term && !`${book.title} ${book.author}`.toLowerCase().includes(term)) return false;
    return true;
  });

  return sortBooks(filtered, sort.value);
});

const totalCount = computed(() => (isApiLoaded.value ? rawBooks.value.length : mockLibrary.total));

const summary = computed(() => {
  const parts = [`Showing ${books.value.length} of ${totalCount.value} books`];
  if (folderName.value) parts.push(`${folderName.value} folder`);
  if (tagName.value) parts.push(`#${tagName.value}`);
  return parts.join(' • ');
});

function selectFolder(id: string) {
  activeFolder.value = activeFolder.value === id ? '' : id;
}

function selectTag(id: string) {
  activeTag.value = activeTag.value === id ? '' : id;
}

function showEverything() {
  activeShelf.value = 'all';
  activeFolder.value = '';
  activeTag.value = '';
  activeGenre.value = 'all';
  search.value = '';
  sort.value = 'recent';
}
</script>

<template>
  <main class="library">
    <div class="page-column">
      <section class="hero" aria-labelledby="library-title">
        <div class="hero-copy">
          <p class="eyebrow">Your personal library</p>
          <h1 id="library-title" class="hero-title">A life between the covers.</h1>
          <p class="subtitle">
            32 books, a few old favorites, and plenty of chapters still to come.
          </p>
        </div>
        <div class="hero-actions">
          <button type="button" class="button secondary">Import past reads</button>
          <button type="button" class="button">
            <span class="plus" aria-hidden="true">+</span> Add book
          </button>
        </div>
      </section>

      <div class="layout">
        <LibrarySidebar
          :shelves="shelves"
          :folders="mockLibrary.folders"
          :tags="mockLibrary.tags"
          :active-shelf="activeShelf"
          :active-folder="activeFolder || null"
          :active-tag="activeTag || null"
          @select-shelf="activeShelf = $event"
          @select-folder="selectFolder"
          @select-tag="selectTag"
        />

        <section class="results" aria-labelledby="books-title">
          <h2 id="books-title" class="sr-only">Books</h2>

          <div class="filters">
            <label class="field field--search">
              <span class="label">Search your library</span>
              <input v-model="search" type="search" placeholder="Title, author or ISBN..." />
            </label>

            <label class="field">
              <span class="label">Genre</span>
              <span class="select">
                <select v-model="activeGenre">
                  <option value="all">All genres</option>
                  <option v-for="genre in genreOptions" :key="genre" :value="genre">
                    {{ genre }}
                  </option>
                </select>
                <svg
                  class="chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </label>

            <label class="field">
              <span class="label">Tag</span>
              <span class="select">
                <select v-model="activeTag">
                  <option value="">All tags</option>
                  <option v-for="tag in mockLibrary.tags" :key="tag.id" :value="tag.id">
                    {{ tag.name }}
                  </option>
                </select>
                <svg
                  class="chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </label>

            <label class="field">
              <span class="label">Sort</span>
              <span class="select">
                <select v-model="sort">
                  <option value="recent">Recently updated</option>
                  <option value="title">Title A–Z</option>
                  <option value="author">Author A–Z</option>
                </select>
                <svg
                  class="chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </label>
          </div>

          <div class="tabs" role="group" aria-label="Filter by reading status">
            <button
              v-for="shelf in shelves"
              :key="shelf.id"
              type="button"
              :class="['tab', { active: activeShelf === shelf.id }]"
              :aria-pressed="activeShelf === shelf.id"
              @click="activeShelf = shelf.id"
            >
              {{ shelf.label }}
            </button>
          </div>

          <p class="summary">{{ summary }}</p>

          <div v-if="books.length > 0" class="grid">
            <LibraryBookCard v-for="book in books" :key="book.id" :book="book" />
          </div>
          <p v-else class="empty">
            No books match these filters.
            <button type="button" class="empty-link" @click="showEverything">Show all books</button>
          </p>

          <div class="results-footer">
            <p>One current status per book • Rereads are separate read-throughs</p>
            <button type="button" class="view-all" @click="showEverything">
              View all 32 books <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.library {
  padding: 24px 0 40px;
}

.hero {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  max-width: 74%;
  margin-bottom: 16px;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--color-copper);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.hero-title {
  margin: 0;
  font-size: clamp(var(--font-size-xl), 3vw, var(--font-size-2xl));
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.015em;
  line-height: 1.08;
  text-wrap: balance;
}

.subtitle {
  max-width: 32rem;
  margin: 6px 0 0;
  font-size: var(--font-size-base);
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  flex: none;
  gap: 14px;
  align-items: center;
  margin-top: 21px;
}

.secondary {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

.secondary:hover {
  border-color: var(--color-accent);
  background: var(--color-surface);
  color: var(--color-text);
}

.plus {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-normal);
  line-height: 1;
}

.layout {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  gap: 27px;
  align-items: start;
}

.results {
  min-width: 0;
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px 124px 164px;
  gap: 18px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.label {
  margin-bottom: 5px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.field input,
.field select {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.field input::placeholder {
  color: var(--color-text-muted);
}

.field input:focus,
.field select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.select {
  position: relative;
  display: block;
}

.select select {
  padding-right: 30px;
  appearance: none;
  cursor: pointer;
}

.chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  color: var(--color-text-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.tabs {
  display: flex;
  gap: 9px;
  margin-top: 17px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  flex: none;
  height: 31px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  white-space: nowrap;
  cursor: pointer;
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font-weight: var(--font-weight-semibold);
}

.summary {
  margin: 16px 0 17px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px 19px;
}

.empty {
  padding: 32px 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.empty-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
  cursor: pointer;
}

.results-footer {
  display: flex;
  gap: var(--space-4);
  align-items: baseline;
  justify-content: space-between;
  margin-top: 21px;
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
}

.results-footer p {
  margin: 0;
}

.view-all {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-copper);
  font: inherit;
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.view-all:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

@media (max-width: 1099px) {
  .hero {
    max-width: 100%;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .library {
    padding-top: 20px;
  }

  .hero {
    flex-direction: column;
    gap: var(--space-6);
    margin-bottom: 24px;
  }

  .hero-actions {
    margin-top: 0;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
  }

  .results {
    order: 1;
  }

  .shelves {
    order: 2;
  }

  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .field--search {
    grid-column: 1 / -1;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .hero-actions {
    flex-wrap: wrap;
  }

  .filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .results-footer {
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
  }
}
</style>
