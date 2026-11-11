<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { LibraryBook } from '@/types/library';
import { progressPercent } from '@/utils/library';

const props = defineProps<{ book: LibraryBook }>();

const percent = computed(() => progressPercent(props.book));
const route = computed(() => ({ name: 'book-detail', params: { bookId: props.book.id } }));

/** The short line under a book that is not in progress. */
const note = computed(() => {
  const { status, readCount, currentPage } = props.book;
  if (status === 'not-started') return 'Not started';
  if (status === 'did-not-finish') return `Stopped at p. ${currentPage}`;
  return readCount && readCount > 1 ? `Read ${readCount} times` : 'Finished';
});
</script>

<template>
  <article class="book">
    <RouterLink class="book-link" :to="route">
      <BookCoverImage :src="book.cover" :title="book.title" />
      <h3 class="title">{{ book.title }}</h3>
      <p class="author">{{ book.author }}</p>
    </RouterLink>

    <template v-if="book.status === 'in-progress'">
      <progress
        class="progress-bar progress"
        :max="book.pages"
        :value="book.currentPage"
        :aria-label="`Progress in ${book.title}: ${percent}%`"
      ></progress>
      <p class="note">p. {{ book.currentPage }} of {{ book.pages }} · {{ percent }}%</p>
    </template>
    <p v-else class="note">{{ note }}</p>
  </article>
</template>

<style scoped>
.book {
  min-width: 0;
}

.title {
  margin: var(--space-3) 0 0;
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1.3;
}

.author {
  margin: 2px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.progress {
  height: 4px;
  margin-top: 10px;
}

.note {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}
</style>
