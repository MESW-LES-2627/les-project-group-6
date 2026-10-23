<script setup lang="ts">
import { ref } from 'vue';

import type { BookDetail, ReviewAudience } from '@/types/library';

const props = defineProps<{ detail: BookDetail }>();

const rating = ref(props.detail.thoughts.rating);
const comment = ref(props.detail.thoughts.comment);
const audience = ref<ReviewAudience>(props.detail.thoughts.audience);
const stars = [1, 2, 3, 4, 5];

function setRating(value: number) {
  rating.value = value;
}

function toggleAudience() {
  audience.value = audience.value === 'friends' ? 'public' : 'friends';
}
</script>

<template>
  <section class="thoughts-panel" aria-labelledby="thoughts-title">
    <h2 id="thoughts-title" class="panel-title">Your thoughts</h2>
    <p class="helper">
      You can review a book while <strong>In progress</strong>, <strong>Finished</strong>, or
      <strong>Did not finish</strong>.
    </p>

    <div class="stars" role="group" aria-label="Your rating">
      <button
        v-for="star in stars"
        :key="star"
        type="button"
        :class="['star', { empty: star > rating }]"
        :aria-label="`Rate ${star} out of 5`"
        :aria-pressed="rating === star"
        @click="setRating(star)"
      >
        ★
      </button>
    </div>
    <p class="rating-copy">
      {{ rating }} of 5 <span aria-hidden="true">•</span> Change your rating
    </p>

    <label class="field-label" for="thought-comment">Comment</label>
    <textarea
      id="thought-comment"
      v-model="comment"
      class="comment"
      rows="2"
      placeholder="What stayed with you?"
    ></textarea>

    <p class="field-label">Review audience</p>
    <button type="button" class="audience" @click="toggleAudience">
      {{ audience === 'friends' ? 'Friends only' : 'Public' }}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div class="privacy-note">
      <svg
        class="lock"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <div>
        <p class="privacy-title">Not part of the public average</p>
        <p class="privacy-copy">
          Your private review is visible to accepted friends, not strangers.
        </p>
      </div>
    </div>

    <button type="button" class="save-button">Save rating &amp; comment</button>
  </section>
</template>

<style scoped>
.thoughts-panel {
  min-width: 0;
  padding: 19px 20px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.panel-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.helper {
  margin: 13px 0 0;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.45;
}

.helper strong {
  font-weight: var(--font-weight-semibold);
}

.stars {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 31px;
}

.star {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.star.empty {
  color: var(--color-track);
}

.star:hover {
  color: var(--color-copper);
}

.rating-copy {
  margin: 25px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.field-label {
  display: block;
  margin: 14px 0 7px;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.comment {
  display: block;
  width: 100%;
  min-height: 58px;
  padding: 10px 12px;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.comment:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.audience {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  text-align: left;
  cursor: pointer;
}

.audience:hover {
  border-color: var(--color-accent);
}

.privacy-note {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 11px;
  margin-top: 20px;
  padding: 14px 14px 13px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
}

.lock {
  margin-top: 2px;
  color: var(--color-primary);
}

.privacy-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
}

.privacy-copy {
  margin: 7px 0 0;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.45;
}

.save-button {
  min-height: 38px;
  margin-top: 16px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background-color var(--duration-fast);
}

.save-button:hover {
  background: var(--color-primary-hover);
}

@media (max-width: 639px) {
  .thoughts-panel {
    padding: 18px 16px;
  }
}
</style>
