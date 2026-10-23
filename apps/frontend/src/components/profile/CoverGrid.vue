<script setup lang="ts">
import BookCover from './BookCover.vue';
import type { Book } from '@/types/profile';

withDefaults(
  defineProps<{
    books: Book[];
    title?: string;
    emptyText?: string;
  }>(),
  {
    title: 'Recently added',
    emptyText: 'Books you add to your library show up here.',
  },
);
</script>

<template>
  <section class="cover-grid" aria-labelledby="cover-grid-title">
    <div class="heading">
      <h2 id="cover-grid-title" class="section-title">{{ title }}</h2>
      <a href="#" class="text-link">View library</a>
    </div>

    <ul v-if="books.length > 0" class="grid">
      <li v-for="book in books" :key="book.id">
        <a class="book-link" href="#">
          <BookCover :book="book" />
          <span class="book-tooltip" aria-hidden="true">{{ book.title }} · {{ book.author }}</span>
          <span class="title">{{ book.title }}</span>
          <span class="muted author">{{ book.author }}</span>
        </a>
      </li>
    </ul>

    <p v-else class="muted empty">{{ emptyText }}</p>
  </section>
</template>

<style scoped>
.cover-grid {
  padding: 36px 0 44px;
}

.heading {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  column-gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.grid li {
  min-width: 0;
}

.title {
  display: block;
  margin-top: 10px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1.3;
}

.author {
  display: block;
  margin-top: 2px;
  font-size: var(--font-size-xs);
}

.empty {
  margin: 0;
}

@media (max-width: 899px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 28px;
  }
}
</style>
