<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import GroupChat from '@/components/groups/GroupChat.vue';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard.vue';
import PagePlate from '@/components/layout/PagePlate.vue';
import { mockCurrentMemberId } from '@/mocks/groups';
import type { ChallengeDetail } from '@/types/groups';

const props = withDefaults(
  defineProps<{
    challenge: ChallengeDetail;
    /** The viewing reader's member id; the mock pages use Eleanor. */
    meId?: string;
    /** True when the group comes from the API: the chat is then live. */
    live?: boolean;
  }>(),
  { meId: mockCurrentMemberId, live: false },
);

const rematchStarted = ref(false);
const me = props.challenge.members.find((m) => m.id === props.meId) ?? {
  id: props.meId,
  name: 'You',
  initials: 'YO',
  handle: '',
};
const isAdmin = props.challenge.leaderboard.some(
  (e) => e.member.id === me.id && e.note === 'Admin',
);
const myEntry = computed(() => props.challenge.leaderboard.find((e) => e.member.id === me.id));
</script>

<template>
  <main class="challenge">
    <PagePlate :title="challenge.name" title-id="challenge-title">
      <template v-if="myEntry" #leading>
        <div
          class="rank"
          role="img"
          :aria-label="`You are number ${myEntry.rank} of ${challenge.leaderboard.length}`"
        >
          <span class="rank-number">#{{ myEntry.rank }}</span>
          <span class="rank-of">of {{ challenge.leaderboard.length }}</span>
        </div>
      </template>
      <p>Challenge · {{ challenge.period.label }} · {{ challenge.standing.label }}</p>
      <p class="lede">{{ challenge.tagline }}</p>
      <template #actions>
        <RouterLink class="plate-button" :to="{ name: 'library' }">Start a session</RouterLink>
        <button type="button" class="plate-link">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
          </svg>
          Admin &amp; settings
        </button>
      </template>
    </PagePlate>

    <div class="page-column columns">
      <div class="column">
        <section class="section ruled" aria-labelledby="standings-title">
          <div class="section-heading">
            <h2 id="standings-title" class="section-title">Standings</h2>
            <span class="section-meta">
              counted {{ challenge.metric.label.toLowerCase() }} · {{ challenge.remaining.label }}
            </span>
          </div>
          <p class="lede">{{ challenge.standing.note }}. Tied scores share a rank.</p>
          <GroupLeaderboard :entries="challenge.leaderboard" :me-id="me.id" />
        </section>

        <section class="section" aria-labelledby="conversation-title">
          <h2 id="conversation-title" class="section-title heading-gap">Conversation</h2>
          <GroupChat
            :messages="challenge.messages"
            :me="me"
            :group-id="live ? challenge.id : undefined"
            :members="challenge.members"
            :is-admin="isAdmin"
            label="Message the group"
            placeholder="Write a message"
          />
        </section>
      </div>

      <div class="column">
        <section class="section ruled" aria-labelledby="rules-title">
          <h2 id="rules-title" class="section-title heading-gap">Fair-reading rules</h2>
          <ul class="rules">
            <li v-for="rule in challenge.rules" :key="rule.label" :class="{ off: !rule.on }">
              <svg
                v-if="rule.on"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M6 12h12" />
              </svg>
              {{ rule.label }}
            </li>
          </ul>
          <p class="lede note">{{ challenge.rulesNote }}</p>
        </section>

        <section v-if="challenge.lastResult" class="section" aria-labelledby="last-title">
          <h2 id="last-title" class="section-title heading-gap">Last month</h2>
          <p class="result-label">{{ challenge.lastResult.label }}</p>
          <p class="lede">{{ challenge.lastResult.summary }}</p>
          <button type="button" class="button-outline rematch" @click="rematchStarted = true">
            {{ challenge.lastResult.rematchLabel }}
          </button>
          <p v-if="rematchStarted" class="lede" role="status">
            A rematch with the same members and rules is ready to set up.
          </p>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.challenge {
  padding: 0;
}

.rank {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-avatar);
  box-shadow:
    0 0 0 3px var(--color-primary),
    0 0 0 4px rgb(255 230 167 / 45%);
  color: var(--color-on-primary);
}

.rank-number {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1;
}

.rank-of {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  column-gap: 64px;
}

.column {
  min-width: 0;
}

.section {
  padding: var(--space-10) 0 var(--space-10);
}

.ruled {
  border-bottom: 1px solid var(--color-border);
}

.heading-gap {
  margin-bottom: 22px;
}

.lede {
  margin: 6px 0 var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
}

.rules li {
  display: flex;
  gap: 10px;
  align-items: center;
}

.rules svg {
  flex: none;
  color: var(--color-primary);
}

.rules .off {
  color: var(--color-text-muted);
}

.rules .off svg {
  color: inherit;
}

.note {
  margin: var(--space-6) 0 0;
}

.result-label {
  margin: 0;
  font-weight: 600;
}

.result-label + .lede {
  margin: 2px 0 0;
}

.rematch {
  margin-top: 18px;
}

@media (max-width: 899px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
  }

  .column:first-child .section:last-child {
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
