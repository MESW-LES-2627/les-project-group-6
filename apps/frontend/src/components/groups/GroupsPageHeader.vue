<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <header class="page-header">
    <div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="action"><slot name="action" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: var(--space-6);
}

h1 {
  margin: var(--space-1) 0 var(--space-2);
  font-size: var(--font-size-2xl);
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.action {
  flex-shrink: 0;
  padding-top: var(--space-2);
}

@media (max-width: 599px) {
  .page-header {
    flex-direction: column;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--font-size-xl);
  }
}
</style>
