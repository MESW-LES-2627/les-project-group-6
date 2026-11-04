<script setup lang="ts">
import { ref } from 'vue';

import GroupChat from '@/components/groups/GroupChat.vue';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard.vue';
import GroupsPageHeader from '@/components/groups/GroupsPageHeader.vue';
import InfoNote from '@/components/groups/InfoNote.vue';
import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import { mockCurrentMemberId } from '@/mocks/groups';
import type { ChallengeDetail } from '@/types/groups';

const props = withDefaults(
  defineProps<{
    challenge: ChallengeDetail;
    /** The viewing reader's member id; the mock pages use Eleanor. */
    meId?: string;
    /** Loaded from the API: the chat is saved and shared. */
    live?: boolean;
  }>(),
  { meId: mockCurrentMemberId, live: false },
);

type Tab = 'chat' | 'members' | 'history';

const tab = ref<Tab>('chat');
const rematchStarted = ref(false);
const me = props.challenge.members.find((m) => m.id === props.meId) ?? {
  id: props.meId,
  name: 'You',
  initials: 'YO',
  handle: '',
};

const tabs = [
  { id: 'chat', label: 'Chat' },
  { id: 'members', label: `Members · ${props.challenge.members.length}` },
  { id: 'history', label: 'History' },
] as const;
</script>

<template>
  <main class="page-column challenge">
    <GroupsPageHeader
      eyebrow="Groups / Challenge"
      :title="challenge.name"
      :subtitle="challenge.tagline"
    >
      <template #action>
        <button type="button" class="button-outline">Admin &amp; settings</button>
      </template>
    </GroupsPageHeader>

    <dl class="panel stats">
      <div>
        <dt>Win metric</dt>
        <dd class="value">{{ challenge.metric.label }}</dd>
        <dd class="note">{{ challenge.metric.note }}</dd>
      </div>
      <div>
        <dt>Competition period</dt>
        <dd class="value">{{ challenge.period.label }}</dd>
        <dd class="note">{{ challenge.period.note }}</dd>
      </div>
      <div>
        <dt>Your standing</dt>
        <dd class="value">{{ challenge.standing.label }}</dd>
        <dd class="note">{{ challenge.standing.note }}</dd>
      </div>
      <div>
        <dt>Time remaining</dt>
        <dd class="value">{{ challenge.remaining.label }}</dd>
        <dd class="note">{{ challenge.remaining.note }}</dd>
      </div>
    </dl>

    <div class="columns">
      <div class="column left">
        <section class="panel" aria-labelledby="leaderboard-title">
          <div class="heading-row">
            <h2 id="leaderboard-title" class="panel-heading">Leaderboard</h2>
            <button type="button" class="text-link link-button" @click="tab = 'members'">
              {{ challenge.members.length }} members <span aria-hidden="true">→</span>
            </button>
          </div>
          <p class="lede">Counted minutes · tied scores share a rank</p>
          <GroupLeaderboard :entries="challenge.leaderboard" :me-id="meId" />
          <InfoNote class="fair" title="A fair finish">
            At the end, results freeze. All tied leaders win. We use shared ranks for tied scores;
            the next distinct score gets the next rank.
          </InfoNote>
        </section>

        <section v-if="challenge.lastResult" class="panel result" aria-labelledby="last-title">
          <h2 id="last-title" class="panel-heading">Last month’s result</h2>
          <p class="eyebrow muted">{{ challenge.lastResult.label }}</p>
          <p class="result-summary">{{ challenge.lastResult.summary }}</p>
          <p class="lede">{{ challenge.lastResult.note }}</p>
          <button type="button" class="button-outline" @click="rematchStarted = true">
            {{ challenge.lastResult.rematchLabel }}
          </button>
          <p v-if="rematchStarted" class="lede" role="status">
            A rematch with the same members and rules is ready to set up.
          </p>
        </section>
      </div>

      <div class="column right">
        <section class="panel" aria-labelledby="conversation-title">
          <div class="heading-row">
            <h2 id="conversation-title" class="panel-heading">The conversation</h2>
            <button type="button" class="text-link link-button" @click="tab = 'members'">
              Members <span aria-hidden="true">→</span>
            </button>
          </div>

          <div class="tabs" role="group" aria-label="Group sections">
            <button
              v-for="item in tabs"
              :key="item.id"
              type="button"
              :class="['tab', { selected: tab === item.id }]"
              :aria-pressed="tab === item.id"
              @click="tab = item.id"
            >
              {{ item.label }}
            </button>
          </div>

          <GroupChat
            v-show="tab === 'chat'"
            :messages="challenge.messages"
            :me="me"
            :group-id="live ? challenge.id : undefined"
            label="Message the group"
            placeholder="Write a message…"
          />
          <ul v-if="tab === 'members'" class="members">
            <li v-for="m in challenge.members" :key="m.id">
              <MemberAvatar :initials="m.initials" />
              <span class="member-name">{{ m.name }}</span>
              <span class="handle">@{{ m.handle }}</span>
            </li>
          </ul>
          <ul v-if="tab === 'history'" class="history">
            <li v-for="item in challenge.history" :key="item.label">
              <p class="eyebrow muted">{{ item.label }}</p>
              <p class="result-summary">{{ item.summary }}</p>
              <p class="lede">{{ item.note }}</p>
            </li>
          </ul>
        </section>

        <section class="panel" aria-labelledby="rules-title">
          <h2 id="rules-title" class="panel-heading">Fair-reading settings</h2>
          <ul class="rules">
            <li v-for="rule in challenge.rules" :key="rule.label">
              <span v-if="rule.on" aria-hidden="true">✓ </span>{{ rule.label }}
            </li>
          </ul>
          <p class="lede">{{ challenge.rulesNote }}</p>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.challenge {
  padding-block: var(--space-8);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-6);
  margin: 0;
}

dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

dd {
  margin: 0;
}

.value {
  margin: var(--space-2) 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  line-height: 1.2;
}

.note {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: var(--space-6);
  margin-top: var(--space-6);
  align-items: start;
}

.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.heading-row {
  display: flex;
  gap: var(--space-4);
  align-items: baseline;
  justify-content: space-between;
}

.link-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}

.lede {
  margin: var(--space-3) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.fair {
  margin-top: var(--space-4);
}

.result {
  background: var(--color-surface-muted);
}

.muted {
  margin-top: var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
}

.result-summary {
  margin: var(--space-3) 0 0;
  font-size: var(--font-size-sm);
}

.tabs {
  display: flex;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.tab {
  height: 2.25rem;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.tab.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.members,
.history {
  margin: 0;
  padding: 0;
  list-style: none;
}

.members li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.member-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.handle {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-6);
  margin: var(--space-4) 0;
  padding: 0;
  font-size: var(--font-size-sm);
  list-style: none;
}

.rules li:nth-child(n + 4) {
  color: var(--color-text-muted);
}

@media (max-width: 899px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 599px) {
  .rules {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
