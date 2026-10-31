<script setup lang="ts">
import { computed } from 'vue';

import type { ReadingTimeStats } from '@/types/profile';

const props = defineProps<{ stats: ReadingTimeStats }>();

const importedNote = computed(
  () => `+${props.stats.importedHours} h imported from before you joined, these don't earn XP`,
);
</script>

<template>
  <section class="reading-time" aria-labelledby="reading-time-title">
    <h2 id="reading-time-title" class="section-title">Reading time</h2>
    <div class="row">
      <p class="total">
        <span class="number">{{ stats.countedMinutes }}</span>
        <span class="muted unit">{{ stats.countedMinutes === 1 ? 'minute' : 'minutes' }}</span>
      </p>
      <p v-if="stats.importedHours > 0" class="note">
        <svg
          width="34"
          height="20"
          viewBox="0 0 34 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M33 7c-8-4-19-3-29 7" />
          <path d="M3 8l1 6 6-1" />
        </svg>
        <span>{{ importedNote }}</span>
      </p>
    </div>
    <p v-if="stats.countedMinutes === 0" class="muted hint">
      Start a reading session and the minutes add up here.
    </p>
  </section>
</template>

<style scoped>
.reading-time {
  padding: var(--space-8) 0 34px;
}

.section-title {
  margin-bottom: 10px;
}

.row {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.total {
  display: flex;
  flex: none;
  gap: var(--space-2);
  align-items: baseline;
  margin: 0;
}

.number {
  font-size: var(--font-size-3xl);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}

.unit {
  font-size: var(--font-size-md);
}

.note {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  margin: 0 0 0 var(--space-1);
  color: var(--color-text-muted);
  font-family: var(--font-hand);
  font-size: var(--font-size-md);
  line-height: 1.1;
  transform: rotate(-2deg);
}

.note svg {
  flex: none;
}

.note span {
  max-width: 210px;
}

.hint {
  margin: 10px 0 0;
  font-size: var(--font-size-sm);
}

@media (max-width: 899px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }

  .note {
    margin-left: 0;
  }
}
</style>
