<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { deleteReview, saveReview, type ApiReview } from '@/services/api';
import type { ReadingStatus } from '@/types/library';

const props = defineProps<{ bookId: string; status: ReadingStatus; review: ApiReview | null }>();
const emit = defineEmits<{ changed: [] }>();

const rating = ref(0);
const comment = ref('');
const busy = ref(false);
const error = ref('');
const stars = [1, 2, 3, 4, 5];

// F-LIB-02: In progress, Finished and Did not finish can be reviewed; Not started cannot.
const canReview = computed(() => props.status !== 'not-started');

watch(
  () => props.review,
  (review) => {
    rating.value = review?.rating ?? 0;
    comment.value = review?.comment ?? '';
  },
  { immediate: true },
);

async function run(action: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
    emit('changed');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong';
  } finally {
    busy.value = false;
  }
}

function save() {
  void run(() => saveReview(props.bookId, { rating: rating.value, comment: comment.value }));
}

function remove() {
  if (!window.confirm('Delete your rating and review?')) return;
  void run(() => deleteReview(props.bookId));
}
</script>

<template>
  <section class="thoughts-panel" aria-labelledby="thoughts-title">
    <h2 id="thoughts-title" class="panel-title">Your thoughts</h2>
    <p v-if="canReview" class="helper">
      You can review a book while <strong>In progress</strong>, <strong>Finished</strong>, or
      <strong>Did not finish</strong>.
    </p>
    <p v-else class="helper start-hint">Start reading this book to rate and review it.</p>

    <div class="stars" role="group" aria-label="Your rating">
      <button
        v-for="star in stars"
        :key="star"
        type="button"
        :class="['star', { empty: star > rating }]"
        :aria-label="`Rate ${star} out of 5`"
        :aria-pressed="rating === star"
        :disabled="!canReview || busy"
        @click="rating = star"
      >
        ★
      </button>
    </div>
    <p class="rating-copy">{{ rating > 0 ? `${rating} of 5` : 'Pick a rating' }}</p>

    <label class="field-label" for="thought-comment">Comment</label>
    <textarea
      id="thought-comment"
      v-model="comment"
      class="comment"
      rows="2"
      maxlength="2000"
      placeholder="What stayed with you?"
      :disabled="!canReview || busy"
    ></textarea>

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
        <p class="privacy-title">Follows your profile</p>
        <p class="privacy-copy">
          On a public profile everyone sees your review and it counts in the public average. On a
          private one only accepted friends see it.
        </p>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="actions">
      <button
        type="button"
        class="save-button"
        :disabled="!canReview || busy || rating === 0"
        @click="save"
      >
        {{ busy ? 'Saving…' : 'Save rating & comment' }}
      </button>
      <button v-if="review" type="button" class="delete-button" :disabled="busy" @click="remove">
        Delete review
      </button>
    </div>
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

.star:not(:disabled):hover {
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

.save-button:not(:disabled):hover {
  background: var(--color-primary-hover);
}

.star:disabled,
.comment:disabled,
.save-button:disabled,
.delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.start-hint {
  color: var(--color-primary);
}

.error {
  margin: 12px 0 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}

.actions .save-button {
  margin-top: 0;
}

.delete-button {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.delete-button:not(:disabled):hover {
  border-color: var(--color-primary);
}

@media (max-width: 639px) {
  .thoughts-panel {
    padding: 18px 16px;
  }
}
</style>
