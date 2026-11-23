<script setup lang="ts">
// A shimmering placeholder for content that is still loading. Pages announce the load
// once with `role="status"`; these blocks are hidden from screen readers.
withDefaults(
  defineProps<{
    /** CSS width, e.g. `12rem` or `60%`. */
    width?: string;
    /** CSS height. Use `100%` inside a sized box, such as a book cover. */
    height?: string;
    /** CSS border-radius; ignored when `circle` is set. */
    radius?: string;
    /** A round placeholder, for avatars. */
    circle?: boolean;
  }>(),
  { width: '100%', height: '1rem', radius: 'var(--radius-sm)', circle: false },
);
</script>

<template>
  <span
    class="skeleton"
    :style="{ width, height, borderRadius: circle ? '50%' : radius }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton {
  position: relative;
  display: block;
  flex: none;
  overflow: hidden;
  background: var(--color-surface-muted);
}

/* A separate highlight moves across the block: transforming it is smoother than
   animating a background position, which repaints the whole block every frame. */
.skeleton::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-surface-hover) 50%,
    transparent 100%
  );
  content: '';
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.6s var(--ease-out) infinite;
  pointer-events: none;
  will-change: transform;
}

@keyframes skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

/* The page still reads as busy; only the moving highlight is dropped. */
@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
</style>
