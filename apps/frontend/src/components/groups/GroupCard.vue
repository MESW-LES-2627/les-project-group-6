<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { GroupSummary } from '@/types/groups';

// Active groups get the large layout of the profile's "Currently reading";
// scheduled and completed ones a compact row.
const props = withDefaults(
  defineProps<{ group: GroupSummary; variant?: 'feature' | 'compact' }>(),
  { variant: 'feature' },
);

defineEmits<{ rematch: [group: GroupSummary] }>();

const kindLabel = computed(() => (props.group.kind === 'challenge' ? 'Challenge' : 'Book club'));
const route = computed(() => ({ name: 'group-detail', params: { groupId: props.group.id } }));
const extraReaders = computed(() => props.group.memberCount - props.group.memberInitials.length);
const readersLabel = computed(() => {
  const count = extraReaders.value;
  // API groups list no initials, so the count stands alone
  if (props.group.memberInitials.length) return `+${count}`;
  return `${count} ${count === 1 ? 'reader' : 'readers'}`;
});
</script>

<template>
  <article v-if="variant === 'feature'" class="feature">
    <RouterLink class="visual" :to="route" tabindex="-1" aria-hidden="true">
      <BookCoverImage v-if="group.book" :src="group.book.cover" :title="group.book.title" />
      <span v-else class="tile">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M9 2h6" />
        </svg>
      </span>
    </RouterLink>

    <div class="body">
      <h3 class="name">
        <RouterLink :to="route">{{ group.name }}</RouterLink>
      </h3>
      <p class="meta">
        {{ kindLabel }} ·
        <template v-if="group.book"
          >reading <cite>{{ group.book.title }}</cite></template
        >
        <template v-else>{{ group.meta }}</template>
      </p>

      <div class="progress">
        <div class="progress-label">
          <span>{{ group.headline }}</span>
          <span class="muted">{{ group.detail }}</span>
        </div>
        <progress
          class="progress-bar"
          max="100"
          :value="group.progress"
          :aria-label="`${group.name} progress: ${group.progress}%`"
        ></progress>
        <div class="footer">
          <div class="readers">
            <MemberAvatar
              v-for="initials in group.memberInitials"
              :key="initials"
              :initials="initials"
              size="sm"
              class="stacked"
            />
            <span v-if="extraReaders > 0" class="more">{{ readersLabel }}</span>
          </div>
          <RouterLink class="button" :to="route" :aria-label="`Open ${group.name}`">
            Open
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </article>

  <article v-else class="compact">
    <span class="small-visual" aria-hidden="true">
      <BookCoverImage v-if="group.book" :src="group.book.cover" :title="group.book.title" />
      <span v-else class="tile small">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M9 2h6" />
        </svg>
      </span>
    </span>
    <div class="compact-body">
      <RouterLink class="compact-name" :to="route">{{ group.name }}</RouterLink>
      <p class="meta">{{ kindLabel }} · {{ group.headline }} · {{ group.detail }}</p>
    </div>
    <button
      v-if="group.canRematch"
      type="button"
      class="link-button rematch"
      @click="$emit('rematch', group)"
    >
      Rematch
    </button>
  </article>
</template>

<style scoped>
.feature {
  display: flex;
  gap: var(--space-6);
  align-items: stretch;
  min-width: 0;
}

.visual {
  flex: none;
  width: 128px;
}

.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 2 / 3;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface-muted);
  color: var(--color-primary);
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-1) 0;
}

.name {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.name a {
  color: var(--color-text);
  text-decoration: none;
}

.name a:hover {
  color: var(--color-primary);
}

.meta {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
}

cite {
  font-family: var(--font-heading);
  font-style: italic;
}

.progress {
  margin-top: auto;
  padding-top: 18px;
}

.progress-label {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  justify-content: space-between;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}

.readers {
  display: flex;
  align-items: center;
}

.stacked + .stacked {
  margin-left: -6px;
}

.stacked {
  box-shadow: 0 0 0 2px var(--color-bg);
}

.more {
  margin-left: 10px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.compact {
  display: flex;
  gap: 18px;
  align-items: center;
  min-width: 0;
}

.small-visual {
  flex: none;
  width: 64px;
}

.tile.small {
  border-style: dashed;
  border-color: var(--color-accent);
  background: transparent;
  color: var(--color-text-muted);
}

.compact-body {
  flex: 1;
  min-width: 0;
}

.compact-name {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

.compact-name:hover {
  color: var(--color-primary);
}

.compact .meta {
  margin-top: 2px;
  font-size: var(--font-size-sm);
}

.rematch {
  flex: none;
  min-height: var(--control-height);
  font-size: var(--font-size-sm);
}

@media (max-width: 599px) {
  .visual {
    width: 96px;
  }
}
</style>
