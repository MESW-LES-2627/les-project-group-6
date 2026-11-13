<script setup lang="ts">
import { RouterLink } from 'vue-router';

import type { ApiProfileReview } from '@/services/api';

defineProps<{ reviews: ApiProfileReview[] }>();

const stars = [1, 2, 3, 4, 5];
</script>

<template>
  <section class="profile-reviews" aria-labelledby="profile-reviews-title">
    <h2 id="profile-reviews-title" class="title">Reviews</h2>
    <p v-if="reviews.length === 0" class="empty">No reviews yet.</p>
    <ul v-else class="list">
      <li v-for="review in reviews" :key="review.book.id" class="item">
        <img
          class="cover"
          :src="review.book.coverUrl || '/placeholder-cover.png'"
          :alt="`Cover of ${review.book.title}`"
        />
        <div class="body">
          <RouterLink
            class="book-title"
            :to="{ name: 'book-detail', params: { bookId: review.book.id } }"
          >
            {{ review.book.title }}
          </RouterLink>
          <span class="stars" :aria-label="`${review.rating} out of 5`">
            <span v-for="star in stars" :key="star" :class="{ empty: star > review.rating }"
              >★</span
            >
          </span>
          <p v-if="review.comment" class="comment">“{{ review.comment }}”</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.profile-reviews {
  padding: 32px 0;
}

.title {
  margin: 0 0 18px;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.list {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.cover {
  width: 44px;
  height: 66px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--color-surface-muted);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-title {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.book-title:hover {
  color: var(--color-primary);
}

.stars {
  color: var(--color-accent);
  font-size: 0.75rem;
}

.stars .empty {
  color: var(--color-track);
}

.comment {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
</style>
