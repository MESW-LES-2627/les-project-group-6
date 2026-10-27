<script setup lang="ts">
defineProps<{ title: string; icon?: 'info' | 'lock' | 'flag' }>();
</script>

<template>
  <aside class="note">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="icon === 'lock'">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </template>
      <template v-else-if="icon === 'flag'">
        <path d="M5 21V4h11l-1.5 4L16 12H5" />
      </template>
      <template v-else>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </template>
    </svg>
    <div>
      <p class="title">{{ title }}</p>
      <p class="body"><slot /></p>
    </div>
  </aside>
</template>

<style scoped>
.note {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-copper);
}

.title,
.body {
  margin: 0;
}

.title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.body {
  margin-top: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}
</style>
