<script setup lang="ts">
// The search field for readers in Explore (F-SOC-02, F-EXP-01): username or display name.
const query = defineModel<string>({ default: '' });
const emit = defineEmits<{ submit: [query: string] }>();
</script>

<template>
  <form class="panel search-panel" role="search" @submit.prevent="emit('submit', query.trim())">
    <label for="user-search" class="label">Search readers</label>
    <div class="row">
      <input
        id="user-search"
        v-model="query"
        class="field-input"
        type="search"
        placeholder="Try “pedro” or “@reader”"
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
    <p class="muted hint">Username or display name</p>
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
