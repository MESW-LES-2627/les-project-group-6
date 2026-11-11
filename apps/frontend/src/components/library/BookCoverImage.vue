<script setup lang="ts">
import { ref } from 'vue';

// A book cover image in a 2:3 frame. A missing or broken image shows the title instead.
defineProps<{ src?: string | null; title: string }>();

const failed = ref(false);
</script>

<template>
  <div class="cover">
    <img v-if="src && !failed" :src="src" :alt="`Cover of ${title}`" @error="failed = true" />
    <span v-else class="placeholder">{{ title }}</span>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 1px 3px 3px 1px;
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-cover);
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 10%;
  box-sizing: border-box;
  color: var(--color-text-muted);
  font-family: var(--font-heading);
  font-size: var(--font-size-xs);
  line-height: 1.3;
}
</style>
