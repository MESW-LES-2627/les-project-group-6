<script setup lang="ts">
import { RouterLink } from 'vue-router';

import type { ReadingClubSummary } from '@/types/library';

defineProps<{
  club: ReadingClubSummary;
  bookTitle: string;
}>();
</script>

<template>
  <section class="club-panel" aria-labelledby="club-title">
    <h2 id="club-title" class="panel-title">Reading together</h2>
    <p class="club-name">{{ club.name }} • {{ club.roundLabel }}</p>
    <p class="club-description">{{ bookTitle }} is this round's selected book.</p>
    <p class="club-meta">{{ club.memberCount }} members • Deadline {{ club.deadlineLabel }}</p>
    <RouterLink class="club-link" :to="{ name: 'group-detail', params: { groupId: club.groupId } }">
      Open book club <span aria-hidden="true">→</span>
    </RouterLink>
  </section>
</template>

<style scoped>
.club-panel {
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.panel-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.club-name {
  margin: 20px 0 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.35;
}

.club-description {
  margin: 16px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.club-meta {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.4;
}

.club-link {
  display: inline-block;
  margin-top: 17px;
  text-decoration: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-copper);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.club-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
