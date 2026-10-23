<script setup lang="ts">
import BookCover from './BookCover.vue';
import type { Folder } from '@/types/profile';

defineProps<{ folders: Folder[] }>();
defineEmits<{ create: [] }>();

// Fanned cover positions, back to front
const fan = [
  { left: 0, top: 10, rotate: -4 },
  { left: 32, top: 6, rotate: 1 },
  { left: 64, top: 4, rotate: 4 },
];

/** The preview covers in drawing order: the first book is drawn last, on top. */
function stacked(folder: Folder) {
  return folder.previewBooks
    .slice(0, fan.length)
    .reverse()
    .map((book, i) => ({ book, position: fan[i] ?? fan[0] }));
}
</script>

<template>
  <section class="folders" aria-labelledby="folders-title">
    <h2 id="folders-title" class="section-title">Folders</h2>
    <ul class="grid">
      <li v-for="folder in folders" :key="folder.id">
        <a class="book-link" href="#">
          <div class="fan" aria-hidden="true">
            <div
              v-for="{ book, position } in stacked(folder)"
              :key="book.id"
              class="fan-cover"
              :style="{
                left: `${position?.left}px`,
                top: `${position?.top}px`,
                transform: `rotate(${position?.rotate}deg)`,
              }"
            >
              <BookCover :book="book" />
            </div>
          </div>
          <span class="name">{{ folder.name }}</span>
          <span class="muted count">
            {{ folder.bookCount }} {{ folder.bookCount === 1 ? 'book' : 'books' }}
          </span>
        </a>
      </li>
      <li>
        <button type="button" class="new-folder" @click="$emit('create')">
          <span class="new-folder-box" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span class="name">New folder</span>
        </button>
      </li>
    </ul>
    <p v-if="folders.length === 0" class="muted empty">
      Group books your way, like "To read next" or "Book club".
    </p>
  </section>
</template>

<style scoped>
.folders {
  padding: 36px 0 44px;
}

.section-title {
  margin-bottom: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  column-gap: var(--space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.fan {
  position: relative;
  width: 132px;
  height: 104px;
}

.fan-cover {
  position: absolute;
  width: 62px;
}

.name {
  display: block;
  margin-top: var(--space-3);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.count {
  display: block;
  font-size: var(--font-size-xs);
}

.new-folder {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.new-folder-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 98px;
  margin-top: var(--space-1);
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-cover);
  color: var(--color-text-muted);
  transition:
    border-color var(--duration-fast),
    color var(--duration-fast);
}

.new-folder:hover .new-folder-box {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.new-folder .name {
  margin-top: 14px;
}

.empty {
  margin: 18px 0 0;
}

@media (max-width: 899px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 28px;
  }
}
</style>
