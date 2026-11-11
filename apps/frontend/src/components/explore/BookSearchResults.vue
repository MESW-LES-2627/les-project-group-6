<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { LibraryBook } from '@/types/library';

// The books found by the Explore search (F-EXP-01); each one opens its book page.
const props = defineProps<{
  query: string;
  books: LibraryBook[];
  loading: boolean;
  error: boolean;
}>();
const emit = defineEmits<{ clear: [] }>();

const countLabel = computed(() =>
  props.books.length === 1 ? '1 result' : `${props.books.length} results`,
);
</script>

<template>
  <section class="panel results" aria-labelledby="results-title">
    <div class="section-heading">
      <h2 id="results-title" class="panel-heading">Books</h2>
      <p class="section-meta">
        <template v-if="!loading && !error">{{ countLabel }} · </template>
        <button type="button" class="link-button" @click="emit('clear')">Clear</button>
      </p>
    </div>

    <p v-if="loading" class="muted state">Searching…</p>
    <p v-else-if="error" class="muted state">Search is unavailable right now.</p>
    <p v-else-if="books.length === 0" class="muted state">No books match "{{ query }}".</p>
    <ul v-else class="rows">
      <li v-for="book in books" :key="book.id" class="row">
        <div class="thumb"><BookCoverImage :src="book.detailCover" :title="book.title" /></div>
        <div class="info">
          <p class="title">{{ book.title }}</p>
          <p class="muted author">{{ book.author }}</p>
        </div>
        <RouterLink
          class="button-outline button-small"
          :to="{ name: 'book-detail', params: { bookId: book.id } }"
          :aria-label="`View ${book.title}`"
        >
          View
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.section-meta {
  margin: 0;
}

.state {
  margin: var(--space-4) 0 0;
}

.rows {
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) 0;
}

.row + .row {
  border-top: 1px solid var(--color-border);
}

.thumb {
  flex: none;
  width: 48px;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-weight: 600;
}

.author {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
}
</style>
