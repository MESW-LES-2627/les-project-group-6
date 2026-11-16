<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { UserSearchResult } from '@/services/api';

// The readers found by the Explore reader search (F-SOC-02, F-EXP-01).
const props = defineProps<{
  query: string;
  users: UserSearchResult[];
  loading: boolean;
  error: boolean;
}>();
const emit = defineEmits<{ clear: [] }>();

const countLabel = computed(() =>
  props.users.length === 1 ? '1 result' : `${props.users.length} results`,
);

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return (first?.[0] ?? '?').toUpperCase();
}
</script>

<template>
  <section class="panel results" aria-labelledby="user-results-title">
    <div class="section-heading">
      <h2 id="user-results-title" class="panel-heading">Readers</h2>
      <p class="section-meta">
        <template v-if="!loading && !error">{{ countLabel }} · </template>
        <button type="button" class="link-button" @click="emit('clear')">Clear</button>
      </p>
    </div>

    <p v-if="loading" class="muted state">Searching readers…</p>
    <p v-else-if="error" class="muted state">Reader search is unavailable right now.</p>
    <p v-else-if="users.length === 0" class="muted state">No readers match "{{ query }}".</p>
    <ul v-else class="rows">
      <li v-for="user in users" :key="user.id" class="row">
        <div class="avatar-wrap">
          <img
            v-if="user.photoUrl"
            :src="user.photoUrl"
            :alt="user.displayName"
            class="avatar-img"
          />
          <span v-else class="avatar-initials">{{
            initials(user.displayName || user.username)
          }}</span>
        </div>
        <div class="info">
          <div class="name-line">
            <p class="name">{{ user.displayName }}</p>
            <span v-if="user.profileVisibility === 'private'" class="badge-private">Private</span>
          </div>
          <p class="muted handle">@{{ user.username }}</p>
          <p v-if="user.bio" class="muted bio">{{ user.bio }}</p>
        </div>
        <RouterLink
          class="button-outline button-small"
          :to="{ name: 'user-profile', params: { username: user.username } }"
          :aria-label="`View ${user.displayName}'s profile`"
        >
          View profile
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.section-meta {
  margin: 0;
}

.state {
  margin: var(--space-4) 0 0;
}

.rows {
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) 0;
}

.row + .row {
  border-top: 1px solid var(--color-border);
}

.avatar-wrap {
  flex: none;
  width: 44px;
  height: 44px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.info {
  flex: 1;
  min-width: 0;
}

.name-line {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.name {
  margin: 0;
  font-weight: 600;
}

.badge-private {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.handle {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
}

.bio {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-xs);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
