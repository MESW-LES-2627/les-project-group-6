<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import GroupCard from '@/components/groups/GroupCard.vue';
import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import PagePlate from '@/components/layout/PagePlate.vue';
import {
  answerInvite,
  getPendingInvites,
  getUserBookClubs,
  getUserGroups,
  mapApiClubToSummary,
  mapApiGroupToSummary,
  type ApiPendingInvite,
} from '@/services/api';
import type { GroupKind, GroupStatus, GroupSummary } from '@/types/groups';
import { initialsOf } from '@/utils/groups';

// The reader's challenges and book clubs, and their pending invites, all come from the API.
type FilterId = 'all' | GroupKind;

const groups = ref<GroupSummary[]>([]);
const loading = ref(true);
const loadError = ref('');
const invites = ref<ApiPendingInvite[]>([]);
const filter = ref<FilterId>('all');
const message = ref('');

const filters = computed<{ id: FilterId; label: string; count: number }[]>(() => [
  { id: 'all', label: 'All groups', count: groups.value.length },
  {
    id: 'challenge',
    label: 'Challenges',
    count: groups.value.filter((g) => g.kind === 'challenge').length,
  },
  {
    id: 'book-club',
    label: 'Book clubs',
    count: groups.value.filter((g) => g.kind === 'book-club').length,
  },
]);

const visible = computed(() =>
  groups.value.filter((group) => filter.value === 'all' || group.kind === filter.value),
);

const sections = computed(() =>
  (
    [
      { status: 'active', title: 'Active' },
      { status: 'scheduled', title: 'Coming up' },
      { status: 'completed', title: 'Completed' },
    ] as { status: GroupStatus; title: string }[]
  )
    .map((section) => ({
      ...section,
      groups: visible.value.filter((g) => g.status === section.status),
    }))
    .filter((section) => section.groups.length > 0),
);

const activeCount = computed(() => groups.value.filter((g) => g.status === 'active').length);

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
    groups.value = mine;
    invites.value = pending;
  } catch {
    loadError.value = 'We could not load your groups. Please refresh the page.';
  } finally {
    loading.value = false;
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

function rematch(group: GroupSummary) {
  message.value = `A rematch of ${group.name} is ready to set up.`;
}
</script>

<template>
  <main class="groups">
    <PagePlate title="Groups" title-id="groups-title">
      <p>Challenges and book clubs with your friends · {{ activeCount }} active</p>
      <template #actions>
        <RouterLink class="plate-button" :to="{ name: 'group-create' }">
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create group
        </RouterLink>
      </template>
    </PagePlate>

    <div class="page-column">
      <section v-if="invites.length" class="invites" aria-label="Invitations">
        <ul>
          <li v-for="invite in invites" :key="invite.id" class="invite">
            <MemberAvatar :initials="initialsOf(invite.inviterName)" />
            <div class="invite-text">
              <p class="invite-line">
                {{ invite.inviterName }} invited you to a
                {{ invite.groupKind === 'book-club' ? 'book club' : 'challenge' }}
              </p>
              <p class="invite-detail">{{ invite.groupName }}</p>
            </div>
            <div class="invite-actions">
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

      <p v-if="message" class="status" role="status">{{ message }}</p>

      <div class="page-tabs" role="group" aria-label="Filter groups">
        <button
          v-for="item in filters"
          :key="item.id"
          type="button"
          :class="['page-tab', { active: filter === item.id }]"
          :aria-pressed="filter === item.id"
          @click="filter = item.id"
        >
          {{ item.label }}<span class="count">{{ item.count }}</span>
        </button>
      </div>

      <section
        v-for="section in sections"
        :key="section.status"
        :class="['group-section', section.status]"
        :aria-labelledby="`${section.status}-title`"
      >
        <div class="section-heading">
          <h2 :id="`${section.status}-title`" class="section-title">{{ section.title }}</h2>
          <span class="section-meta">
            {{ section.groups.length }} {{ section.groups.length === 1 ? 'group' : 'groups' }}
          </span>
        </div>
        <ul :class="section.status === 'active' ? 'feature-list' : 'compact-list'">
          <li v-for="group in section.groups" :key="group.id">
            <GroupCard
              :group="group"
              :variant="section.status === 'active' ? 'feature' : 'compact'"
              @rematch="rematch"
            />
          </li>
        </ul>
      </section>
      <p v-if="loading" class="empty" role="status">Loading your groups…</p>
      <p v-else-if="loadError" class="empty" role="alert">{{ loadError }}</p>
      <p v-else-if="!sections.length" class="empty">No groups here yet.</p>
    </div>
  </main>
</template>

<style scoped>
.groups {
  padding: 0 0 var(--space-12);
}

.invites ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.invite {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-6);
  align-items: center;
  padding: var(--space-6) 0;
  border-bottom: 1px solid var(--color-border);
}

.invite-text {
  flex: 1;
  min-width: 240px;
}

.invite-line,
.invite-detail {
  margin: 0;
}

.invite-line strong {
  font-weight: 600;
}

.invite-detail {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.invite-actions {
  display: flex;
  gap: var(--space-3);
}

.status {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.page-tabs {
  margin-top: var(--space-2);
}

.group-section {
  padding: var(--space-10) 0 44px;
}

.group-section + .group-section {
  border-top: 1px solid var(--color-border);
}

.section-heading {
  justify-content: flex-start;
  margin-bottom: 22px;
}

.feature-list,
.compact-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-10) var(--space-14);
}

.compact-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6) var(--space-14);
}

.empty {
  padding: var(--space-10) 0;
  color: var(--color-text-muted);
}

@media (max-width: 899px) {
  .feature-list,
  .compact-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
