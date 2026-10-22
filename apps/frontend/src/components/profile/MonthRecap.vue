<script setup lang="ts">
import { computed } from 'vue';

import BookCover from './BookCover.vue';
import type { MonthRecap } from '@/types/profile';
import { formatMonth } from '@/utils/date';

const props = defineProps<{ recap: MonthRecap | null }>();

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

const summary = computed(() => {
  if (!props.recap) return '';
  const { books, hours, challengesWon } = props.recap;
  const parts = [plural(books.length, 'book'), plural(hours, 'hour')];
  if (challengesWon > 0) parts.push(`${plural(challengesWon, 'group challenge')} won`);
  return parts.join(', ');
});
</script>

<template>
  <section class="recap" aria-labelledby="recap-title">
    <template v-if="recap">
      <div class="covers" aria-hidden="true">
        <div v-for="book in recap.books.slice(0, 3)" :key="book.id" class="cover">
          <BookCover :book="book" />
        </div>
      </div>
      <div class="text">
        <h2 id="recap-title" class="title">{{ formatMonth(recap.month) }} recap</h2>
        <p class="muted line">{{ summary }}</p>
      </div>
      <a href="#" class="text-link open">
        Open recap
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
      </a>
    </template>

    <div v-else class="text">
      <h2 id="recap-title" class="title">Monthly recap</h2>
      <p class="muted line">Your first recap arrives at the end of the month.</p>
    </div>
  </section>
</template>

<style scoped>
.recap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: center;
  padding: var(--space-6) 0;
}

.covers {
  display: flex;
  flex: none;
}

.cover {
  width: 40px;
}

.cover + .cover {
  margin-left: -10px;
}

.text {
  flex: 1;
  min-width: 200px;
}

.title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
}

.line {
  margin: 2px 0 0;
}

.open {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: var(--control-height);
  font-size: var(--font-size-base);
}
</style>
