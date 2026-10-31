<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import type { GroupSummary } from '@/types/groups';

const props = defineProps<{ group: GroupSummary }>();

defineEmits<{ rematch: [group: GroupSummary] }>();

const kindLabel = computed(() => (props.group.kind === 'challenge' ? 'Challenge' : 'Book club'));
const statusLabel = computed(
  () => ({ active: 'Active', scheduled: 'Scheduled', completed: 'Completed' })[props.group.status],
);
const route = computed(() => ({ name: 'group-detail', params: { groupId: props.group.id } }));
const extraReaders = computed(() => props.group.memberCount - props.group.memberInitials.length);
</script>

<template>
  <article :class="['card', group.status]">
    <div class="top">
      <h2 class="name">{{ group.name }}</h2>
      <RouterLink class="text-link open" :to="route" :aria-label="`Open ${group.name}`">
        Open <span aria-hidden="true">→</span>
      </RouterLink>
    </div>

    <p class="tags">
      <span :class="['tag', { 'tag-highlight': group.status === 'active' }]">{{ kindLabel }}</span>
      <span class="tag">{{ statusLabel }}</span>
    </p>

    <div v-if="group.book" class="book">
      <img :src="group.book.cover" :alt="`Cover of ${group.book.title}`" />
      <div>
        <p class="book-title">{{ group.book.title }}</p>
        <p class="book-author">{{ group.book.author }}</p>
      </div>
    </div>

    <p class="headline">{{ group.headline }}</p>
    <progress
      class="progress-bar"
      max="100"
      :value="group.progress"
      :aria-label="`${group.name} progress: ${group.progress}%`"
    ></progress>
    <p class="detail">{{ group.detail }}</p>
    <p class="meta">{{ group.meta }}</p>

    <div class="readers">
      <MemberAvatar
        v-for="initials in group.memberInitials"
        :key="initials"
        :initials="initials"
        size="sm"
      />
      <span v-if="extraReaders > 0" class="more">+{{ extraReaders }} readers</span>
    </div>

    <button
      v-if="group.canRematch"
      type="button"
      class="button-outline rematch"
      @click="$emit('rematch', group)"
    >
      Rematch <span aria-hidden="true">→</span>
    </button>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.top {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
}

.name {
  margin: 0;
  font-size: var(--font-size-lg);
}

.open {
  white-space: nowrap;
}

.tags {
  display: flex;
  gap: var(--space-2);
  margin: var(--space-3) 0 var(--space-4);
}

.book {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  margin-bottom: var(--space-4);
}

.book img {
  width: 3.5rem;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-cover);
  box-shadow: var(--shadow-cover);
}

.book-title,
.book-author {
  margin: 0;
}

.book-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
}

.book-author {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.headline {
  margin: 0 0 var(--space-4);
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  line-height: 1.2;
}

.detail {
  margin: var(--space-4) 0 var(--space-3);
  font-size: var(--font-size-sm);
}

.meta {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.readers {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  margin-top: auto;
}

.more {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.rematch {
  align-self: flex-start;
  margin-top: var(--space-4);
}

.scheduled .progress-bar,
.scheduled .headline {
  opacity: 0.85;
}
</style>
