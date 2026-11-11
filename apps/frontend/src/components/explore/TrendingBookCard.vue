<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { LibraryBook } from '@/types/library';

// One book of an Explore list (F-EXP-04). The reader adds it from the book page.
defineProps<{ book: LibraryBook; metric: string; rankLabel?: string }>();
</script>

<template>
  <article class="panel card">
    <div class="cover"><BookCoverImage :src="book.detailCover" :title="book.title" /></div>
    <div class="body">
      <span v-if="rankLabel" class="tag tag-highlight">{{ rankLabel }}</span>
      <h3 class="title">{{ book.title }}</h3>
      <p class="muted author">{{ book.author }}</p>
      <p class="metric">{{ metric }}</p>
      <RouterLink
        class="button-outline button-small"
        :to="{ name: 'book-detail', params: { bookId: book.id } }"
        :aria-label="`View ${book.title}`"
      >
        View book
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  gap: var(--space-4);
  height: 100%;
  padding: var(--space-4);
  box-sizing: border-box;
}

.cover {
  flex: none;
  width: 96px;
}

.body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-width: 0;
}

.title {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-lg);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.author {
  margin: 0;
  font-size: var(--font-size-sm);
}

.metric {
  margin: 0 0 var(--space-2);
  color: var(--color-copper);
  font-size: var(--font-size-sm);
}
</style>
