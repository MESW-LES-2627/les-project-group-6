<script setup lang="ts">
import { ref } from 'vue';
import type { NewBookPayload } from '@/services/api';

// F-BOOK-02: a reader adds a book that no source knows. Only the title is required;
// the cover is the default one that shows the title (no upload yet).
const props = defineProps<{ initialTitle?: string; saving: boolean; error?: string }>();
const emit = defineEmits<{ submit: [book: NewBookPayload]; cancel: [] }>();

const title = ref(props.initialTitle ?? '');
const author = ref('');
const pageCount = ref('');
const isbn13 = ref('');
const description = ref('');
const titleError = ref(false);
const pagesError = ref(false);

function submit() {
  const trimmedTitle = title.value.trim();
  const pagesText = pageCount.value.trim();
  const pages = pagesText ? Number(pagesText) : undefined;
  titleError.value = !trimmedTitle;
  pagesError.value = pages !== undefined && (!Number.isInteger(pages) || pages <= 0);
  if (titleError.value || pagesError.value) return;

  const book: NewBookPayload = { title: trimmedTitle };
  const authorName = author.value.trim();
  if (authorName) book.authors = [authorName];
  if (pages !== undefined) book.pageCount = pages;
  if (isbn13.value.trim()) book.isbn13 = isbn13.value.trim();
  if (description.value.trim()) book.description = description.value.trim();
  emit('submit', book);
}
</script>

<template>
  <section class="panel add-book" aria-labelledby="add-book-title">
    <h2 id="add-book-title" class="panel-heading">Add this book</h2>
    <p class="muted intro">
      Can't find it? Add it yourself and it goes straight to your library as "Not started".
    </p>

    <form class="fields" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="add-book-title-input">Title</label>
        <input
          id="add-book-title-input"
          v-model="title"
          class="field-input"
          type="text"
          maxlength="300"
          :aria-invalid="titleError"
          aria-describedby="add-book-title-error"
        />
        <p v-if="titleError" id="add-book-title-error" class="error" role="alert">
          Title is required
        </p>
      </div>

      <div class="field">
        <label for="add-book-author">Author · optional</label>
        <input id="add-book-author" v-model="author" class="field-input" type="text" />
      </div>

      <div class="row">
        <div class="field">
          <label for="add-book-pages">Pages · optional</label>
          <input
            id="add-book-pages"
            v-model="pageCount"
            class="field-input"
            type="text"
            inputmode="numeric"
            :aria-invalid="pagesError"
            aria-describedby="add-book-pages-error"
          />
          <p v-if="pagesError" id="add-book-pages-error" class="error" role="alert">
            Pages must be a whole number above 0
          </p>
        </div>
        <div class="field">
          <label for="add-book-isbn">ISBN-13 · optional</label>
          <input
            id="add-book-isbn"
            v-model="isbn13"
            class="field-input"
            type="text"
            inputmode="numeric"
          />
        </div>
      </div>

      <div class="field">
        <label for="add-book-description">Description · optional</label>
        <textarea
          id="add-book-description"
          v-model="description"
          class="field-input textarea"
          rows="3"
        />
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions">
        <button type="button" class="button-outline button-small" @click="emit('cancel')">
          Cancel
        </button>
        <button type="submit" class="button button-small" :disabled="saving">
          {{ saving ? 'Adding…' : 'Add to my library' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.intro {
  margin: var(--space-2) 0 var(--space-4);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.field label {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.row {
  display: flex;
  gap: var(--space-4);
}

.textarea {
  height: auto;
  padding: var(--space-2) var(--space-3);
  resize: vertical;
}

.error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (max-width: 599px) {
  .row {
    flex-direction: column;
  }
}
</style>
