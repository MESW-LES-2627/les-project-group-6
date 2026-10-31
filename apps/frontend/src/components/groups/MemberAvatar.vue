<script setup lang="ts">
defineProps<{ initials: string; size?: 'sm' | 'md' }>();
</script>

<template>
  <span :class="['avatar', size ?? 'md']" aria-hidden="true">{{ initials }}</span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font-weight: 600;
}

.md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: var(--font-size-xs);
}

.sm {
  width: 1.75rem;
  height: 1.75rem;
  font-size: var(--font-size-2xs);
}
</style>
