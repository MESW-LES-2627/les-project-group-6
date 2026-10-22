<script setup lang="ts">
import BookCover from './BookCover.vue';
import type { ReadingProgress } from '@/types/profile';

defineProps<{ items: ReadingProgress[] }>();

function percent({ page, pages }: ReadingProgress): number {
  return pages > 0 ? Math.round((page / pages) * 100) : 0;
}
</script>

<template>
  <section class="reading" aria-labelledby="currently-reading-title">
    <h2 id="currently-reading-title" class="section-title">Currently reading</h2>

    <div v-if="items.length > 0" class="grid">
      <article v-for="item in items" :key="item.book.id" class="item">
        <a class="book-link cover" href="#">
          <BookCover :book="item.book" />
          <span class="book-tooltip">{{ item.book.title }} · {{ item.book.author }}</span>
          <span class="sr-only">{{ item.book.title }}</span>
        </a>
        <div class="body">
          <h3 class="title">{{ item.book.title }}</h3>
          <p class="muted author">{{ item.book.author }}</p>
          <div class="progress">
            <div class="progress-label">
              <span>p. {{ item.page }} of {{ item.pages }}</span>
              <span class="muted">{{ percent(item) }}%</span>
            </div>
            <progress
              class="progress-bar"
              :max="item.pages"
              :value="item.page"
              :aria-label="`Progress in ${item.book.title}: page ${item.page} of ${item.pages}`"
            ></progress>
            <a href="#" class="button continue">
              Continue<span class="sr-only"> {{ item.book.title }}</span>
              <svg
                width="16"
                height="16"
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
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty">
      <div class="empty-cover" aria-hidden="true"></div>
      <div>
        <p class="empty-text">Pick a book from your library</p>
        <a href="#" class="button">Open library</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reading {
  padding-top: var(--space-10);
  padding-bottom: 44px;
}

.section-title {
  margin-bottom: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--space-14);
}

.item {
  display: flex;
  gap: var(--space-6);
  align-items: stretch;
}

.cover {
  flex: none;
  width: 128px;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-1) 0;
}

.title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.author {
  margin: var(--space-1) 0 0;
}

.progress {
  margin-top: auto;
  padding-top: 18px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  font-size: var(--text-md);
}

.continue {
  margin-top: 18px;
}

.empty {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: center;
}

.empty-cover {
  width: 96px;
  height: 144px;
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-cover);
}

.empty-text {
  margin: 0 0 14px;
  font-size: var(--text-lg);
}

@media (max-width: 899px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--space-8);
  }

  .cover {
    width: 96px;
  }
}
</style>
