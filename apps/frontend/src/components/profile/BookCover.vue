<script setup lang="ts">
import type { Book } from '@/types/profile';

// A generated cover, used until books have real cover images.
// Decorative: the surrounding link or list item carries the title for screen readers.
defineProps<{ book: Book }>();
</script>

<template>
  <div
    class="cover"
    aria-hidden="true"
    :style="{ background: book.cover.background, color: book.cover.ink }"
  >
    <div
      :class="['motif', `motif-${book.cover.motif}`]"
      :style="
        book.cover.motif === 'frame'
          ? { borderColor: book.cover.ink }
          : { background: book.cover.accent }
      "
    ></div>
    <div class="spine-shade"></div>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 2 / 3;
  container-type: inline-size;
  overflow: hidden;
  border-radius: 1px 3px 3px 1px;
  box-shadow: var(--shadow-cover);
}

.motif {
  position: absolute;
}

.motif-frame {
  inset: 7cqw 7cqw 7cqw 9cqw;
  border: 1px solid;
  opacity: 0.5;
}

.motif-band {
  top: 58%;
  right: 0;
  left: 0;
  height: 18%;
}

.motif-disc {
  top: -20cqw;
  right: -24cqw;
  width: 82cqw;
  height: 82cqw;
  border-radius: 50%;
}

.motif-block {
  right: 0;
  bottom: 0;
  left: 0;
  height: 36%;
}

.spine-shade {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 5cqw;
  background: linear-gradient(90deg, rgb(0 0 0 / 24%), rgb(0 0 0 / 0%));
}
</style>
