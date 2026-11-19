<script setup lang="ts">
// The big search field of the Explore page (F-EXP-01): title, author or ISBN.
const query = defineModel<string>({ default: '' });
const emit = defineEmits<{ submit: [query: string] }>();
</script>

<template>
  <form class="panel search-panel" role="search" @submit.prevent="emit('submit', query.trim())">
    <label for="explore-search" class="label">Search books</label>
    <div class="row">
      <input
        id="explore-search"
        v-model="query"
        class="field-input"
        type="search"
        placeholder="Try “harry potter” or an ISBN"
        autocomplete="off"
      />
      <button type="submit" class="button">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Search
      </button>
    </div>
    <p class="muted hint">Title, author or ISBN</p>
  </form>
</template>

<style scoped>
.label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.row {
  display: flex;
  gap: var(--space-3);
}

.row .field-input {
  flex: 1;
  min-width: 0;
}

.button {
  flex: none;
}

.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-xs);
}
</style>
