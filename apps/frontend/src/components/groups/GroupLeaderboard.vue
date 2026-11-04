<script setup lang="ts">
import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import type { LeaderboardEntry } from '@/types/groups';

defineProps<{
  entries: LeaderboardEntry[];
  /** Club layout: no rank column, a progress bar under each reader */
  withProgress?: boolean;
  meId: string;
}>();
</script>

<template>
  <ol :class="['board', { 'with-progress': withProgress }]">
    <li v-for="entry in entries" :key="entry.member.id" class="entry">
      <span v-if="!withProgress" class="rank">{{ entry.rank }}</span>
      <MemberAvatar :initials="entry.member.initials" :class="{ me: entry.member.id === meId }" />
      <div class="who">
        <div class="line">
          <span :class="['name', { mine: entry.member.id === meId }]">
            {{ entry.member.name }}<template v-if="entry.member.id === meId"> · you</template>
          </span>
          <span class="score">{{ entry.score }}</span>
        </div>
        <ul
          v-if="entry.books?.length"
          class="books"
          :aria-label="`Books read by ${entry.member.name}`"
        >
          <li v-for="book in entry.books" :key="book.title">
            <span class="book-title">{{ book.title }}</span>
            <span class="book-score">{{ book.score }}</span>
          </li>
        </ul>
        <div v-if="withProgress" class="bar-row">
          <progress
            :class="['progress-bar', 'bar', { done: entry.finished }]"
            max="100"
            :value="entry.progress ?? 0"
            :aria-label="`${entry.member.name} progress: ${entry.progress ?? 0}%`"
          ></progress>
          <span class="state">{{ entry.finished ? 'Finished' : `${entry.progress ?? 0}%` }}</span>
        </div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.with-progress .entry {
  align-items: center;
}

.rank {
  flex: none;
  width: 20px;
  padding-top: 9px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.me {
  background: var(--color-avatar);
}

.who {
  flex: 1;
  min-width: 0;
  padding-top: 8px;
}

.with-progress .who {
  padding-top: 0;
}

.line {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
}

.name.mine {
  font-weight: 600;
}

.score {
  flex: none;
  font-size: var(--font-size-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.books {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-3);
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.book-title {
  font-family: var(--font-heading);
  font-style: italic;
}

.book-score::before {
  content: ' · ';
}

.bar-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-top: 6px;
}

.bar {
  flex: 1;
}

.bar:not(.done) {
  color: var(--color-copper);
}

.bar:not(.done)::-webkit-progress-value {
  background: var(--color-copper);
}

.bar:not(.done)::-moz-progress-bar {
  background: var(--color-copper);
}

.state {
  flex: none;
  width: 4rem;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-align: right;
}
</style>
