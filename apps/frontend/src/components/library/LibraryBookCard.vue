<script setup lang="ts">
import { computed } from 'vue';

import type { LibraryBook } from '@/types/library';
import { progressPercent, readingStatusLabels } from '@/utils/library';

const props = defineProps<{ book: LibraryBook }>();

defineEmits<{ menu: [book: LibraryBook] }>();

const statusLabel = computed(() => readingStatusLabels[props.book.status]);
const percent = computed(() => progressPercent(props.book));
</script>

<template>
  <article class="card">
    <a
      class="cover-link"
      href="#"
      :aria-label="`Open ${book.title} by ${book.author}`"
      @click.prevent
    >
      <img class="cover" :src="book.cover" :alt="`Cover of ${book.title}`" loading="lazy" />
    </a>

    <div class="body">
      <h3 class="title">
        <a href="#" @click.prevent>{{ book.title }}</a>
      </h3>
      <p class="author">{{ book.author }}</p>

      <div class="meta">
        <span :class="['status', `status--${book.status}`]">{{ statusLabel }}</span>
        <span class="pages">{{ book.pages }} pages</span>
      </div>

      <progress
        class="progress-bar progress"
        :max="book.pages"
        :value="book.currentPage"
        :aria-label="`Progress in ${book.title}: ${percent}%`"
      ></progress>

      <p class="summary">{{ book.summary }}</p>

      <div class="footer">
        <span class="chip">{{ book.chip }}</span>
        <button
          type="button"
          class="menu-button"
          :aria-label="`More options for ${book.title}`"
          @click="$emit('menu', book)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.cover-link {
  display: block;
  padding: 17px 17px 0;
}

.cover {
  display: block;
  width: 100%;
  aspect-ratio: 304 / 215;
  border-radius: var(--radius-control);
  object-fit: cover;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 0 17px 15px;
}

.title {
  margin: var(--space-4) 0 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.title a {
  color: var(--color-text);
  text-decoration: none;
}

.title a:hover {
  color: var(--color-primary);
}

.author {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
}

.meta {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.status {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

.status--in-progress {
  background: var(--color-cream);
}

.pages {
  flex: none;
  color: var(--color-text-muted);
  font-size: 0.625rem;
}

.progress {
  height: 4px;
  margin-top: 12px;
  border-radius: 2px;
}

.summary {
  margin: 13px 0 0;
  font-size: var(--font-size-2xs);
  line-height: 1.4;
}

.footer {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 7px;
}

.chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 0.625rem;
  line-height: 1;
}

.menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.menu-button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

@media (max-width: 639px) {
  .cover-link {
    padding: 14px 14px 0;
  }

  .body {
    padding: 0 14px 14px;
  }
}
</style>
