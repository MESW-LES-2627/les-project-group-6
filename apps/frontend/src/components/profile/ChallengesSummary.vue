<script setup lang="ts">
defineProps<{ won: number }>();
</script>

<template>
  <section class="challenges" aria-label="Challenges">
    <p class="line">
      <template v-if="won > 0">{{ won }} {{ won === 1 ? 'challenge' : 'challenges' }} won</template>
      <template v-else>No challenges won yet</template>
    </p>
    <a href="#" class="text-link">See challenges</a>
  </section>
</template>

<style scoped>
.challenges {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-6) 0 36px;
}

.line {
  margin: 0;
}
</style>
