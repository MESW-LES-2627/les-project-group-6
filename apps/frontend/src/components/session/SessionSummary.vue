<script setup lang="ts">
import { computed } from 'vue';

import BookCoverImage from '@/components/library/BookCoverImage.vue';
import { formatDuration } from '@/utils/session';

// F-READ-01 (#49): what a finished session added up to. The server measured the time.
const props = defineProps<{
  title: string;
  cover: string | null | undefined;
  durationSeconds: number;
  countedMinutes: number;
}>();
defineEmits<{ done: [] }>();

const duration = computed(() => formatDuration(props.durationSeconds));
const counted = computed(() =>
  props.countedMinutes === 1 ? '1 minute' : `${props.countedMinutes} minutes`,
);
</script>

<template>
  <section class="session-summary" aria-labelledby="summary-title">
    <div class="summary-cover">
      <BookCoverImage :src="cover ?? null" :title="title" />
    </div>
    <div class="summary-copy">
      <p class="eyebrow">Session saved</p>
      <h1 id="summary-title" class="summary-title">{{ title }}</h1>
      <dl class="summary-stats">
        <div>
          <dt>Duration</dt>
          <dd class="summary-duration">{{ duration }}</dd>
        </div>
        <div>
          <dt>Counted</dt>
          <dd class="summary-counted">{{ counted }}</dd>
        </div>
      </dl>
      <p v-if="countedMinutes === 0" class="summary-note" role="status">
        This session was under a minute, so it counted 0 minutes towards your streak and groups.
      </p>
      <button type="button" class="button summary-done" @click="$emit('done')">Done</button>
    </div>
  </section>
</template>

<style scoped>
.session-summary {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
  max-width: 640px;
  margin: var(--space-10) auto;
  padding: 35px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.summary-cover {
  flex: none;
  width: 120px;
}

.summary-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-sm);
}

.summary-title {
  margin: 0;
  font-size: var(--font-size-2xl);
}

.summary-stats {
  display: flex;
  gap: var(--space-8);
  margin: 0;
}

.summary-stats dt {
  font-size: var(--font-size-xs);
}

.summary-stats dd {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.summary-note {
  margin: 0;
  font-size: var(--font-size-sm);
}

@media (width <= 560px) {
  .session-summary {
    flex-direction: column;
    padding: var(--space-6);
  }
}
</style>
