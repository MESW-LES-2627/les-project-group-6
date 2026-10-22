<script setup lang="ts">
import { computed } from 'vue';

import type { ChapterProgress } from '@/types/profile';

const props = defineProps<{ chapter: ChapterProgress }>();

const xpLabel = computed(
  () =>
    `${props.chapter.xp.toLocaleString('en-GB')} of ${props.chapter.xpToNext.toLocaleString('en-GB')} XP to chapter ${props.chapter.nextNumber}`,
);
</script>

<template>
  <section class="chapter" aria-labelledby="chapter-title">
    <h2 id="chapter-title" class="title">Chapter {{ chapter.number }} · {{ chapter.title }}</h2>
    <p class="muted label">{{ xpLabel }}</p>
    <progress
      class="progress-bar"
      :max="chapter.xpToNext"
      :value="chapter.xp"
      :aria-label="xpLabel"
    ></progress>
    <p v-if="chapter.xp === 0" class="muted hint">Read for a few minutes to earn your first XP.</p>
  </section>
</template>

<style scoped>
.chapter {
  padding: 36px 0 34px;
}

.title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.label {
  margin: 10px 0;
  font-size: var(--text-md);
}

.hint {
  margin: 10px 0 0;
  font-size: var(--text-md);
}
</style>
