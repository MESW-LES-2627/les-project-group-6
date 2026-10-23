<script setup lang="ts">
import type { Spine } from '@/types/profile';

defineProps<{ spines: Spine[] }>();

// Outlines drawn on the empty shelf, [width, height] in px
const placeholderSpines: [number, number][] = [
  [30, 170],
  [38, 190],
  [26, 156],
  [34, 182],
  [30, 164],
];
</script>

<template>
  <section class="shelf-section" aria-labelledby="shelf-title">
    <div class="heading">
      <h2 id="shelf-title" class="section-title">Shelf</h2>
      <span class="muted count">{{ spines.length }} finished</span>
    </div>

    <div
      v-if="spines.length > 0"
      class="scroller"
      tabindex="0"
      aria-label="Finished books, scrolls sideways"
    >
      <ul class="row">
        <li v-for="spine in spines" :key="spine.book.id">
          <a
            class="book-link spine"
            href="#"
            :aria-label="`${spine.book.title} by ${spine.book.author}`"
            :style="{
              width: `${spine.width}px`,
              height: `${spine.height}px`,
              background: spine.book.cover.background,
              color: spine.book.cover.ink,
            }"
          >
            <span class="rule" aria-hidden="true"></span>
            <span class="spine-title" aria-hidden="true">{{ spine.book.title }}</span>
            <span class="rule" aria-hidden="true"></span>
            <span class="book-tooltip align-start" aria-hidden="true">
              {{ spine.book.title }} · {{ spine.book.author }}
            </span>
          </a>
        </li>
      </ul>
    </div>

    <div v-else class="empty">
      <div class="row" aria-hidden="true">
        <div
          v-for="([width, height], i) in placeholderSpines"
          :key="i"
          class="placeholder"
          :style="{ width: `${width}px`, height: `${height}px` }"
        ></div>
      </div>
      <p class="muted empty-text">Finish a book to start your shelf</p>
    </div>
  </section>
</template>

<style scoped>
.shelf-section {
  padding: 36px 0 var(--space-10);
}

.heading {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
}

.count {
  font-size: var(--font-size-sm);
}

.scroller {
  /* Room above the spines for the lift and the tooltip */
  margin-top: -8px;
  padding: 52px 2px 0;
  overflow-x: auto;
  scrollbar-color: var(--color-accent) transparent;
  scrollbar-width: thin;
}

.row {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  width: max-content;
  margin: 0;
  padding: 0 var(--space-6) 0 0;
  border-bottom: 2px solid var(--color-accent);
  list-style: none;
}

.spine {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  padding: 9px 0 10px;
  border-radius: var(--radius-cover) var(--radius-cover) 0 0;
  box-shadow:
    inset 2px 0 0 rgb(255 255 255 / 10%),
    inset -2px 0 0 rgb(0 0 0 / 14%);
}

.spine:hover,
.spine:focus-visible {
  color: inherit;
}

.rule {
  flex: none;
  width: 62%;
  height: 1px;
  background: currentcolor;
  opacity: 0.45;
}

.spine-title {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-family: var(--font-heading);
  font-size: var(--font-size-xs);
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
  writing-mode: vertical-rl;
}

.empty {
  padding-top: 28px;
}

.empty .row {
  gap: var(--space-1);
}

.placeholder {
  border: 1px solid var(--color-accent);
  border-bottom: 0;
  border-radius: var(--radius-cover) var(--radius-cover) 0 0;
}

.empty-text {
  margin: 14px 0 0;
}
</style>
