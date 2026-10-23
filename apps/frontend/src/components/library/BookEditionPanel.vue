<script setup lang="ts">
import type { BookEdition, LibraryBook } from '@/types/library';

defineProps<{
  book: LibraryBook;
  edition: BookEdition;
}>();
</script>

<template>
  <aside class="book-column" aria-label="Book and edition">
    <img class="cover" :src="book.detailCover ?? book.cover" :alt="`Cover of ${book.title}`" />

    <section class="edition-panel">
      <h2 class="edition-title">Your edition</h2>
      <dl class="edition-list">
        <div>
          <dt class="sr-only">Published</dt>
          <dd>Published {{ edition.publishedYear }}</dd>
        </div>
        <div>
          <dt class="sr-only">Pages and publisher</dt>
          <dd>{{ book.pages }} pages - {{ edition.publisher }}</dd>
        </div>
        <div>
          <dt class="sr-only">ISBN</dt>
          <dd>ISBN {{ edition.isbn }}</dd>
        </div>
      </dl>
      <ul class="genres" aria-label="Genres">
        <li v-for="genre in edition.genres" :key="genre">{{ genre }}</li>
      </ul>
    </section>

    <button type="button" class="correction">Suggest a correction</button>
  </aside>
</template>

<style scoped>
.book-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cover {
  display: block;
  width: min(214px, 100%);
  aspect-ratio: 238 / 348;
  border-radius: var(--radius-control);
  object-fit: cover;
}

.edition-panel {
  width: 100%;
  margin-top: 20px;
  padding: 18px 20px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.edition-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  line-height: 1.25;
}

.edition-list {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.edition-list div + div {
  margin-top: 13px;
}

.edition-list dd {
  margin: 0;
}

.genres {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.genres li {
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--font-size-2xs);
  line-height: 1.2;
}

.correction {
  align-self: flex-start;
  margin-top: 22px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.correction:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

@media (max-width: 899px) {
  .book-column {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  .cover {
    width: 100%;
  }

  .edition-panel {
    margin-top: 0;
  }

  .correction {
    grid-column: 2;
    margin-top: 0;
    justify-self: start;
  }
}

@media (max-width: 639px) {
  .book-column {
    grid-template-columns: minmax(0, 1fr);
  }

  .cover {
    max-width: 200px;
  }

  .correction {
    grid-column: auto;
  }
}
</style>
