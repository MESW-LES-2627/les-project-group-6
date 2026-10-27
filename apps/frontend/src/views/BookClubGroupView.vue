<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import GroupChat from '@/components/groups/GroupChat.vue';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard.vue';
import GroupsPageHeader from '@/components/groups/GroupsPageHeader.vue';
import InfoNote from '@/components/groups/InfoNote.vue';
import ToggleSwitch from '@/components/groups/ToggleSwitch.vue';
import { mockCurrentMemberId } from '@/mocks/groups';
import type { BookClubDetail, ProposalOption } from '@/types/groups';

const props = defineProps<{ club: BookClubDetail }>();

const me = props.club.leaderboard.find((e) => e.member.id === mockCurrentMemberId)!.member;
const book = props.club.round.book;

const options = ref<ProposalOption[]>(props.club.voting.options.map((o) => ({ ...o })));
const yourVote = ref<string | null>(props.club.voting.yourVote);
const voted = ref(props.club.voting.voted);
const anonymous = ref(props.club.voting.anonymous);
const changingVote = ref(false);
const proposal = ref('');
const proposalMessage = ref('');

const percent = computed(() =>
  Math.round((props.club.yourProgress.page / props.club.yourProgress.pages) * 100),
);
const finishedPercent = computed(() =>
  Math.round((props.club.finished.count / props.club.finished.total) * 100),
);
const maxVotes = computed(() => Math.max(1, ...options.value.map((o) => o.votes)));

function castVote(option: ProposalOption) {
  const previous = options.value.find((o) => o.id === yourVote.value);
  if (previous) previous.votes -= 1;
  else voted.value += 1;
  option.votes += 1;
  yourVote.value = option.id;
  changingVote.value = false;
}

function submitProposal() {
  const title = proposal.value.trim();
  if (!title) return;
  options.value.push({
    id: `proposal-${options.value.length}`,
    title,
    author: 'Proposed by you',
    votes: 0,
  });
  proposal.value = '';
  proposalMessage.value = `${title} was added to the vote.`;
}
</script>

<template>
  <main class="page-column club">
    <GroupsPageHeader
      :eyebrow="`Groups / ${club.name} book club`"
      :title="club.title"
      :subtitle="club.subtitle"
    >
      <template #action>
        <button type="button" class="button-outline">Admin &amp; settings</button>
      </template>
    </GroupsPageHeader>

    <section class="panel round" aria-labelledby="round-title">
      <div class="round-book">
        <img :src="book.cover" :alt="`Cover of ${book.title}`" />
        <div>
          <span class="tag tag-highlight">{{ club.round.label }}</span>
          <h2 id="round-title" class="book-title">{{ book.title }}</h2>
          <p class="book-meta">
            {{ book.pages }} pages · {{ book.author }} · Selected for this round
          </p>
          <RouterLink
            class="button-outline"
            :to="{ name: 'book-detail', params: { bookId: book.id } }"
          >
            Open book details
          </RouterLink>
        </div>
      </div>

      <div class="round-progress">
        <p class="finished">{{ club.finished.count }} of {{ club.finished.total }} finished</p>
        <progress
          class="progress-bar gold"
          max="100"
          :value="finishedPercent"
          :aria-label="`${club.finished.count} of ${club.finished.total} members finished`"
        ></progress>
        <p class="deadline">Deadline: {{ club.deadline }}</p>
        <p class="lede">The round succeeds only if every member finishes before the deadline.</p>
      </div>

      <div class="round-action">
        <p class="days">20 days to turn the last page</p>
        <p class="lede">
          Your progress: {{ club.yourProgress.page }}/{{ club.yourProgress.pages }} pages ·
          {{ percent }}%
        </p>
        <RouterLink class="button" :to="{ name: 'active-session', params: { bookId: book.id } }">
          Start {{ book.title }} session
        </RouterLink>
      </div>
    </section>

    <div class="columns">
      <div class="column">
        <section class="panel" aria-labelledby="progress-title">
          <h2 id="progress-title" class="panel-heading">Progress &amp; counted minutes</h2>
          <p class="lede">Leaderboard sorted by counted {{ book.title }} minutes.</p>
          <GroupLeaderboard
            with-progress
            :entries="club.leaderboard"
            :me-id="mockCurrentMemberId"
          />
          <InfoNote class="counts" title="Only our selected book counts">
            {{ book.title }} sessions contribute to this round. Other books, imported estimates and
            manual minutes don’t. Daily cap: 120 min; timer on; other checks off.
          </InfoNote>
        </section>
        <button type="button" class="button-outline history">
          Past rounds &amp; history <span aria-hidden="true">→</span>
        </button>
      </div>

      <section class="panel" aria-labelledby="conversation-title">
        <h2 id="conversation-title" class="panel-heading chat-heading">Club conversation</h2>
        <GroupChat
          :messages="club.messages"
          :me="me"
          label="Message your club"
          placeholder="Write a thought, or share a passage…"
        />
      </section>

      <section class="panel" aria-labelledby="voting-title">
        <h2 id="voting-title" class="panel-heading">Our next chapter</h2>
        <p class="tags"><span class="tag tag-highlight">Voting open</span></p>
        <p class="lede">Propose a book for November. Voting closes {{ club.voting.closes }}.</p>

        <form class="proposal" @submit.prevent="submitProposal">
          <label for="proposal-title" class="field-label">Propose a title</label>
          <input
            id="proposal-title"
            v-model="proposal"
            type="text"
            placeholder="Search book title or ISBN…"
          />
          <button type="submit" class="button-outline">Submit proposal</button>
          <p v-if="proposalMessage" class="lede" role="status">{{ proposalMessage }}</p>
        </form>

        <ul class="options">
          <li v-for="option in options" :key="option.id">
            <p class="option-title">{{ option.title }}</p>
            <p class="option-meta">
              {{ option.author }} · {{ option.votes }} {{ option.votes === 1 ? 'vote' : 'votes' }}
              <template v-if="yourVote === option.id">
                · your vote <span aria-hidden="true">✓</span></template
              >
            </p>
            <progress
              class="progress-bar gold"
              :max="maxVotes"
              :value="option.votes"
              :aria-label="`${option.title}: ${option.votes} votes`"
            ></progress>
            <button
              v-if="changingVote && yourVote !== option.id"
              type="button"
              class="button-outline pick"
              @click="castVote(option)"
            >
              Vote for {{ option.title }}
            </button>
          </li>
        </ul>

        <ToggleSwitch
          v-model="anonymous"
          label="Anonymous voting"
          description="Members see totals, not who voted."
        />
        <p class="lede">
          One vote per member. Change yours until voting closes. {{ voted }} of
          {{ club.voting.total }} have voted.
        </p>
        <button type="button" class="button-outline" @click="changingVote = !changingVote">
          {{ changingVote ? 'Keep my vote' : 'Change my vote' }}
        </button>

        <InfoNote class="admin-note" title="The final selection is the admin’s">
          Maya confirms the next book after voting closes. A winning proposal isn’t automatically
          selected.
        </InfoNote>
      </section>
    </div>
  </main>
</template>

<style scoped>
.club {
  padding-block: var(--space-8);
}

.round {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr);
  gap: var(--space-8);
  align-items: center;
}

.round-book {
  display: flex;
  gap: var(--space-6);
  align-items: center;
}

.round-book img {
  width: 5.5rem;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-cover);
  box-shadow: var(--shadow-cover);
}

.book-title {
  margin: var(--space-2) 0;
  font-size: var(--font-size-xl);
}

.book-meta {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.finished {
  margin: 0 0 var(--space-3);
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
}

.gold {
  color: var(--color-gold);
}

.gold::-webkit-progress-value {
  background: var(--color-gold);
}

.gold::-moz-progress-bar {
  background: var(--color-gold);
}

.deadline {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-sm);
}

.days {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.round-action .button {
  margin-top: var(--space-2);
}

.lede {
  margin: var(--space-3) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-6);
  align-items: start;
}

.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  align-items: flex-start;
}

.column > .panel {
  align-self: stretch;
}

.counts,
.admin-note {
  margin-top: var(--space-4);
}

.chat-heading {
  margin-bottom: var(--space-4);
}

.tags {
  margin: var(--space-3) 0;
}

.proposal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.field-label {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.proposal input {
  width: 100%;
  height: var(--control-height);
  margin-bottom: var(--space-3);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-4) 0;
  padding: 0;
  list-style: none;
}

.option-title,
.option-meta {
  margin: 0;
}

.option-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.option-meta {
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.pick {
  margin-top: var(--space-2);
}

@media (max-width: 1099px) {
  .round {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
    align-items: start;
  }

  .columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 599px) {
  .round-book {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
