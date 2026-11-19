<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import PagePlate from '@/components/layout/PagePlate.vue';
import LibraryBookCard from '@/components/library/LibraryBookCard.vue';
import LibrarySidebar from '@/components/library/LibrarySidebar.vue';
import {
  createLibraryFolder,
  deleteLibraryFolder,
  getLibraryFolders,
  getLibraryTags,
  getUserLibrary,
  mapApiLibraryItemToBook,
  renameLibraryFolder,
} from '@/services/api';
import type {
  FolderSummary,
  LibraryBook,
  LibrarySort,
  Shelf,
  ShelfId,
  TagSummary,
} from '@/types/library';
import { sortBooks } from '@/utils/library';

const rawBooks = ref<LibraryBook[]>([]);
const libraryError = ref<string | null>(null);

const folders = ref<FolderSummary[]>([]);
const folderError = ref<string | null>(null);

const tags = ref<TagSummary[]>([]);

const DUPLICATE_FOLDER = 'You already have a folder with this name';

const sortFolders = (list: FolderSummary[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name));

const activeShelf = ref<ShelfId>('all');
const activeFolder = ref('');
const activeTag = ref('');
const activeGenre = ref('all');
const search = ref('');
const sort = ref<LibrarySort>('recent');

// Everything comes from the API: the router only opens this page for a signed-in reader.
async function fetchLibraryData() {
  try {
    const items = await getUserLibrary();
    rawBooks.value = items.map(mapApiLibraryItemToBook);
    libraryError.value = null;
  } catch {
    rawBooks.value = [];
    libraryError.value = 'We could not load your library. Please refresh the page.';
  }
}

async function fetchFolders() {
  try {
    folders.value = sortFolders(await getLibraryFolders());
    folderError.value = null;
  } catch {
    folders.value = [];
    folderError.value = 'We could not load your folders. Please refresh the page.';
  }
}

async function fetchTags() {
  try {
    tags.value = await getLibraryTags();
  } catch {
    // The tag filter is optional; the books still load without it.
    tags.value = [];
  }
}

onMounted(() => {
  void fetchLibraryData();
  void fetchFolders();
  void fetchTags();
});

const hasFolderName = (name: string, exceptId?: string) =>
  folders.value.some(
    (folder) => folder.id !== exceptId && folder.name.toLowerCase() === name.toLowerCase(),
  );

async function createFolder(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  folderError.value = null;

  if (hasFolderName(trimmed)) {
    folderError.value = DUPLICATE_FOLDER;
    return;
  }

  try {
    const created = await createLibraryFolder(trimmed);
    folders.value = sortFolders([...folders.value, created]);
  } catch (error) {
    folderError.value = error instanceof Error ? error.message : 'Failed to create the folder';
  }
}

async function renameFolder(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  folderError.value = null;

  if (hasFolderName(trimmed, id)) {
    folderError.value = DUPLICATE_FOLDER;
    return;
  }

  try {
    await renameLibraryFolder(id, trimmed);
    folders.value = sortFolders(
      folders.value.map((folder) => (folder.id === id ? { ...folder, name: trimmed } : folder)),
    );
  } catch (error) {
    folderError.value = error instanceof Error ? error.message : 'Failed to rename the folder';
  }
}

async function deleteFolder(id: string) {
  folderError.value = null;
  try {
    await deleteLibraryFolder(id);
    folders.value = folders.value.filter((folder) => folder.id !== id);
    rawBooks.value = rawBooks.value.map((book) => ({
      ...book,
      folderIds: book.folderIds.filter((folderId) => folderId !== id),
    }));
    if (activeFolder.value === id) activeFolder.value = '';
  } catch (error) {
    folderError.value = error instanceof Error ? error.message : 'Failed to delete the folder';
  }
}

const genreOptions = computed(() =>
  [...new Set(rawBooks.value.flatMap((book) => (book.genre ? [book.genre] : [])))].sort(),
);

const folderName = computed(
  () => folders.value.find((folder) => folder.id === activeFolder.value)?.name,
);

const displayFolders = computed<FolderSummary[]>(() => {
  return folders.value.map((folder) => ({
    ...folder,
    count: rawBooks.value.filter((book) => book.folderIds.includes(folder.id)).length,
  }));
});

// Counts follow the loaded books so they match the grid; tags on no book are hidden.
const displayTags = computed<TagSummary[]>(() => {
  return tags.value
    .map((tag) => ({
      ...tag,
      count: rawBooks.value.filter((book) => book.tagIds.includes(tag.id)).length,
    }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const shelves = computed<Shelf[]>(() => {
  const count = (status: ShelfId) => rawBooks.value.filter((b) => b.status === status).length;
  return [
    { id: 'all', label: 'All books', count: rawBooks.value.length },
    { id: 'in-progress', label: 'In progress', count: count('in-progress') },
    { id: 'not-started', label: 'Not started', count: count('not-started') },
    { id: 'finished', label: 'Finished', count: count('finished') },
    { id: 'did-not-finish', label: 'Did not finish', count: count('did-not-finish') },
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

const totalCount = computed(() => rawBooks.value.length);

const shelfCount = (id: ShelfId) => shelves.value.find((s) => s.id === id)?.count ?? 0;

const plateLine = computed(
  () =>
    `${totalCount.value} books · ${shelfCount('in-progress')} reading now · ${shelfCount('finished')} finished`,
);

const heading = computed(
  () =>
    folderName.value ?? shelves.value.find((s) => s.id === activeShelf.value)?.label ?? 'All books',
);

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
    <PagePlate title="Library" title-id="library-title">
      <p>{{ plateLine }}</p>
      <template #actions>
        <button type="button" class="plate-button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add book
        </button>
        <button type="button" class="plate-link">
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
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Import past reads
        </button>
      </template>
    </PagePlate>

    <div class="page-column">
      <div class="toolbar">
        <div class="page-tabs" role="group" aria-label="Filter by reading status">
          <button
            v-for="shelf in shelves"
            :key="shelf.id"
            type="button"
            :class="['page-tab', { active: activeShelf === shelf.id }]"
            :aria-pressed="activeShelf === shelf.id"
            @click="activeShelf = shelf.id"
          >
            {{ shelf.label }}<span class="count">{{ shelf.count }}</span>
          </button>
        </div>

        <div class="controls">
          <label class="search">
            <span class="sr-only">Search your library</span>
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
              v-model="search"
              class="field-input"
              type="search"
              placeholder="Title, author or ISBN"
            />
          </label>
          <label v-if="genreOptions.length > 0" class="select">
            <span class="sr-only">Genre</span>
            <select v-model="activeGenre" class="field-input">
              <option value="all">All genres</option>
              <option v-for="genre in genreOptions" :key="genre" :value="genre">
                {{ genre }}
              </option>
            </select>
          </label>
          <label class="select">
            <span class="sr-only">Sort</span>
            <select v-model="sort" class="field-input">
              <option value="recent">Recently updated</option>
              <option value="title">Title A–Z</option>
              <option value="author">Author A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <div class="layout">
        <LibrarySidebar
          :folders="displayFolders"
          :tags="displayTags"
          :active-folder="activeFolder || null"
          :active-tag="activeTag || null"
          :error="folderError"
          @select-folder="selectFolder"
          @select-tag="selectTag"
          @create-folder="createFolder"
          @rename-folder="renameFolder"
          @delete-folder="deleteFolder"
        />

        <section class="results" aria-labelledby="books-title">
          <div class="section-heading">
            <h2 id="books-title" class="section-title">{{ heading }}</h2>
            <span class="section-meta summary">{{ books.length }} of {{ totalCount }} shown</span>
          </div>

          <p v-if="libraryError" class="empty library-error">{{ libraryError }}</p>

          <div v-if="books.length > 0" class="grid">
            <LibraryBookCard v-for="book in books" :key="book.id" :book="book" />
          </div>
          <p v-else class="empty">
            No books match these filters.
            <button type="button" class="link-button" @click="showEverything">
              Show all books
            </button>
          </p>

          <div class="results-footer">
            <button type="button" class="link-button view-all" @click="showEverything">
              View all {{ totalCount }} books
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.library {
  padding: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-8);
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.toolbar .page-tabs {
  min-width: 0;
  max-width: 100%;
  border-bottom: 0;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-bottom: var(--space-2);
}

.search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 11px;
  color: var(--color-text-muted);
}

.search .field-input {
  width: 240px;
  height: 38px;
  padding-left: 34px;
  font-size: var(--font-size-sm);
}

.select .field-input {
  height: 38px;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 56px;
}

.results {
  min-width: 0;
  padding: var(--space-8) 0 var(--space-12);
}

.results .section-heading {
  margin-bottom: 28px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 36px var(--space-6);
}

.empty {
  padding: var(--space-8) 0;
  color: var(--color-text-muted);
}

.results-footer {
  display: flex;
  justify-content: center;
  margin-top: var(--space-10);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.view-all {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: var(--control-height);
  font-size: var(--font-size-sm);
}

@media (max-width: 899px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .results {
    order: -1;
  }

  .controls,
  .search {
    width: 100%;
  }

  .search .field-input {
    width: 100%;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>
