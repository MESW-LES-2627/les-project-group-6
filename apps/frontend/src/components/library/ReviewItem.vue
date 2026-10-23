<script setup lang="ts">
defineProps<{
  initials: string;
  name: string;
  rating: number;
  meta: string;
  quote: string;
}>();

const stars = [1, 2, 3, 4, 5];
</script>

<template>
  <article class="review">
    <div class="review-top">
      <span class="avatar" aria-hidden="true">{{ initials }}</span>
      <p class="who">
        <span class="name">{{ name }}</span>
        <span class="meta">
          <span class="stars" :aria-label="`${rating} out of 5`">
            <span v-for="star in stars" :key="star" :class="{ empty: star > rating }">★</span>
          </span>
          <span aria-hidden="true">•</span>
          {{ meta }}
        </span>
      </p>
    </div>
    <p class="quote">“{{ quote }}”</p>
  </article>
</template>

<style scoped>
.review {
  min-width: 0;
}

.review-top {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-avatar);
  color: var(--color-on-primary-strong);
  font-size: 0.625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
  line-height: 1;
}

.who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 1px 0 0;
}

.name {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.3;
}

.stars {
  display: inline-flex;
  gap: 1px;
  color: var(--color-accent);
  font-size: 0.625rem;
  letter-spacing: 0.01em;
}

.stars .empty {
  color: var(--color-track);
}

.quote {
  margin: 18px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

@media (max-width: 639px) {
  .review-top {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 11px;
  }

  .avatar {
    width: 28px;
    height: 28px;
  }
}
</style>
