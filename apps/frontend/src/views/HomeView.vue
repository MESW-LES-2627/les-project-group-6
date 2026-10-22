<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getHealth } from '../services/api';

const health = ref('Checking backend…');
const failed = ref(false);

onMounted(async () => {
  try {
    health.value = `Backend status: ${await getHealth()}`;
  } catch (error) {
    failed.value = true;
    health.value = `Backend unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
});
</script>

<template>
  <main>
    <h1>Home</h1>
    <p>Home placeholder</p>
    <p role="status" class="health-status" :class="{ 'health-status--error': failed }">
      {{ health }}
    </p>
  </main>
</template>

<style scoped>
.health-status {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
}

.health-status--error {
  color: var(--color-error);
}
</style>
