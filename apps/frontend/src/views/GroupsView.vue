<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import GroupCard from '@/components/groups/GroupCard.vue';
import GroupsPageHeader from '@/components/groups/GroupsPageHeader.vue';
import InfoNote from '@/components/groups/InfoNote.vue';
import { mockGroups, mockInvitation } from '@/mocks/groups';
import {
  answerInvite,
  getPendingInvites,
  getUserBookClubs,
  getUserGroups,
  mapApiClubToSummary,
  mapApiGroupToSummary,
  type ApiPendingInvite,
} from '@/services/api';
import type { GroupSummary } from '@/types/groups';

// The reader's challenges and book clubs come from the API, listed before the mock
// groups, with their real pending invites. Accepting or declining the mock
// invitation only changes this page.
type FilterId = 'all' | 'challenge' | 'book-club' | 'active' | 'scheduled' | 'completed';

const groups = ref<GroupSummary[]>([...mockGroups]);
const invitation = ref<typeof mockInvitation | null>(mockInvitation);
const invites = ref<ApiPendingInvite[]>([]);
const filter = ref<FilterId>('all');
const message = ref('');

const filters = computed<{ id: FilterId; label: string }[]>(() => [
  { id: 'all', label: `All groups · ${groups.value.length}` },
  {
    id: 'challenge',
    label: `Challenges · ${groups.value.filter((g) => g.kind === 'challenge').length}`,
  },
  {
    id: 'book-club',
    label: `Book clubs · ${groups.value.filter((g) => g.kind === 'book-club').length}`,
  },
  { id: 'active', label: 'Active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
]);

const visible = computed(() =>
  groups.value.filter((group) => {
    if (filter.value === 'all') return true;
    if (filter.value === 'challenge' || filter.value === 'book-club') {
      return group.kind === filter.value;
    }
    return group.status === filter.value;
  }),
);

async function loadMine(): Promise<GroupSummary[]> {
  const [challenges, clubs] = await Promise.all([getUserGroups(), getUserBookClubs()]);
  return [
    ...clubs.map((club) => mapApiClubToSummary(club)),
    ...challenges.map((group) => mapApiGroupToSummary(group)),
  ];
}

onMounted(async () => {
  try {
    const [mine, pending] = await Promise.all([loadMine(), getPendingInvites()]);
    groups.value = [...mine, ...groups.value];
    invites.value = pending;
  } catch {
    // Keep the mock groups when the API is unreachable
  }
});

async function answer(invite: ApiPendingInvite, choice: 'accept' | 'decline') {
  try {
    await answerInvite(invite.id, choice);
    invites.value = invites.value.filter((i) => i.id !== invite.id);
    if (choice === 'accept') {
      const mine = await loadMine();
      const known = new Set(groups.value.map((g) => g.id));
      groups.value = [...mine.filter((g) => !known.has(g.id)), ...groups.value];
    }
    message.value =
      choice === 'accept' ? `You joined ${invite.groupName}.` : `You declined ${invite.groupName}.`;
  } catch (error) {
    message.value = (error as Error).message;
  }
}

function acceptInvitation() {
  if (!invitation.value) return;
  groups.value.push(invitation.value.group);
  message.value = `You joined ${invitation.value.name}.`;
  invitation.value = null;
}

function declineInvitation() {
  if (!invitation.value) return;
  message.value = `You declined ${invitation.value.name}.`;
  invitation.value = null;
}

function rematch(group: GroupSummary) {
  message.value = `A rematch of ${group.name} is ready to set up.`;
}
</script>

<template>
  <main class="page-column groups">
    <GroupsPageHeader
      eyebrow="Your reading circles"
      title="Good books bring people together."
      subtitle="A shared deadline, a friendly nudge, and a conversation worth having."
    >
      <template #action>
        <RouterLink class="button" :to="{ name: 'group-create' }">
          <span aria-hidden="true">+</span> Create group
        </RouterLink>
      </template>
    </GroupsPageHeader>

    <section v-if="invites.length" class="panel invites" aria-labelledby="invites-title">
      <h2 id="invites-title" class="panel-heading">Pending invites</h2>
      <ul>
        <li v-for="invite in invites" :key="invite.id" class="invitation-body">
          <div>
            <p class="invitation-name">{{ invite.groupName }}</p>
            <p class="invitation-detail">
              {{ invite.inviterName }} invited you to a
              {{ invite.groupKind === 'book-club' ? 'book club' : 'challenge' }}
            </p>
          </div>
          <div class="invitation-actions">
            <button type="button" class="button button-small" @click="answer(invite, 'accept')">
              Accept
            </button>
            <button type="button" class="button-outline" @click="answer(invite, 'decline')">
              Decline
            </button>
          </div>
        </li>
      </ul>
    </section>

    <div class="intro">
      <section v-if="invitation" class="panel invitation" aria-labelledby="invitation-title">
        <h2 id="invitation-title" class="panel-heading">A new invitation</h2>
        <div class="invitation-body">
          <div>
            <p class="invitation-name">{{ invitation.name }}</p>
            <p class="invitation-detail">{{ invitation.detail }}</p>
          </div>
          <div class="invitation-actions">
            <button type="button" class="button button-small" @click="acceptInvitation">
              View &amp; accept
            </button>
            <button type="button" class="button-outline" @click="declineInvitation">Decline</button>
          </div>
        </div>
      </section>

      <InfoNote title="Challenges or clubs?">
        Challenges count any book during a competition. Clubs share one selected book and a round
        deadline.
      </InfoNote>
    </div>

    <p v-if="message" class="status" role="status">{{ message }}</p>

    <div class="filters" role="group" aria-label="Filter groups">
      <button
        v-for="item in filters"
        :key="item.id"
        type="button"
        :class="['filter', { selected: filter === item.id }]"
        :aria-pressed="filter === item.id"
        @click="filter = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <ul v-if="visible.length" class="grid">
      <li v-for="group in visible" :key="group.id">
        <GroupCard :group="group" @rematch="rematch" />
      </li>
    </ul>
    <p v-else class="empty">No groups match this filter yet.</p>

    <InfoNote class="footnote" title="Competition time is earned, not estimated">
      Only completed timed sessions can contribute. Imported past-read estimates never count. You
      can leave a group without deleting your personal reading history.
    </InfoNote>
  </main>
</template>

<style scoped>
.groups {
  padding-block: var(--space-8);
}

.intro {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}

/* Without an invitation the tip takes the whole row */
.intro > :only-child {
  grid-column: 1 / -1;
}

.invitation-body {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
}

.invitation-name {
  margin: 0;
  font-weight: 600;
}

.invitation-detail {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.invitation-actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-3);
}

.invites {
  margin-bottom: var(--space-6);
}

.invites ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.status {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: var(--space-8) 0 var(--space-6);
}

.filter {
  height: 2.5rem;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.filter:hover {
  background: var(--color-surface-hover);
}

.filter.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.grid > li {
  display: flex;
}

.grid > li > * {
  width: 100%;
}

.empty {
  padding: var(--space-8) 0;
  color: var(--color-text-muted);
  text-align: center;
}

.footnote {
  margin-top: var(--space-8);
}

@media (max-width: 1023px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 799px) {
  .intro,
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .invitation-body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
