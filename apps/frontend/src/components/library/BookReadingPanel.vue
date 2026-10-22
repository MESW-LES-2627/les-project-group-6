<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import type { BookDetail, LibraryBook } from '@/types/library';
import { progressPercent, readingStatusLabels } from '@/utils/library';

const props = defineProps<{
  book: LibraryBook;
  detail: BookDetail;
  folders: string[];
  tags: string[];
}>();

const statusLabel = computed(() => readingStatusLabels[props.book.status]);
const percent = computed(() => progressPercent(props.book));
const folderLabel = computed(() => props.folders.join(' • ') || 'No folder yet');
const tagLabel = computed(() => props.tags.join(' • ') || 'No tags');
</script>

<template>
  <section class="reading-panel" aria-labelledby="reading-title">
    <h2 id="reading-title" class="panel-title">Your reading</h2>

    <div class="status-row">
      <span :class="['status-badge', `status-badge--${book.status}`]">
        {{ statusLabel.toUpperCase() }}
      </span>
      <span class="read-through">{{ detail.readThroughLabel }}</span>
    </div>

    <progress
      class="progress-bar detail-progress"
      :max="book.pages"
      :value="book.currentPage"
      :aria-label="`Progress in ${book.title}: ${percent}%`"
    ></progress>
    <p class="progress-label">
      Page {{ book.currentPage }} of {{ book.pages }} • {{ percent }}% complete
    </p>

    <div class="actions">
      <RouterLink
        class="start-session"
        :to="{ name: 'active-session', params: { bookId: book.id } }"
      >
        <svg width="11" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M2 1.4v9.2c0 .5.5.8.9.5l7-4.6a.6.6 0 0 0 0-1L2.9.9a.6.6 0 0 0-.9.5Z" />
        </svg>
        Start session
      </RouterLink>
      <button type="button" class="update-status">
        Update status <span aria-hidden="true">•</span>
      </button>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <p class="meta-label">Folders <span>• choose multiple</span></p>
        <div class="meta-value">{{ folderLabel }}</div>
      </div>
      <div class="meta-block">
        <p class="meta-label">Tags</p>
        <div class="meta-value">{{ tagLabel }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reading-panel {
  min-width: 0;
  padding: 19px 20px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.panel-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.status-row {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 11px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.055em;
  line-height: 1;
}

.status-badge--in-progress {
  background: var(--color-cream);
  color: var(--color-primary);
}

.status-badge--finished {
  background: var(--color-cream);
}

.read-through {
  color: var(--color-text-muted);
  font-size: 0.625rem;
}

.detail-progress {
  height: 4px;
  margin-top: 18px;
  border-radius: 2px;
}

.detail-progress::-webkit-progress-bar,
.detail-progress::-webkit-progress-value,
.detail-progress::-moz-progress-bar {
  border-radius: 2px;
}

.progress-label {
  margin: 17px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  margin-top: 16px;
}

.start-session {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 17px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--duration-fast);
}

.start-session:hover {
  background: var(--color-primary-hover);
}

.update-status {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.update-status:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.meta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 20px;
  margin-top: 16px;
}

.meta-block {
  min-width: 0;
}

.meta-label {
  margin: 0 0 10px;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.meta-label span {
  font-weight: var(--font-weight-normal);
}

.meta-value {
  display: flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 12px;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 639px) {
  .reading-panel {
    padding: 18px 16px;
  }

  .meta-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 13px;
  }

  .meta-value {
    white-space: normal;
  }
}
</style>
