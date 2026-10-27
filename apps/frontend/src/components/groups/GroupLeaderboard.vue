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
      <div class="row">
        <span v-if="!withProgress" class="rank">{{ entry.rank }}</span>
        <MemberAvatar :initials="entry.member.initials" />
        <div class="who">
          <p class="name">
            {{ entry.member.name }}<template v-if="entry.member.id === meId"> · you</template>
          </p>
          <p class="note">
            <span v-if="entry.finished" aria-hidden="true">✓ </span>{{ entry.note }}
          </p>
        </div>
        <span class="score">{{ entry.score }}</span>
      </div>
      <progress
        v-if="withProgress"
        :class="['progress-bar', 'bar', { done: entry.finished }]"
        max="100"
        :value="entry.progress ?? 0"
        :aria-label="`${entry.member.name} progress: ${entry.progress ?? 0}%`"
      ></progress>
    </li>
  </ol>
</template>

<style scoped>
.board {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry {
  padding: var(--space-3) 0;
}

.board:not(.with-progress) .entry {
  border-top: 1px solid var(--color-border);
}

.row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.rank {
  width: 1rem;
  font-family: var(--font-heading);
}

.who {
  flex: 1;
  min-width: 0;
}

.name,
.note {
  margin: 0;
}

.name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.note {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.score {
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
}

.bar {
  margin-top: var(--space-2);
}

.bar.done {
  color: #4a6b4a;
}

.bar.done::-webkit-progress-value {
  background: #4a6b4a;
}

.bar.done::-moz-progress-bar {
  background: #4a6b4a;
}
</style>
